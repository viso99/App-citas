-- Coincidencias (parte 3 de la primera versión, docs/producto.md): cuando dos personas se dan
-- "me gusta" mutuamente se crea una coincidencia. Solo la ven esas dos personas, y desde ese
-- momento pueden verse el perfil y las fotos aunque cambien sus preferencias.

create table public.matches (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  -- Una sola fila por pareja: el id menor siempre va en user_a.
  check (user_a < user_b)
);
create index matches_user_b_idx on public.matches (user_b);

alter table public.matches enable row level security;

-- Nadie escribe directamente: las crea la función swipe().
create policy "Cada uno ve sus coincidencias" on public.matches
  for select to authenticated using ((select auth.uid()) in (user_a, user_b));

-- Además de los perfiles de Descubrir (D-10), se ven los de las propias coincidencias.
create or replace function public.can_see_profile(target text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles v
    join public.profiles t on t.id::text = target
    where v.id = (select auth.uid())
      and t.id <> v.id
      and v.lat is not null and t.lat is not null
      and public.wants(v.interested_in, t.gender)
      and public.wants(t.interested_in, v.gender)
      and public.age_years(t.birth_date) between v.min_age and v.max_age
      and public.distance_km(v.lat, v.lon, t.lat, t.lon) <= v.max_distance_km
      and (select count(*) from public.profile_photos p where p.user_id = t.id) >= 2
  )
  or exists (
    select 1
    from public.matches m
    where (select auth.uid()) in (m.user_a, m.user_b)
      and target in (m.user_a::text, m.user_b::text)
      and target <> (select auth.uid())::text
  );
$$;

-- swipe() ahora devuelve si el "me gusta" creó una coincidencia.
drop function public.swipe(uuid, public.swipe_action);

create function public.swipe(target uuid, choice public.swipe_action)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Hace falta iniciar sesión.' using errcode = 'insufficient_privilege';
  end if;
  if not public.can_see_profile(target::text) then
    raise exception 'Perfil no disponible.' using errcode = 'insufficient_privilege';
  end if;

  -- Un candado por pareja, para que dos "me gusta" a la vez no se pierdan la coincidencia.
  perform pg_advisory_xact_lock(hashtext(least(me, target)::text || greatest(me, target)::text));

  insert into public.swipes (swiper_id, target_id, action)
  values (me, target, choice)
  on conflict (swiper_id, target_id) do update
    set action = excluded.action, created_at = now()
    where public.swipes.action = 'paso';

  if choice = 'me_gusta'
    and exists (select 1 from public.swipes where swiper_id = me and target_id = target and action = 'me_gusta')
    and exists (select 1 from public.swipes where swiper_id = target and target_id = me and action = 'me_gusta')
  then
    insert into public.matches (user_a, user_b)
    values (least(me, target), greatest(me, target))
    on conflict do nothing;
    return true;
  end if;
  return false;
end;
$$;

revoke execute on function public.swipe(uuid, public.swipe_action) from public, anon;
grant execute on function public.swipe(uuid, public.swipe_action) to authenticated;

-- Las coincidencias de la persona con sesión, de la más nueva a la más vieja, con lo justo
-- para la lista: nombre, edad y la primera foto.
create function public.my_matches()
returns table (
  id uuid,
  first_name text,
  age integer,
  photo_path text,
  matched_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,
         p.first_name,
         public.age_years(p.birth_date),
         (select ph.storage_path from public.profile_photos ph
          where ph.user_id = p.id order by ph.position, ph.created_at limit 1),
         m.created_at
  from public.matches m
  join public.profiles p
    on p.id = case when m.user_a = (select auth.uid()) then m.user_b else m.user_a end
  where (select auth.uid()) in (m.user_a, m.user_b)
  order by m.created_at desc;
$$;

revoke execute on function public.my_matches() from public, anon;
grant execute on function public.my_matches() to authenticated;

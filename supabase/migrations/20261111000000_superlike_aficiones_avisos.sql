-- Extras después de la primera versión (D-17, D-18 y D-19 en docs/decisiones.md):
-- superlike (1 al día), aficiones en el perfil (hasta 5 de una lista) y aviso de novedades
-- (coincidencias nuevas y mensajes sin leer). Solo agrega cosas: no borra ni cambia datos.

-- ---------------------------------------------------------------------------------------
-- Aficiones (D-18). La lista vive en src/lib/interests.ts; la base guarda solo las claves y
-- comprueba el formato, que no se repitan y el máximo de 5.
create function public.valid_interests(keys text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(keys) <= 5
    and (select count(distinct k) from unnest(keys) k) = cardinality(keys)
    and not exists (select 1 from unnest(keys) k where k is null or k !~ '^[a-z_]{1,30}$');
$$;

alter table public.profiles
  add column interests text[] not null default '{}'
    constraint profiles_interests_valid check (public.valid_interests(interests));

-- ---------------------------------------------------------------------------------------
-- Superlike (D-17): un "me gusta" especial, 1 al día (día de la península). Quien lo recibe
-- ve antes esa tarjeta y marcada.
alter table public.swipes add column super boolean not null default false,
  add constraint swipes_super_is_like check (not super or action = 'me_gusta');
create index swipes_super_idx on public.swipes (swiper_id, created_at) where super;

-- Coincidencias: cuándo vio cada persona la coincidencia o su chat por última vez (D-19).
alter table public.matches
  add column a_seen_at timestamptz,
  add column b_seen_at timestamptz;

-- Comienzo del día de hoy en la península, para el límite diario.
create function public.madrid_day_start()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (date_trunc('day', now() at time zone 'Europe/Madrid')) at time zone 'Europe/Madrid';
$$;

-- Superlikes que le quedan hoy a la persona con sesión (0 o 1).
create function public.superlikes_left()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(0, 1 - (
    select count(*) from public.swipes
    where swiper_id = (select auth.uid()) and super and created_at >= public.madrid_day_start()
  ))::integer;
$$;

revoke execute on function public.superlikes_left() from public, anon;
grant execute on function public.superlikes_left() to authenticated;

-- Lógica común de swipe() y superlike(). Uso interno: lo llaman solo esas dos funciones.
create function public.record_swipe(me uuid, target uuid, choice public.swipe_action, is_super boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if me is null then
    raise exception 'Hace falta iniciar sesión.' using errcode = 'insufficient_privilege';
  end if;
  if not public.can_see_profile(target::text) then
    raise exception 'Perfil no disponible.' using errcode = 'insufficient_privilege';
  end if;

  if is_super then
    -- Un candado por persona, para que dos superlikes a la vez no se salten el límite.
    perform pg_advisory_xact_lock(hashtext('superlike:' || me::text));
    if exists (
      select 1 from public.swipes
      where swiper_id = me and super and created_at >= public.madrid_day_start()
    ) then
      raise exception 'Ya has usado tu superlike de hoy.' using errcode = 'check_violation';
    end if;
    if exists (select 1 from public.swipes where swiper_id = me and target_id = target and action = 'me_gusta') then
      raise exception 'Ya te gusta este perfil.' using errcode = 'check_violation';
    end if;
  end if;

  -- Un candado por pareja, para que dos "me gusta" a la vez no se pierdan la coincidencia.
  perform pg_advisory_xact_lock(hashtext(least(me, target)::text || greatest(me, target)::text));

  insert into public.swipes (swiper_id, target_id, action, super)
  values (me, target, choice, is_super)
  on conflict (swiper_id, target_id) do update
    set action = excluded.action, super = excluded.super, created_at = now()
    where public.swipes.action = 'paso';

  if choice = 'me_gusta'
    and exists (select 1 from public.swipes where swiper_id = me and target_id = target and action = 'me_gusta')
    and exists (select 1 from public.swipes where swiper_id = target and target_id = me and action = 'me_gusta')
  then
    -- Quien da el segundo "me gusta" ve el aviso en ese momento: para esa persona ya está vista.
    insert into public.matches (user_a, user_b, a_seen_at, b_seen_at)
    values (
      least(me, target), greatest(me, target),
      case when me < target then now() end,
      case when me > target then now() end
    )
    on conflict do nothing;
    return true;
  end if;
  return false;
end;
$$;

revoke execute on function public.record_swipe(uuid, uuid, public.swipe_action, boolean) from public, anon, authenticated;

-- swipe() igual que antes (devuelve si hubo coincidencia), ahora con la lógica común.
create or replace function public.swipe(target uuid, choice public.swipe_action)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select public.record_swipe((select auth.uid()), target, choice, false);
$$;

-- Da el superlike del día. Devuelve si hubo coincidencia.
create function public.superlike(target uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select public.record_swipe((select auth.uid()), target, 'me_gusta', true);
$$;

revoke execute on function public.superlike(uuid) from public, anon;
grant execute on function public.superlike(uuid) to authenticated;

-- Descubrir suma las aficiones (las del perfil y las que tenéis en común) y si ese perfil te
-- dio un superlike. Los que te dieron superlike salen primero.
drop function public.discover_profiles(integer);

create function public.discover_profiles(max_results integer default 10)
returns table (
  id uuid,
  first_name text,
  age integer,
  bio text,
  distance_km integer,
  photo_paths text[],
  interests text[],
  shared_interests text[],
  superliked_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id,
         t.first_name,
         public.age_years(t.birth_date),
         t.bio,
         round(public.distance_km(v.lat, v.lon, t.lat, t.lon))::integer,
         array(select p.storage_path from public.profile_photos p where p.user_id = t.id order by p.position, p.created_at),
         t.interests,
         array(select k from unnest(t.interests) k where k = any (v.interests)),
         sl.target_id is not null
  from public.profiles v
  join public.profiles t on public.can_see_profile(t.id::text)
  left join public.swipes sl on sl.swiper_id = t.id and sl.target_id = v.id and sl.super
  where v.id = (select auth.uid())
    and not exists (
      select 1 from public.swipes s
      where s.swiper_id = v.id and s.target_id = t.id
        and (s.action = 'me_gusta' or s.created_at > now() - interval '30 days')
    )
  order by sl.target_id is null, public.distance_km(v.lat, v.lon, t.lat, t.lon), t.id
  limit least(greatest(max_results, 1), 20);
$$;

revoke execute on function public.discover_profiles(integer) from public, anon;
grant execute on function public.discover_profiles(integer) to authenticated;

-- ---------------------------------------------------------------------------------------
-- Aviso de novedades (D-19). Una coincidencia tiene novedad para mí si todavía no la vi, o si
-- la otra persona escribió después de la última vez que abrí el chat.
create function public.match_unread(m public.matches, me uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case when me = m.user_a then m.a_seen_at else m.b_seen_at end is null
    or exists (
      select 1 from public.messages msg
      where msg.user_a = m.user_a and msg.user_b = m.user_b and msg.sender_id <> me
        and msg.created_at > case when me = m.user_a then m.a_seen_at else m.b_seen_at end
    );
$$;

revoke execute on function public.match_unread(public.matches, uuid) from public, anon, authenticated;

-- Cuántas coincidencias tienen novedad (para el punto de la barra de abajo).
create function public.unread_matches_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.matches m
  where (select auth.uid()) in (m.user_a, m.user_b)
    and public.match_unread(m, (select auth.uid()));
$$;

revoke execute on function public.unread_matches_count() from public, anon;
grant execute on function public.unread_matches_count() to authenticated;

-- Marca como vista la coincidencia con esa persona (al abrir el chat o leer mensajes nuevos).
create function public.mark_match_seen(other uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.matches
  set a_seen_at = case when user_a = (select auth.uid()) then now() else a_seen_at end,
      b_seen_at = case when user_b = (select auth.uid()) then now() else b_seen_at end
  where user_a = least((select auth.uid()), other) and user_b = greatest((select auth.uid()), other);
$$;

revoke execute on function public.mark_match_seen(uuid) from public, anon;
grant execute on function public.mark_match_seen(uuid) to authenticated;

-- La lista de coincidencias suma si cada una tiene novedad.
drop function public.my_matches();

create function public.my_matches()
returns table (
  id uuid,
  first_name text,
  age integer,
  photo_path text,
  matched_at timestamptz,
  last_message text,
  last_message_at timestamptz,
  last_message_mine boolean,
  unread boolean
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
         m.created_at,
         last.body,
         last.created_at,
         last.sender_id = (select auth.uid()),
         public.match_unread(m, (select auth.uid()))
  from public.matches m
  join public.profiles p
    on p.id = case when m.user_a = (select auth.uid()) then m.user_b else m.user_a end
  left join lateral (
    select msg.body, msg.created_at, msg.sender_id
    from public.messages msg
    where msg.user_a = m.user_a and msg.user_b = m.user_b
    order by msg.created_at desc
    limit 1
  ) last on true
  where (select auth.uid()) in (m.user_a, m.user_b)
  order by coalesce(last.created_at, m.created_at) desc;
$$;

revoke execute on function public.my_matches() from public, anon;
grant execute on function public.my_matches() to authenticated;

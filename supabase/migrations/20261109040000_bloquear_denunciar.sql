-- Bloquear y denunciar (parte 5 de la primera versión, docs/producto.md; D-14).
-- Bloquear corta todo contacto en las dos direcciones: se borra la coincidencia (y con ella
-- el chat) y ninguno de los dos vuelve a ver al otro en Descubrir. Denunciar guarda la
-- denuncia con su motivo y además bloquea. Un perfil con 3 denuncias sin revisar, de personas
-- distintas, deja de aparecer en Descubrir hasta que se revisen.

create table public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

-- Cada uno ve a quién bloqueó (nunca quién lo bloqueó). Se escribe con block_user().
create policy "Cada uno ve a quién bloqueó" on public.blocks
  for select to authenticated using ((select auth.uid()) = blocker_id);

create type public.report_reason as enum (
  'perfil_falso',
  'fotos_inapropiadas',
  'acoso',
  'menor_de_edad',
  'spam',
  'otro'
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_id uuid not null references auth.users (id) on delete cascade,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 500),
  created_at timestamptz not null default now(),
  -- Lo completa quien revisa, desde Supabase (docs/desarrollo.md).
  reviewed_at timestamptz,
  unique (reporter_id, reported_id),
  check (reporter_id <> reported_id)
);
create index reports_reported_idx on public.reports (reported_id) where reviewed_at is null;

-- Sin reglas de acceso: nadie las lee ni escribe desde la app. Se crean con report_user()
-- y solo se ven desde el panel de Supabase.
alter table public.reports enable row level security;

-- Ayudantes.
create function public.blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create function public.hidden_by_reports(u uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    select count(distinct reporter_id) from public.reports
    where reported_id = u and reviewed_at is null
  ) >= 3;
$$;

revoke execute on function public.blocked_between(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.hidden_by_reports(uuid) from public, anon, authenticated;

-- Descubrir excluye bloqueos (en las dos direcciones) y perfiles ocultos por denuncias.
-- Las coincidencias propias se siguen viendo; bloquear las borra.
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
      and not public.blocked_between(v.id, t.id)
      and not public.hidden_by_reports(t.id)
  )
  or exists (
    select 1
    from public.matches m
    where (select auth.uid()) in (m.user_a, m.user_b)
      and target in (m.user_a::text, m.user_b::text)
      and target <> (select auth.uid())::text
  );
$$;

-- Guarda el bloqueo y borra la coincidencia (sus mensajes se borran con ella). Uso interno.
create function public.apply_block(me uuid, target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- El mismo candado que swipe(), para que no se cree una coincidencia a la vez.
  perform pg_advisory_xact_lock(hashtext(least(me, target)::text || greatest(me, target)::text));
  insert into public.blocks (blocker_id, blocked_id) values (me, target) on conflict do nothing;
  delete from public.matches where user_a = least(me, target) and user_b = greatest(me, target);
end;
$$;

revoke execute on function public.apply_block(uuid, uuid) from public, anon, authenticated;

-- Bloquea a alguien que uno puede ver (en Descubrir o en sus coincidencias). Repetirlo no hace nada.
create function public.block_user(target uuid)
returns void
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
  if exists (select 1 from public.blocks where blocker_id = me and blocked_id = target) then
    return;
  end if;
  if not public.can_see_profile(target::text) then
    raise exception 'Perfil no disponible.' using errcode = 'insufficient_privilege';
  end if;
  perform public.apply_block(me, target);
end;
$$;

revoke execute on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;

-- Denuncia y bloquea. Una denuncia por persona y perfil: repetirla no suma.
create function public.report_user(target uuid, reason public.report_reason, details text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  note text := nullif(btrim(details), '');
begin
  if me is null then
    raise exception 'Hace falta iniciar sesión.' using errcode = 'insufficient_privilege';
  end if;
  if not public.can_see_profile(target::text)
    and not exists (select 1 from public.blocks where blocker_id = me and blocked_id = target)
  then
    raise exception 'Perfil no disponible.' using errcode = 'insufficient_privilege';
  end if;

  perform public.apply_block(me, target);
  insert into public.reports (reporter_id, reported_id, reason, details)
  values (me, target, reason, note)
  on conflict (reporter_id, reported_id) do nothing;
end;
$$;

revoke execute on function public.report_user(uuid, public.report_reason, text) from public, anon;
grant execute on function public.report_user(uuid, public.report_reason, text) to authenticated;

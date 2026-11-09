-- Descubrir (D-10, D-11 y D-12 en docs/decisiones.md).
-- Nadie lee perfiles ajenos directamente: los perfiles que alguien puede ver salen de la
-- función discover_profiles(), que solo devuelve lo necesario para la tarjeta (nombre, edad,
-- descripción, distancia en km enteros y fotos). Nunca la fecha de nacimiento ni la ubicación.

-- Preferencias de búsqueda y ubicación aproximada.
alter table public.profiles
  add column min_age smallint not null default 18 check (min_age between 18 and 99),
  add column max_age smallint not null default 99 check (max_age between 18 and 99),
  add column max_distance_km smallint not null default 50 check (max_distance_km between 2 and 200),
  add column lat double precision check (lat between -90 and 90),
  add column lon double precision check (lon between -180 and 180),
  add column location_updated_at timestamptz,
  add constraint profiles_age_range check (min_age <= max_age),
  add constraint profiles_location_pair check ((lat is null) = (lon is null));

-- La ubicación se guarda siempre redondeada a una cuadrícula de 0,02 grados (unos 2 km),
-- aunque la app mande una más precisa.
create function public.round_profile_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.lat is not null then
    new.lat := (round((new.lat / 0.02)::numeric) * 0.02)::double precision;
    new.lon := (round((new.lon / 0.02)::numeric) * 0.02)::double precision;
  end if;
  if tg_op = 'INSERT' or new.lat is distinct from old.lat or new.lon is distinct from old.lon then
    new.location_updated_at := case when new.lat is null then null else now() end;
  end if;
  return new;
end;
$$;

create trigger profiles_round_location
  before insert or update of lat, lon on public.profiles
  for each row execute function public.round_profile_location();

-- Ayudantes.
create function public.age_years(birth date)
returns integer
language sql
stable
set search_path = ''
as $$
  select extract(year from age(current_date, birth))::integer;
$$;

-- "A quién quiere conocer" incluye este género. "No binario" solo lo ve quien eligió "Todos" (D-9).
create function public.wants(interested public.interested_in, g public.gender)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select interested = 'todos'
    or (interested = 'hombres' and g = 'hombre')
    or (interested = 'mujeres' and g = 'mujer');
$$;

-- Distancia en km sobre la esfera (fórmula del haversine).
create function public.distance_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
  )));
$$;

-- ¿La persona con sesión puede ver este perfil? (D-10): interés mutuo por género, la edad
-- dentro del rango de quien mira, a su distancia máxima, ambos con ubicación y el perfil
-- con al menos 2 fotos. Recibe texto porque también se usa con nombres de carpeta del bucket.
create function public.can_see_profile(target text)
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
  );
$$;

revoke execute on function public.can_see_profile(text) from public, anon;
grant execute on function public.can_see_profile(text) to authenticated;

-- Fotos de los perfiles que uno puede ver (además de las propias, que ya se ven).
create policy "Se ven las fotos de perfiles visibles" on public.profile_photos
  for select to authenticated using (public.can_see_profile(user_id::text));

create policy "Se ven los archivos de perfiles visibles" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-photos' and public.can_see_profile((storage.foldername(name))[1]));

-- "Me gusta" y "paso". Un "me gusta" es para siempre; un "paso" esconde el perfil 30 días (D-11).
create type public.swipe_action as enum ('me_gusta', 'paso');

create table public.swipes (
  swiper_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid not null references auth.users (id) on delete cascade,
  action public.swipe_action not null,
  created_at timestamptz not null default now(),
  primary key (swiper_id, target_id),
  check (swiper_id <> target_id)
);
create index swipes_target_idx on public.swipes (target_id);

alter table public.swipes enable row level security;

-- Cada uno ve lo que eligió. Nadie escribe directamente: se usa la función swipe().
create policy "Cada uno ve sus deslizamientos" on public.swipes
  for select to authenticated using ((select auth.uid()) = swiper_id);

-- Registra un "me gusta" o un "paso" sobre un perfil que la persona puede ver. Un "paso"
-- vencido puede cambiarse; un "me gusta" no se pisa.
create function public.swipe(target uuid, choice public.swipe_action)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Hace falta iniciar sesión.' using errcode = 'insufficient_privilege';
  end if;
  if not public.can_see_profile(target::text) then
    raise exception 'Perfil no disponible.' using errcode = 'insufficient_privilege';
  end if;
  insert into public.swipes (swiper_id, target_id, action)
  values ((select auth.uid()), target, choice)
  on conflict (swiper_id, target_id) do update
    set action = excluded.action, created_at = now()
    where public.swipes.action = 'paso';
end;
$$;

revoke execute on function public.swipe(uuid, public.swipe_action) from public, anon;
grant execute on function public.swipe(uuid, public.swipe_action) to authenticated;

-- Los próximos perfiles para Descubrir, del más cercano al más lejano. Excluye los que ya
-- recibieron "me gusta" y los que recibieron "paso" hace menos de 30 días.
create function public.discover_profiles(max_results integer default 10)
returns table (
  id uuid,
  first_name text,
  age integer,
  bio text,
  distance_km integer,
  photo_paths text[]
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
         array(select p.storage_path from public.profile_photos p where p.user_id = t.id order by p.position, p.created_at)
  from public.profiles v
  join public.profiles t on public.can_see_profile(t.id::text)
  where v.id = (select auth.uid())
    and not exists (
      select 1 from public.swipes s
      where s.swiper_id = v.id and s.target_id = t.id
        and (s.action = 'me_gusta' or s.created_at > now() - interval '30 days')
    )
  order by public.distance_km(v.lat, v.lon, t.lat, t.lon), t.id
  limit least(greatest(max_results, 1), 20);
$$;

revoke execute on function public.discover_profiles(integer) from public, anon;
grant execute on function public.discover_profiles(integer) to authenticated;

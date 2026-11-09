-- Perfiles y fotos (D-8 en docs/decisiones.md). Las reglas críticas se aplican acá, en la
-- base de datos, además de en la app: edad mínima, largos, opciones y máximo de fotos.
-- Cada persona solo puede ver y cambiar SU perfil y SUS fotos (RLS). Ver a otros perfiles
-- llega con "Descubrir", en otra migración.

create type public.gender as enum ('mujer', 'hombre', 'no_binario');
create type public.interested_in as enum ('hombres', 'mujeres', 'todos');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 40),
  birth_date date not null,
  bio text not null default '' check (char_length(bio) <= 500),
  gender public.gender not null,
  interested_in public.interested_in not null,
  -- Consentimiento explícito para datos sensibles (RGPD art. 9): cuándo se dio.
  sensitive_data_consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Edad mínima de 18 al crear o cambiar la fecha de nacimiento. Es un trigger y no un CHECK
-- porque depende de la fecha de hoy.
create function public.check_profile_age()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_date > (current_date - interval '18 years')::date then
    raise exception 'Hay que tener al menos 18 años.' using errcode = 'check_violation';
  end if;
  if new.birth_date < (current_date - interval '120 years')::date then
    raise exception 'Fecha de nacimiento no válida.' using errcode = 'check_violation';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_check_age
  before insert or update of birth_date, first_name, bio, gender, interested_in on public.profiles
  for each row execute function public.check_profile_age();

alter table public.profiles enable row level security;

create policy "Cada uno ve su perfil" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Cada uno crea su perfil" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "Cada uno cambia su perfil" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Cada uno borra su perfil" on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);

-- Fotos: el archivo vive en el almacenamiento privado "profile-photos", en la carpeta
-- <id del usuario>/; acá se guarda la ruta y el orden.
create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  check (split_part(storage_path, '/', 1) = user_id::text)
);
create index profile_photos_user_idx on public.profile_photos (user_id, position);

-- Máximo 6 fotos por persona.
create function public.check_photo_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  if (select count(*) from public.profile_photos where user_id = new.user_id) >= 6 then
    raise exception 'Máximo 6 fotos.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profile_photos_limit
  before insert on public.profile_photos
  for each row execute function public.check_photo_limit();

alter table public.profile_photos enable row level security;

create policy "Cada uno ve sus fotos" on public.profile_photos
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Cada uno sube sus fotos" on public.profile_photos
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cada uno ordena sus fotos" on public.profile_photos
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Cada uno borra sus fotos" on public.profile_photos
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Almacenamiento privado de fotos: hasta 5 MB, JPG, PNG o WebP.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Cada uno ve sus archivos de fotos" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Cada uno sube archivos a su carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Cada uno borra sus archivos de fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

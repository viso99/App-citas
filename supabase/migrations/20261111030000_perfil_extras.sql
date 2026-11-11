-- Perfil (D-23): preguntas, datos opcionales con filtros y perfil verificado.
-- Solo agrega cosas: columnas nuevas (todas opcionales), una tabla y un bucket.

-- ---------------------------------------------------------------------------------------
-- Preguntas: hasta 3, guardadas como [{"key": "...", "answer": "..."}]. La lista de preguntas
-- vive en src/lib/profileExtras.ts; la base comprueba forma, repetidas y largos.
create function public.valid_prompts(list jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(list) = 'array'
    and jsonb_array_length(list) <= 3
    and not exists (
      select 1 from jsonb_array_elements(list) e
      where jsonb_typeof(e) <> 'object'
        or coalesce(e ->> 'key', '') !~ '^[a-z_]{1,30}$'
        or char_length(btrim(coalesce(e ->> 'answer', ''))) not between 1 and 150
        or (select count(*) from jsonb_object_keys(e)) <> 2
    )
    and (select count(distinct e ->> 'key') from jsonb_array_elements(list) e) = jsonb_array_length(list);
$$;

-- Datos opcionales y filtros. Las opciones válidas son las de src/lib/profileExtras.ts.
alter table public.profiles
  add column prompts jsonb not null default '[]'
    constraint profiles_prompts_valid check (public.valid_prompts(prompts)),
  add column height_cm smallint check (height_cm between 120 and 230),
  add column job text check (job is null or char_length(job) between 1 and 60),
  add column studies text check (studies in ('secundaria', 'bachillerato', 'fp', 'universidad', 'posgrado')),
  add column smoking text check (smoking in ('no', 'a_veces', 'si')),
  add column drinking text check (drinking in ('no', 'socialmente', 'si')),
  add column children text check (children in ('no_quiero', 'quiero', 'tengo', 'no_lo_se')),
  add column filter_non_smokers boolean not null default false,
  add column filter_wants_children boolean not null default false,
  add column filter_verified boolean not null default false;

-- ---------------------------------------------------------------------------------------
-- Verificación: la persona sube un selfie imitando un gesto y Sergio lo revisa en Supabase
-- (completa verified_at o rejected_at). Nadie puede marcarse verificado a sí mismo: la tabla
-- no se escribe desde la app, solo con request_verification().
create table public.verifications (
  user_id uuid primary key references auth.users (id) on delete cascade,
  photo_path text not null check (split_part(photo_path, '/', 1) = user_id::text),
  gesture text not null check (gesture ~ '^[a-z_]{1,30}$'),
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  rejected_at timestamptz
);

alter table public.verifications enable row level security;

create policy "Cada uno ve su verificación" on public.verifications
  for select to authenticated using ((select auth.uid()) = user_id);

-- Pide (o vuelve a pedir) la verificación. Si ya estaba verificada, no cambia nada.
create function public.request_verification(path text, gesture text)
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
  insert into public.verifications (user_id, photo_path, gesture)
  values (me, path, gesture)
  on conflict (user_id) do update
    set photo_path = excluded.photo_path, gesture = excluded.gesture, submitted_at = now(), rejected_at = null
    where public.verifications.verified_at is null;
end;
$$;

revoke execute on function public.request_verification(text, text) from public, anon;
grant execute on function public.request_verification(text, text) to authenticated;

create function public.is_verified(u uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.verifications where user_id = u and verified_at is not null);
$$;

revoke execute on function public.is_verified(uuid) from public, anon, authenticated;

-- Selfies de verificación: privados, carpeta <id>/. Cada uno sube y ve los suyos; quien revisa
-- los ve desde el panel de Supabase.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-photos', 'verification-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Cada uno sube su selfie de verificación" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verification-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Cada uno ve su selfie de verificación" on storage.objects
  for select to authenticated
  using (bucket_id = 'verification-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Cada uno borra su selfie de verificación" on storage.objects
  for delete to authenticated
  using (bucket_id = 'verification-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------------------
-- Descubrir suma preguntas, datos opcionales y si está verificado, y aplica los filtros de
-- quien mira (solo pasa quien indicó lo que se pide).
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
  superliked_me boolean,
  prompts jsonb,
  height_cm smallint,
  job text,
  studies text,
  smoking text,
  drinking text,
  children text,
  verified boolean
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
         sl.target_id is not null,
         t.prompts,
         t.height_cm,
         t.job,
         t.studies,
         t.smoking,
         t.drinking,
         t.children,
         public.is_verified(t.id)
  from public.profiles v
  join public.profiles t on public.can_see_profile(t.id::text)
  left join public.swipes sl on sl.swiper_id = t.id and sl.target_id = v.id and sl.super
  where v.id = (select auth.uid())
    and not exists (
      select 1 from public.swipes s
      where s.swiper_id = v.id and s.target_id = t.id
        and (s.action = 'me_gusta' or s.created_at > now() - interval '30 days')
    )
    and (not v.filter_non_smokers or t.smoking = 'no')
    and (not v.filter_wants_children or t.children = 'quiero')
    and (not v.filter_verified or public.is_verified(t.id))
  order by sl.target_id is null, public.distance_km(v.lat, v.lon, t.lat, t.lon), t.id
  limit least(greatest(max_results, 1), 20);
$$;

revoke execute on function public.discover_profiles(integer) from public, anon;
grant execute on function public.discover_profiles(integer) to authenticated;

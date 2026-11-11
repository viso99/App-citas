-- Chat (D-22): "leído", "está escribiendo…" y fotos en el chat.
-- "Escribiendo" no toca la base: va por Realtime (broadcast), sin guardarse.

-- ---------------------------------------------------------------------------------------
-- Leído: se usa cuándo vio cada uno el chat por última vez (matches.a_seen_at / b_seen_at,
-- D-19). Para verlo en el momento, las coincidencias entran en Realtime (respeta RLS: cada
-- uno solo recibe las suyas).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.matches;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------
-- Fotos en el chat: un mensaje puede llevar texto, una foto o las dos cosas.
alter table public.messages
  add column image_path text,
  drop constraint messages_body_check,
  add constraint messages_body_check check (char_length(body) <= 1000),
  add constraint messages_has_content check (char_length(btrim(body)) >= 1 or image_path is not null),
  add constraint messages_image_in_pair check (
    image_path is null or split_part(image_path, '/', 1) = user_a::text || '_' || user_b::text
  );

-- Almacenamiento privado: carpeta <user_a>_<user_b>/ por coincidencia. Hasta 5 MB, JPG,
-- PNG o WebP, como las fotos del perfil.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-photos', 'chat-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- ¿La carpeta es de una coincidencia mía que existe?
create function public.is_my_chat_folder(folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.matches m
    where (select auth.uid()) in (m.user_a, m.user_b)
      and folder = m.user_a::text || '_' || m.user_b::text
  );
$$;

revoke execute on function public.is_my_chat_folder(text) from public, anon;
grant execute on function public.is_my_chat_folder(text) to authenticated;

create policy "Ven las fotos del chat las dos personas" on storage.objects
  for select to authenticated
  using (bucket_id = 'chat-photos' and public.is_my_chat_folder((storage.foldername(name))[1]));

create policy "Suben fotos al chat las dos personas" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-photos' and public.is_my_chat_folder((storage.foldername(name))[1]));

-- Para poder borrarlas al deshacer la coincidencia, bloquear o borrar la cuenta.
create policy "Borran fotos del chat las dos personas" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat-photos' and public.is_my_chat_folder((storage.foldername(name))[1]));

-- La lista de coincidencias muestra "📷 Foto" cuando el último mensaje es solo una foto.
create or replace function public.my_matches()
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
         case when last.body = '' and last.image_path is not null then '📷 Foto' else last.body end,
         last.created_at,
         last.sender_id = (select auth.uid()),
         public.match_unread(m, (select auth.uid()))
  from public.matches m
  join public.profiles p
    on p.id = case when m.user_a = (select auth.uid()) then m.user_b else m.user_a end
  left join lateral (
    select msg.body, msg.image_path, msg.created_at, msg.sender_id
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

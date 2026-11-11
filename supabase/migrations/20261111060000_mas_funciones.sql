-- Más funciones antes de abrir (D-25 a D-34 en docs/decisiones.md): quién te ha dado me gusta,
-- me gusta con mensaje, pausar el perfil, activo hace poco, ideas para el primer mensaje,
-- notas de voz, reacciones y borrar mensajes. Solo agrega cosas: columnas nuevas (con valor por
-- defecto), funciones y tipos de archivo; no borra ni cambia datos.

-- ---------------------------------------------------------------------------------------
-- Pausar el perfil (D-27) y "activo hace poco" (D-28).
alter table public.profiles
  add column paused boolean not null default false,
  add column last_active_at timestamptz;

-- Apunta que la persona usa la app (como mucho una vez cada 5 minutos).
create function public.touch_activity()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set last_active_at = now()
  where id = (select auth.uid())
    and (last_active_at is null or last_active_at < now() - interval '5 minutes');
$$;

revoke execute on function public.touch_activity() from public, anon;
grant execute on function public.touch_activity() to authenticated;

-- Un perfil en pausa no sale en Descubrir (ni en "Les gustas"); sus coincidencias siguen.
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
      and not t.paused
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

-- ---------------------------------------------------------------------------------------
-- Me gusta con mensaje (D-26): un texto corto que la otra persona ve en tu tarjeta. Si hay
-- coincidencia, pasa a ser el primer mensaje del chat.
alter table public.swipes
  add column note text,
  add constraint swipes_note_valid check (
    note is null or (action = 'me_gusta' and char_length(btrim(note)) between 1 and 200)
  );

-- Los mensajes creados a la vez (las notas al crear la coincidencia) quedan en orden.
create or replace function public.set_message_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := clock_timestamp();
  return new;
end;
$$;

drop function public.record_swipe(uuid, uuid, public.swipe_action, boolean);

create function public.record_swipe(me uuid, target uuid, choice public.swipe_action, is_super boolean, note text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_note text := nullif(btrim(note), '');
  new_match boolean;
begin
  if me is null then
    raise exception 'Hace falta iniciar sesión.' using errcode = 'insufficient_privilege';
  end if;
  if not public.can_see_profile(target::text) then
    raise exception 'Perfil no disponible.' using errcode = 'insufficient_privilege';
  end if;
  if clean_note is not null and choice <> 'me_gusta' then
    raise exception 'Solo un "me gusta" lleva mensaje.' using errcode = 'check_violation';
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

  insert into public.swipes (swiper_id, target_id, action, super, note)
  values (me, target, choice, is_super, clean_note)
  on conflict (swiper_id, target_id) do update
    set action = excluded.action, super = excluded.super, note = excluded.note, created_at = now()
    where public.swipes.action = 'paso';

  if choice = 'me_gusta'
    and exists (select 1 from public.swipes where swiper_id = me and target_id = target and action = 'me_gusta')
    and exists (select 1 from public.swipes where swiper_id = target and target_id = me and action = 'me_gusta')
  then
    -- Quien da el segundo "me gusta" ve el aviso en ese momento: para esa persona ya está vista.
    with created as (
      insert into public.matches (user_a, user_b, a_seen_at, b_seen_at)
      values (
        least(me, target), greatest(me, target),
        case when me < target then now() end,
        case when me > target then now() end
      )
      on conflict do nothing
      returning 1
    )
    select exists (select 1 from created) into new_match;

    -- Los mensajes de los "me gusta" abren el chat: primero el más antiguo.
    if new_match then
      insert into public.messages (user_a, user_b, sender_id, body)
      select least(me, target), greatest(me, target), s.swiper_id, s.note
      from public.swipes s
      where s.note is not null
        and ((s.swiper_id = me and s.target_id = target) or (s.swiper_id = target and s.target_id = me))
      order by s.created_at;
    end if;
    return true;
  end if;
  return false;
end;
$$;

revoke execute on function public.record_swipe(uuid, uuid, public.swipe_action, boolean, text) from public, anon, authenticated;

-- "Me gusta" con mensaje. Devuelve si hubo coincidencia.
create function public.like_with_note(target uuid, note text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select public.record_swipe((select auth.uid()), target, 'me_gusta', false, note);
$$;

revoke execute on function public.like_with_note(uuid, text) from public, anon;
grant execute on function public.like_with_note(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------------
-- Descubrir suma el mensaje que te dejaron y si la persona está activa (últimas 24 horas).
-- Con only_likers, solo quienes te dieron "me gusta" (D-25), del más reciente al más antiguo.
drop function public.discover_profiles(integer);

create function public.discover_profiles(max_results integer default 10, only_likers boolean default false)
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
  verified boolean,
  note_to_me text,
  active_recently boolean
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
         coalesce(lk.super, false),
         t.prompts,
         t.height_cm,
         t.job,
         t.studies,
         t.smoking,
         t.drinking,
         t.children,
         public.is_verified(t.id),
         lk.note,
         t.last_active_at > now() - interval '24 hours'
  from public.profiles v
  join public.profiles t on public.can_see_profile(t.id::text)
  left join public.swipes lk on lk.swiper_id = t.id and lk.target_id = v.id and lk.action = 'me_gusta'
  where v.id = (select auth.uid())
    and not exists (
      select 1 from public.swipes s
      where s.swiper_id = v.id and s.target_id = t.id
        and (s.action = 'me_gusta' or s.created_at > now() - interval '30 days')
    )
    and (not only_likers or lk.swiper_id is not null)
    and (not v.filter_non_smokers or t.smoking = 'no')
    and (not v.filter_wants_children or t.children = 'quiero')
    and (not v.filter_verified or public.is_verified(t.id))
  order by
    case when only_likers then lk.created_at end desc,
    not coalesce(lk.super, false),
    lk.note is null,
    public.distance_km(v.lat, v.lon, t.lat, t.lon),
    t.id
  limit least(greatest(max_results, 1), 20);
$$;

revoke execute on function public.discover_profiles(integer, boolean) from public, anon;
grant execute on function public.discover_profiles(integer, boolean) to authenticated;

-- Cuántas personas que puedes ver te dieron "me gusta" y aún no les has contestado (D-25).
create function public.likes_me_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.swipes lk
  join public.profiles v on v.id = (select auth.uid())
  join public.profiles t on t.id = lk.swiper_id
  where lk.target_id = v.id and lk.action = 'me_gusta'
    and public.can_see_profile(lk.swiper_id::text)
    and not exists (
      select 1 from public.swipes s
      where s.swiper_id = v.id and s.target_id = lk.swiper_id
        and (s.action = 'me_gusta' or s.created_at > now() - interval '30 days')
    )
    and (not v.filter_non_smokers or t.smoking = 'no')
    and (not v.filter_wants_children or t.children = 'quiero')
    and (not v.filter_verified or public.is_verified(t.id));
$$;

revoke execute on function public.likes_me_count() from public, anon;
grant execute on function public.likes_me_count() to authenticated;

-- ---------------------------------------------------------------------------------------
-- Ideas para el primer mensaje (D-29): aficiones en común y preguntas de la otra persona.
-- Solo entre las dos personas de una coincidencia.
create function public.icebreaker_info(other uuid)
returns table (shared_interests text[], prompts jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select array(select k from unnest(o.interests) k where k = any (me.interests)), o.prompts
  from public.profiles me
  join public.profiles o on o.id = other
  where me.id = (select auth.uid())
    and exists (
      select 1 from public.matches m
      where m.user_a = least(me.id, other) and m.user_b = greatest(me.id, other)
    );
$$;

revoke execute on function public.icebreaker_info(uuid) from public, anon;
grant execute on function public.icebreaker_info(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------
-- Notas de voz (D-30), reacciones (D-31) y borrar mensajes (D-32).
alter table public.messages
  add column audio_path text,
  add column a_reaction text,
  add column b_reaction text,
  add column deleted_at timestamptz,
  drop constraint messages_has_content,
  add constraint messages_has_content check (
    deleted_at is not null or char_length(btrim(body)) >= 1 or image_path is not null or audio_path is not null
  ),
  add constraint messages_audio_in_pair check (
    audio_path is null or split_part(audio_path, '/', 1) = user_a::text || '_' || user_b::text
  ),
  add constraint messages_reactions_valid check (
    (a_reaction is null or a_reaction in ('❤️', '😂', '😮', '😢', '👍', '🔥'))
    and (b_reaction is null or b_reaction in ('❤️', '😂', '😮', '😢', '👍', '🔥'))
  );

-- Los audios van en la misma carpeta privada del chat que las fotos.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg']
where id = 'chat-photos';

-- Reacciona (o quita la reacción, con el mismo emoji) a un mensaje de la otra persona.
create function public.react_to_message(msg uuid, emoji text)
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
  if emoji is not null and emoji not in ('❤️', '😂', '😮', '😢', '👍', '🔥') then
    raise exception 'Reacción no válida.' using errcode = 'check_violation';
  end if;
  update public.messages m
  set a_reaction = case when m.user_a = me then (case when m.a_reaction = emoji then null else emoji end) else m.a_reaction end,
      b_reaction = case when m.user_b = me then (case when m.b_reaction = emoji then null else emoji end) else m.b_reaction end
  where m.id = msg and me in (m.user_a, m.user_b) and m.sender_id <> me and m.deleted_at is null;
end;
$$;

revoke execute on function public.react_to_message(uuid, text) from public, anon;
grant execute on function public.react_to_message(uuid, text) to authenticated;

-- Borra un mensaje propio para las dos personas: queda "Mensaje eliminado". Devuelve las rutas
-- de la foto o el audio, para que la app borre los archivos.
create function public.delete_message(msg uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  files text[];
begin
  if me is null then
    raise exception 'Hace falta iniciar sesión.' using errcode = 'insufficient_privilege';
  end if;
  select array_remove(array[m.image_path, m.audio_path], null) into files
  from public.messages m
  where m.id = msg and m.sender_id = me and m.deleted_at is null
  for update;
  if files is null then
    return '{}';
  end if;
  update public.messages
  set body = '', image_path = null, audio_path = null, a_reaction = null, b_reaction = null, deleted_at = now()
  where id = msg;
  return files;
end;
$$;

revoke execute on function public.delete_message(uuid) from public, anon;
grant execute on function public.delete_message(uuid) to authenticated;

-- La lista de coincidencias muestra "🎤 Audio" y "Mensaje eliminado".
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
         case
           when last.deleted_at is not null then 'Mensaje eliminado'
           when last.body = '' and last.audio_path is not null then '🎤 Audio'
           when last.body = '' and last.image_path is not null then '📷 Foto'
           else last.body
         end,
         last.created_at,
         last.sender_id = (select auth.uid()),
         public.match_unread(m, (select auth.uid()))
  from public.matches m
  join public.profiles p
    on p.id = case when m.user_a = (select auth.uid()) then m.user_b else m.user_a end
  left join lateral (
    select msg.body, msg.image_path, msg.audio_path, msg.deleted_at, msg.created_at, msg.sender_id
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

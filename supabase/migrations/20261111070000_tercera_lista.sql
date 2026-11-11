-- Tercera lista de funciones (D-36 a D-42 en docs/decisiones.md): qué buscas, idiomas,
-- mascotas y signo, modo viaje, responder a un mensaje, recordatorio de chats parados y
-- descargar mis datos. Solo agrega cosas: columnas nuevas (opcionales o con valor por defecto) y
-- funciones; no borra ni cambia datos.

-- ---------------------------------------------------------------------------------------
-- Perfil: qué buscas (D-36), idiomas, mascotas y signo (D-41). Las opciones válidas son las de
-- src/lib/profileExtras.ts. "Qué buscas" no tiene ninguna opción sobre sexo.
alter table public.profiles
  add column looking_for text check (looking_for in ('estable', 'sin_prisa', 'amistad', 'no_lo_se')),
  add column languages text[] not null default '{}'
    constraint profiles_languages_valid check (
      cardinality(languages) <= 5
      and languages <@ array['es', 'ca', 'eu', 'gl', 'en', 'fr', 'de', 'it', 'pt', 'ar', 'ro', 'zh', 'ru', 'uk', 'nl', 'lse']
    ),
  add column pets text check (pets in ('perro', 'gato', 'otras', 'ninguna', 'quiero', 'alergia')),
  add column zodiac text check (zodiac in (
    'aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo', 'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis'
  )),
  add column filter_same_goal boolean not null default false;

-- ---------------------------------------------------------------------------------------
-- Modo viaje (D-39): una ciudad de la lista de src/lib/travel.ts, con las coordenadas de su
-- centro. Mientras está activo (como mucho 30 días), Descubrir usa esa ubicación en las dos
-- direcciones: ves a la gente de allí y ellos te ven a ti, marcado "De viaje".
alter table public.profiles
  add column travel_city text check (travel_city ~ '^[a-z_]{1,30}$'),
  add column travel_lat double precision check (travel_lat between -90 and 90),
  add column travel_lon double precision check (travel_lon between -180 and 180),
  add column travel_started_at timestamptz,
  add constraint profiles_travel_complete check (
    (travel_city is null) = (travel_lat is null)
    and (travel_city is null) = (travel_lon is null)
    and (travel_city is null) = (travel_started_at is null)
  );

create function public.traveling(p public.profiles)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p.travel_city is not null and p.travel_started_at > now() - interval '30 days';
$$;

-- Ubicación que usa Descubrir: la del viaje si está activo; si no, la de la persona.
create function public.loc_lat(p public.profiles)
returns double precision
language sql
stable
set search_path = ''
as $$
  select case when public.traveling(p) then p.travel_lat else p.lat end;
$$;

create function public.loc_lon(p public.profiles)
returns double precision
language sql
stable
set search_path = ''
as $$
  select case when public.traveling(p) then p.travel_lon else p.lon end;
$$;

-- Igual que antes, pero con la ubicación del viaje.
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
      and public.loc_lat(v) is not null and public.loc_lat(t) is not null
      and public.wants(v.interested_in, t.gender)
      and public.wants(t.interested_in, v.gender)
      and public.age_years(t.birth_date) between v.min_age and v.max_age
      and public.distance_km(public.loc_lat(v), public.loc_lon(v), public.loc_lat(t), public.loc_lon(t)) <= v.max_distance_km
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
-- Descubrir suma qué busca, idiomas, mascotas, signo y si está de viaje, y el filtro "solo
-- quien busca lo mismo que yo" (sin efecto si no indicaste qué buscas).
drop function public.discover_profiles(integer, boolean);

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
  active_recently boolean,
  looking_for text,
  languages text[],
  pets text,
  zodiac text,
  traveling boolean
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
         round(public.distance_km(public.loc_lat(v), public.loc_lon(v), public.loc_lat(t), public.loc_lon(t)))::integer,
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
         t.last_active_at > now() - interval '24 hours',
         t.looking_for,
         t.languages,
         t.pets,
         t.zodiac,
         public.traveling(t)
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
    and (not v.filter_same_goal or v.looking_for is null or t.looking_for = v.looking_for)
  order by
    case when only_likers then lk.created_at end desc,
    not coalesce(lk.super, false),
    lk.note is null,
    public.distance_km(public.loc_lat(v), public.loc_lon(v), public.loc_lat(t), public.loc_lon(t)),
    t.id
  limit least(greatest(max_results, 1), 20);
$$;

revoke execute on function public.discover_profiles(integer, boolean) from public, anon;
grant execute on function public.discover_profiles(integer, boolean) to authenticated;

create or replace function public.likes_me_count()
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
    and (not v.filter_verified or public.is_verified(t.id))
    and (not v.filter_same_goal or v.looking_for is null or t.looking_for = v.looking_for);
$$;

-- ---------------------------------------------------------------------------------------
-- Responder a un mensaje concreto (D-37). Solo a uno del mismo chat. Si el original se borra
-- con la coincidencia, la respuesta se queda sin cita.
alter table public.messages
  add column reply_to uuid references public.messages (id) on delete set null;

create function public.check_reply_in_pair()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reply_to is not null and not exists (
    select 1 from public.messages o
    where o.id = new.reply_to and o.user_a = new.user_a and o.user_b = new.user_b
  ) then
    raise exception 'Solo se puede responder a un mensaje de este chat.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_reply_in_pair() from public, anon, authenticated;

create trigger messages_reply_in_pair
  before insert or update of reply_to on public.messages
  for each row execute function public.check_reply_in_pair();

-- ---------------------------------------------------------------------------------------
-- Recordatorio de chats parados (D-40): un aviso al móvil, sin nombres, cuando alguien te
-- escribió hace más de un día y no has abierto el chat, o cuando tenéis una coincidencia de
-- hace más de un día sin mensajes. Como mucho uno por mensaje (o por coincidencia), y solo de
-- la última semana. Lo llama una tarea diaria del servidor con la clave secreta de Supabase:
-- nadie puede pedirlo desde la app.
alter table public.matches
  add column a_reminded_at timestamptz,
  add column b_reminded_at timestamptz;

create function public.take_chat_reminders()
returns table (user_id uuid, other_id uuid, endpoint text, p256dh text, auth text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  return query
  with sides as (
    select m.user_a, m.user_b, m.created_at as matched_at, s.me, s.other, s.seen_at, s.reminded_at
    from public.matches m
    cross join lateral (
      values (m.user_a, m.user_b, m.a_seen_at, m.a_reminded_at),
             (m.user_b, m.user_a, m.b_seen_at, m.b_reminded_at)
    ) as s (me, other, seen_at, reminded_at)
  ),
  due as (
    select sd.user_a, sd.user_b, sd.me, sd.other
    from sides sd
    left join lateral (
      select msg.sender_id, msg.created_at
      from public.messages msg
      where msg.user_a = sd.user_a and msg.user_b = sd.user_b
      order by msg.created_at desc
      limit 1
    ) last on true
    where case
      when last.created_at is null then
        sd.matched_at between now() - interval '7 days' and now() - interval '24 hours'
        and sd.reminded_at is null
      else
        last.sender_id = sd.other
        and last.created_at between now() - interval '7 days' and now() - interval '24 hours'
        and (sd.seen_at is null or sd.seen_at < last.created_at)
        and (sd.reminded_at is null or sd.reminded_at < last.created_at)
    end
  ),
  marked as (
    update public.matches m
    set a_reminded_at = case when exists (select 1 from due d where d.user_a = m.user_a and d.user_b = m.user_b and d.me = m.user_a)
                          then now() else m.a_reminded_at end,
        b_reminded_at = case when exists (select 1 from due d where d.user_a = m.user_a and d.user_b = m.user_b and d.me = m.user_b)
                          then now() else m.b_reminded_at end
    where exists (select 1 from due d where d.user_a = m.user_a and d.user_b = m.user_b)
  )
  -- La actualización de arriba se hace siempre, aunque la persona no tenga avisos activados.
  select d.me, d.other, ps.endpoint, ps.p256dh, ps.auth
  from due d
  join public.push_subscriptions ps on ps.user_id = d.me;
end;
$$;

revoke execute on function public.take_chat_reminders() from public, anon, authenticated;
grant execute on function public.take_chat_reminders() to service_role;

-- ---------------------------------------------------------------------------------------
-- Descargar mis datos (D-42, derecho de acceso y portabilidad del RGPD): todo lo que la app
-- guarda de la persona, en un solo archivo. De los chats, solo los mensajes que escribió ella.
create function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id)
  select jsonb_build_object(
    'generado', now(),
    'cuenta', (
      select jsonb_build_object('correo', u.email, 'creada', u.created_at, 'ultimo_acceso', u.last_sign_in_at)
      from auth.users u where u.id = (select id from me)
    ),
    'perfil', (select to_jsonb(p) from public.profiles p where p.id = (select id from me)),
    'fotos', coalesce((
      select jsonb_agg(jsonb_build_object('archivo', ph.storage_path, 'orden', ph.position, 'subida', ph.created_at)
                       order by ph.position)
      from public.profile_photos ph where ph.user_id = (select id from me)
    ), '[]'),
    'verificacion', (
      select jsonb_build_object('enviada', v.submitted_at, 'verificada', v.verified_at, 'rechazada', v.rejected_at)
      from public.verifications v where v.user_id = (select id from me)
    ),
    'me_gusta_y_pasos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'a', coalesce(t.first_name, 'Cuenta eliminada'), 'que', s.action, 'superlike', s.super,
               'mensaje', s.note, 'cuando', s.created_at)
             order by s.created_at)
      from public.swipes s left join public.profiles t on t.id = s.target_id
      where s.swiper_id = (select id from me)
    ), '[]'),
    'coincidencias', coalesce((
      select jsonb_agg(jsonb_build_object('con', o.first_name, 'desde', m.created_at) order by m.created_at)
      from public.matches m
      join public.profiles o on o.id = case when m.user_a = (select id from me) then m.user_b else m.user_a end
      where (select id from me) in (m.user_a, m.user_b)
    ), '[]'),
    'mis_mensajes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'a', o.first_name, 'texto', msg.body, 'foto', msg.image_path, 'audio', msg.audio_path,
               'eliminado', msg.deleted_at, 'cuando', msg.created_at)
             order by msg.created_at)
      from public.messages msg
      join public.profiles o on o.id = case when msg.user_a = (select id from me) then msg.user_b else msg.user_a end
      where msg.sender_id = (select id from me)
    ), '[]'),
    'bloqueos', coalesce((
      select jsonb_agg(jsonb_build_object('a', coalesce(o.first_name, 'Cuenta eliminada'), 'cuando', b.created_at)
                       order by b.created_at)
      from public.blocks b left join public.profiles o on o.id = b.blocked_id
      where b.blocker_id = (select id from me)
    ), '[]'),
    'denuncias', coalesce((
      select jsonb_agg(jsonb_build_object(
               'a', coalesce(o.first_name, 'Cuenta eliminada'), 'motivo', r.reason, 'detalle', r.details, 'cuando', r.created_at)
             order by r.created_at)
      from public.reports r left join public.profiles o on o.id = r.reported_id
      where r.reporter_id = (select id from me)
    ), '[]'),
    'avisos_en_el_movil', coalesce((
      select jsonb_agg(jsonb_build_object('activados', ps.created_at) order by ps.created_at)
      from public.push_subscriptions ps where ps.user_id = (select id from me)
    ), '[]')
  )
  where (select id from me) is not null;
$$;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

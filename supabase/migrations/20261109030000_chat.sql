-- Chat (parte 4 de la primera versión, docs/producto.md): mensajes privados entre las dos
-- personas de una coincidencia. Solo ellas los leen y escriben (regla 8 de
-- docs/privacidad-y-legal.md). Si la coincidencia se borra, se borran sus mensajes.

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null,
  user_b uuid not null,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  foreign key (user_a, user_b) references public.matches (user_a, user_b) on delete cascade,
  check (sender_id in (user_a, user_b))
);
create index messages_pair_idx on public.messages (user_a, user_b, created_at);

alter table public.messages enable row level security;

create policy "Leen los mensajes las dos personas de la coincidencia" on public.messages
  for select to authenticated using ((select auth.uid()) in (user_a, user_b));

-- Se escribe solo en nombre propio y en una coincidencia propia que exista.
create policy "Escribe una de las dos personas de la coincidencia" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.matches m
      where m.user_a = messages.user_a and m.user_b = messages.user_b
    )
  );

-- Mensajes en tiempo real (Supabase Realtime respeta las reglas de arriba).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- La lista de coincidencias suma el último mensaje, para mostrarlo y ordenar por actividad.
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
  last_message_mine boolean
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
         last.sender_id = (select auth.uid())
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

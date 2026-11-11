-- Avisos en el móvil (D-24): notificaciones push del navegador cuando hay una coincidencia o
-- un mensaje nuevo. Solo agrega cosas.

-- Cada móvil o navegador donde la persona activó los avisos.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Cada uno ve sus avisos" on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Cada uno activa sus avisos" on public.push_subscriptions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cada uno desactiva sus avisos" on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Dónde avisar a la otra persona de una coincidencia o un mensaje. Solo responde justo
-- después de que ocurra (2 minutos) y solo a quien la provocó: así nadie puede pedir los
-- avisos de otra persona cuando quiera. Sin la clave privada del servidor, además, no se puede
-- enviar nada a esas direcciones.
create function public.push_targets(other uuid, kind text)
returns table (endpoint text, p256dh text, auth text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.endpoint, s.p256dh, s.auth
  from public.push_subscriptions s
  where s.user_id = other
    and other <> (select auth.uid())
    and case kind
      when 'match' then exists (
        select 1 from public.matches m
        where m.user_a = least((select auth.uid()), other) and m.user_b = greatest((select auth.uid()), other)
          and m.created_at > now() - interval '2 minutes'
      )
      when 'message' then exists (
        select 1 from public.messages msg
        where msg.user_a = least((select auth.uid()), other) and msg.user_b = greatest((select auth.uid()), other)
          and msg.sender_id = (select auth.uid())
          and msg.created_at > now() - interval '2 minutes'
      )
      else false
    end;
$$;

revoke execute on function public.push_targets(uuid, text) from public, anon;
grant execute on function public.push_targets(uuid, text) to authenticated;

-- Para borrar direcciones que el servicio de avisos ya no acepta (móvil cambiado, permisos
-- quitados). Solo las de alguien con quien se acaba de tener contacto.
create function public.forget_push_endpoint(other uuid, gone text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions s
  where s.user_id = other and s.endpoint = gone
    and exists (
      select 1 from public.matches m
      where m.user_a = least((select auth.uid()), other) and m.user_b = greatest((select auth.uid()), other)
    );
$$;

revoke execute on function public.forget_push_endpoint(uuid, text) from public, anon;
grant execute on function public.forget_push_endpoint(uuid, text) to authenticated;

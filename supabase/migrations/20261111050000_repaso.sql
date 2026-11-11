-- Repaso antes de abrir (2026-11-11). Solo agrega reglas y una función: no borra ni cambia datos.

-- ---------------------------------------------------------------------------------------
-- La hora de un mensaje la pone siempre la base. Si no, quien escribe podría mandar una hora
-- inventada: su mensaje saldría siempre "sin leer" para la otra persona, desordenaría el chat
-- y le daría acceso a los avisos de la otra persona fuera de los 2 minutos (push_targets).
create function public.set_message_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

create trigger messages_set_time
  before insert on public.messages
  for each row execute function public.set_message_time();

-- ---------------------------------------------------------------------------------------
-- Activar avisos en un móvil (D-24). Si ese móvil estaba guardado a nombre de otra cuenta
-- (alguien cerró sesión y entró otra persona), pasa a la cuenta actual: así los avisos de una
-- cuenta nunca llegan al móvil de otra. La dirección solo la conoce el propio navegador.
create function public.save_push_subscription(endpoint text, p256dh text, auth text)
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
  delete from public.push_subscriptions s where s.endpoint = save_push_subscription.endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (me, save_push_subscription.endpoint, save_push_subscription.p256dh, save_push_subscription.auth);
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

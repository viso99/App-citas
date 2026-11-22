-- Seguridad (revisión semanal 2026-11-22, ver docs/seguridad.md): las direcciones de avisos
-- del móvil de otra persona ya no se pueden leer ni borrar con una sesión normal. La sesión
-- solo pregunta si puede avisar (sí o no); las direcciones las lee el servidor con la clave
-- secreta. Solo cambia permisos y agrega una función: no toca datos.

-- ¿Puedo avisar ahora a esta persona? Mismas condiciones que push_targets: justo después de
-- una coincidencia o de un mensaje mío (2 minutos), y nunca a mí.
create function public.can_notify(other uuid, kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
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

revoke execute on function public.can_notify(uuid, text) from public, anon;
grant execute on function public.can_notify(uuid, text) to authenticated;

-- Las dos funciones viejas devolvían o borraban direcciones de otra persona: quedan cerradas
-- para las sesiones normales (no se borran, para no romper nada mientras se despliega).
revoke execute on function public.push_targets(uuid, text) from authenticated;
revoke execute on function public.forget_push_endpoint(uuid, text) from authenticated;

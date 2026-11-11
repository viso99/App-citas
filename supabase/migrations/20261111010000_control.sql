-- Control (D-21): deshacer el último "paso", ver y quitar bloqueos, y deshacer una
-- coincidencia. Solo agrega funciones: no cambia tablas.

-- Deshace un "paso" propio: el perfil vuelve a poder salir en Descubrir. Solo "paso", nunca
-- "me gusta". Devuelve si había algo que deshacer.
create function public.undo_pass(target uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  found_rows integer;
begin
  if me is null then
    raise exception 'Hace falta iniciar sesión.' using errcode = 'insufficient_privilege';
  end if;
  delete from public.swipes where swiper_id = me and target_id = target and action = 'paso';
  get diagnostics found_rows = row_count;
  return found_rows > 0;
end;
$$;

revoke execute on function public.undo_pass(uuid) from public, anon;
grant execute on function public.undo_pass(uuid) to authenticated;

-- Las personas que bloqueé, de la más reciente a la más antigua. Solo el nombre: sus fotos ya
-- no se pueden ver.
create function public.my_blocks()
returns table (id uuid, first_name text, blocked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.blocked_id, coalesce(p.first_name, 'Cuenta eliminada'), b.created_at
  from public.blocks b
  left join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = (select auth.uid())
  order by b.created_at desc;
$$;

revoke execute on function public.my_blocks() from public, anon;
grant execute on function public.my_blocks() to authenticated;

-- Quita un bloqueo propio. La coincidencia y el chat borrados no vuelven; las denuncias se
-- quedan para revisión.
create function public.unblock_user(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.blocks where blocker_id = (select auth.uid()) and blocked_id = target;
$$;

revoke execute on function public.unblock_user(uuid) from public, anon;
grant execute on function public.unblock_user(uuid) to authenticated;

-- Deshace una coincidencia propia: se borra con su chat. Los "me gusta" se quedan, así que no
-- volvéis a salir en Descubrir. La otra persona no recibe aviso.
create function public.unmatch(other uuid)
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
  perform pg_advisory_xact_lock(hashtext(least(me, other)::text || greatest(me, other)::text));
  delete from public.matches where user_a = least(me, other) and user_b = greatest(me, other);
end;
$$;

revoke execute on function public.unmatch(uuid) from public, anon;
grant execute on function public.unmatch(uuid) to authenticated;

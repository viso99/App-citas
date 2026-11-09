-- Borrar la cuenta desde la app (regla 6 de docs/privacidad-y-legal.md, P-11).
-- Borra al usuario de auth.users; todo lo suyo se borra en cascada: perfil, filas de fotos,
-- "me gusta" y "paso" (dados y recibidos), coincidencias y sus mensajes, bloqueos y denuncias.
-- Los archivos de fotos los borra la app antes, con la API de almacenamiento, porque Supabase
-- no deja borrarlos desde SQL.

create function public.delete_my_account()
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
  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

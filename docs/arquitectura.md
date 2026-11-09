# Arquitectura

**[Verificado 2026-11-09]** leyendo el código de la rama `claude/registro-perfil`. Cómo se organiza el código y por qué. Qué funciona hoy está en [estado-actual.md](estado-actual.md).

## Piezas

| Pieza | Qué hace |
|---|---|
| Next.js 16 (App Router, TypeScript, Tailwind 4) | Pantallas y servidor en un solo proyecto (D-6) |
| Supabase | Cuentas (correo con código), base de datos PostgreSQL con RLS y almacenamiento privado de fotos |
| `supabase/migrations/` | Única fuente del esquema de la base. Se aplica en orden |

## Mapa del código

| Archivo | Qué hace |
|---|---|
| `src/config/app.ts` | Nombre (provisional) y descripción de la app. Único lugar donde está el nombre |
| `src/lib/profile.ts` | Reglas del perfil sin dependencias: edad mínima, largos, opciones de género, fotos (2 a 6, JPG/PNG/WebP, 5 MB). Lo usan pantallas, servidor y pruebas |
| `src/lib/profile.test.ts` | Pruebas de esas reglas (Vitest) |
| `src/lib/supabase/config.ts` | Lee las variables de entorno y el nombre del bucket de fotos |
| `src/lib/supabase/client.ts` / `server.ts` | Cliente de Supabase para el navegador y para el servidor. `getUser()` da el usuario verificado |
| `src/proxy.ts` | Antes de cada página: renueva la sesión y manda a `/entrar` a quien entra a `/perfil` sin sesión |
| `src/app/page.tsx` | Portada con "Empezar" |
| `src/app/entrar/page.tsx` | Correo → código de 6 dígitos → sesión. Sirve para registrarse y para entrar |
| `src/app/perfil/` | Pantalla del perfil: `page.tsx` carga datos y fotos (enlaces firmados de 1 hora), `ProfileForm.tsx` es el formulario y sube o quita fotos, `actions.ts` guarda el perfil y cierra sesión |
| `src/app/manifest.ts` | Permite añadir la web a la pantalla de inicio del móvil |

## Base de datos

Migración `20261109000000_perfiles.sql`:

- `profiles`: una fila por usuario (`id` = id de `auth.users`). Nombre (1 a 40), fecha de nacimiento, descripción (hasta 500), `gender` (`mujer`, `hombre`, `no_binario`), `interested_in` (`hombres`, `mujeres`, `todos`) y `sensitive_data_consent_at` (cuándo dio el consentimiento del RGPD art. 9).
- `profile_photos`: ruta del archivo y orden. La ruta tiene que empezar con la carpeta del dueño.
- Bucket privado `profile-photos`: archivos en `<id del usuario>/<uuid>.<ext>`.
- Triggers: edad mínima 18 (y máxima 120) y máximo 6 fotos.
- RLS: cada usuario solo ve y cambia su perfil, sus fotos y sus archivos. Todavía **nadie** puede ver perfiles ajenos: eso llega con "Descubrir".
- Al borrar un usuario de `auth.users`, se borran su perfil y sus filas de fotos (los archivos del bucket no; ver P-11 en [pendientes.md](pendientes.md)).

**[Verificado 2026-11-09]** la migración se aplicó en un PostgreSQL 16 local con esquemas `auth` y `storage` simulados, y se comprobó: rechaza menores de 18, perfiles ajenos, una séptima foto, rutas de otra carpeta y archivos en la carpeta de otro, y otro usuario no ve ningún dato. Falta probarla en un proyecto real de Supabase.

## Reglas de arquitectura

1. Las reglas críticas van **en la base** (RLS, triggers, CHECK) además de en la app. La app ayuda con mensajes claros; la base es la que protege.
2. Las reglas de negocio puras van en `src/lib/` sin depender de Next ni de Supabase, con pruebas.
3. El esquema solo cambia con una migración nueva en `supabase/migrations/`; nunca editar una ya aplicada.

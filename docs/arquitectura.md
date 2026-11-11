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
| `src/config/app.ts` | Nombre (Zuvi, D-15) y descripción de la app. Único lugar donde está el nombre |
| `src/lib/profile.ts` | Reglas del perfil sin dependencias: edad mínima, largos, opciones de género, fotos (2 a 6, JPG/PNG/WebP, 5 MB). Lo usan pantallas, servidor y pruebas |
| `src/lib/profile.test.ts` | Pruebas de esas reglas (Vitest) |
| `src/lib/supabase/config.ts` | Lee las variables de entorno y el nombre del bucket de fotos |
| `src/lib/supabase/client.ts` / `server.ts` | Cliente de Supabase para el navegador y para el servidor. `getUser()` da el usuario verificado |
| `src/lib/discover.ts` | Reglas de Descubrir sin dependencias: rangos de edad y distancia, redondeo de la ubicación, texto de distancia y búsqueda de ciudades. Con pruebas en `discover.test.ts` |
| `src/data/ciudades-es.json` | Municipios de España con más de 1.000 habitantes: nombre, provincia, latitud y longitud (GeoNames, CC BY 4.0; ver D-12) |
| `src/proxy.ts` | Antes de cada página: renueva la sesión y manda a `/entrar` a quien entra a `/perfil` o `/descubrir` sin sesión |
| `src/app/page.tsx` | Portada con "Empezar" |
| `src/app/entrar/page.tsx` | Correo → código o enlace → sesión. Sirve para registrarse y para entrar. Después lleva a `/descubrir` |
| `src/app/descubrir/` | `page.tsx` manda al perfil si no existe, pide la ubicación si falta y si no muestra las tarjetas. `cards.ts` trae los perfiles (función `discover_profiles`) y firma sus fotos. `SwipeDeck.tsx` es el mazo (deslizar, botones, tocar para cambiar de foto). `actions.ts`: guardar ubicación, buscar ciudades, deslizar (dice si hubo coincidencia), pedir más perfiles |
| `src/app/coincidencias/page.tsx` | Lista de coincidencias (función `my_matches`) con la primera foto firmada y el último mensaje; cada una abre su chat |
| `src/app/chat/[id]/` | `page.tsx` comprueba que haya coincidencia y carga los últimos 200 mensajes; `ChatRoom.tsx` los muestra, envía (insert directo, protegido por RLS) y recibe los nuevos con Supabase Realtime |
| `src/lib/interests.ts` | Lista de aficiones por grupos (D-18), máximo 5, validación y orden para la tarjeta (las comunes primero). Pruebas en `interests.test.ts` |
| `src/lib/chat.ts` | Reglas del chat sin dependencias: largo máximo, orden de la pareja (`pairOf`). Pruebas en `chat.test.ts` |
| `src/components/` | `LocationSetter.tsx` (ubicación del móvil o ciudad) y `AppNav.tsx` (barra de abajo: Descubrir, Coincidencias y Perfil) |
| `src/app/perfil/` | Pantalla del perfil: `page.tsx` carga datos y fotos (enlaces firmados de 1 hora), `ProfileForm.tsx` es el formulario (fotos con su orden, datos, aficiones, qué perfiles quiere ver y ubicación), `actions.ts` guarda el perfil y cierra sesión |
| `src/app/manifest.ts` | Permite añadir la web a la pantalla de inicio del móvil |

## Base de datos

Migración `20261109000000_perfiles.sql`:

- `profiles`: una fila por usuario (`id` = id de `auth.users`). Nombre (1 a 40), fecha de nacimiento, descripción (hasta 500), `gender` (`mujer`, `hombre`, `no_binario`), `interested_in` (`hombres`, `mujeres`, `todos`) y `sensitive_data_consent_at` (cuándo dio el consentimiento del RGPD art. 9).
- `profile_photos`: ruta del archivo y orden. La ruta tiene que empezar con la carpeta del dueño.
- Bucket privado `profile-photos`: archivos en `<id del usuario>/<uuid>.<ext>`.
- Triggers: edad mínima 18 (y máxima 120) y máximo 6 fotos.
- RLS: cada usuario solo ve y cambia su perfil, sus fotos y sus archivos.
- Al borrar un usuario de `auth.users`, se borran en cascada su perfil, sus filas de fotos y todo lo que lo nombra. Los archivos del bucket no: los borra la app antes (ver la migración de borrar la cuenta).

**[Verificado 2026-11-09]** la migración se aplicó en un PostgreSQL 16 local con esquemas `auth` y `storage` simulados, y se comprobó: rechaza menores de 18, perfiles ajenos, una séptima foto, rutas de otra carpeta y archivos en la carpeta de otro, y otro usuario no ve ningún dato. Falta probarla en un proyecto real de Supabase.

Migración `20261109010000_descubrir.sql` (D-10, D-11, D-12):

- `profiles` suma `min_age`, `max_age`, `max_distance_km`, `lat`, `lon` y `location_updated_at`. Un trigger redondea la ubicación a 0,02 grados (unos 2 km) siempre.
- `can_see_profile(id)`: si la persona con sesión puede ver ese perfil (interés mutuo, edad, distancia, ubicación y 2 fotos). Con ella, RLS deja ver **las fotos y archivos** de esos perfiles. Las filas de `profiles` ajenas siguen sin poder leerse.
- `discover_profiles(n)`: hasta 20 perfiles visibles, del más cercano al más lejano, sin los que ya tienen "me gusta" ni "paso" de hace menos de 30 días. Devuelve solo nombre, edad, descripción, km enteros y rutas de fotos.
- `swipes`: un "me gusta" o "paso" por pareja. Solo se escribe con la función `swipe()`, que comprueba que el perfil sea visible y no pisa un "me gusta".

**[Verificado 2026-11-09]** en un PostgreSQL 16 local con `auth` y `storage` simulados: redondeo de la ubicación; filtros de género en las dos direcciones, edad, distancia y mínimo de fotos; "paso" que vuelve a los 30 días; "me gusta" que no se pisa; no se puede deslizar un perfil no visible ni escribir directo en `swipes`; las fotos ajenas solo se ven si el perfil es visible; un usuario sin sesión no puede llamar a las funciones.

Migración `20261109020000_coincidencias.sql`:

- `matches`: una fila por pareja (el id menor en `user_a`). Solo la ven sus dos personas; nadie la escribe directamente.
- `swipe()` ahora devuelve si se creó una coincidencia: cuando es "me gusta" y la otra persona ya había dado "me gusta". Usa un candado por pareja para que dos "me gusta" simultáneos no la pierdan.
- `can_see_profile()` también deja ver el perfil y las fotos de las propias coincidencias, aunque después cambien las preferencias de edad o distancia.
- `my_matches()`: las coincidencias propias con nombre, edad, primera foto y fecha.

**[Verificado 2026-11-09]** en el mismo PostgreSQL local: un "me gusta" sin respuesta no crea coincidencia; un "paso" tampoco; el segundo "me gusta" sí, una sola fila; las dos personas la ven en `my_matches`; las fotos se siguen viendo tras cambiar preferencias; un tercero no ve coincidencias ajenas ni puede crearlas; sin sesión no se puede llamar.

Migración `20261109030000_chat.sql`:

- `messages`: pertenece a una coincidencia (clave `user_a`, `user_b` hacia `matches`, se borra con ella). Texto de 1 a 1.000 caracteres.
- RLS: leen las dos personas de la coincidencia; escribe solo una de ellas, en nombre propio y si la coincidencia existe.
- Se agrega a la publicación `supabase_realtime` para recibir mensajes en tiempo real (Realtime respeta RLS).
- `my_matches()` suma el último mensaje y ordena por actividad.

**[Verificado 2026-11-09]** en el PostgreSQL local: escribir y leer entre la pareja; no se puede escribir en nombre del otro, sin coincidencia, en un chat ajeno ni un mensaje vacío; un tercero no ve mensajes; borrar la coincidencia borra los mensajes.

Migración `20261109040000_bloquear_denunciar.sql` (D-14):

- `blocks`: quién bloqueó a quién. Cada uno ve solo a quién bloqueó; nadie escribe directamente.
- `reports`: denuncias con motivo (`report_reason`), texto opcional de hasta 500 caracteres y `reviewed_at`, que completa quien revisa. Una por persona y perfil. RLS sin políticas: la app no las lee ni las escribe directamente.
- `can_see_profile()` excluye los bloqueos en las dos direcciones y los perfiles con 3 o más denuncias sin revisar de personas distintas. Las coincidencias existentes se siguen viendo.
- `block_user()` y `report_user()`: comprueban que se puede ver el perfil, guardan el bloqueo con el mismo candado por pareja que `swipe()` y borran la coincidencia (y el chat). `report_user()` además guarda la denuncia.

**[Verificado 2026-11-09]** en el PostgreSQL local: bloquear borra coincidencia y mensajes y repetirlo no falla; ninguno de los dos se ve en Descubrir ni ve las fotos del otro; quien fue bloqueado no ve el bloqueo ni puede deslizar; con 2 denuncias el perfil se sigue viendo y con 3 se oculta, y vuelve al marcarlas revisadas; repetir una denuncia no suma; nadie lee denuncias desde la app; motivos inválidos y textos largos se rechazan; sin sesión no se puede llamar.

Migración `20261109050000_borrar_cuenta.sql`:

- `delete_my_account()`: borra de `auth.users` al usuario con sesión, y con él en cascada su perfil, fotos, deslizamientos, coincidencias y mensajes, bloqueos y denuncias.
- La acción `deleteAccount` (`src/app/perfil/actions.ts`) primero borra los archivos de su carpeta con la API de almacenamiento (Supabase no deja borrarlos desde SQL), después llama a la función y cierra la sesión.

**[Verificado 2026-11-09]** en el PostgreSQL local: borra todo lo de esa persona y nada de las demás; sin sesión no se puede llamar.

Migración `20261111000000_superlike_aficiones_avisos.sql` (D-17, D-18, D-19):

- `profiles.interests`: claves de aficiones (lista en `src/lib/interests.ts`). La base comprueba formato, repetidas y máximo 5 (`valid_interests`).
- `swipes.super`: el "me gusta" fue un superlike. `superlike()` lo da (1 al día de la península, `superlikes_left()` dice cuántos quedan). `swipe()` y `superlike()` comparten la función interna `record_swipe()`.
- `discover_profiles()` suma `interests`, `shared_interests` y `superliked_me`, y pone primero a quien te dio superlike.
- `matches.a_seen_at` / `b_seen_at`: cuándo vio cada uno la coincidencia. `mark_match_seen()` la marca (la llama el chat al abrirse y con cada mensaje), `unread_matches_count()` alimenta el punto de `AppNav` y `my_matches()` suma `unread`.

**[Verificado 2026-11-11]** en el PostgreSQL local: aficiones de más, repetidas o con formato raro se rechazan; el segundo superlike del día y el superlike a quien ya te gusta se rechazan; quien recibe el superlike lo ve primero y marcado, con las aficiones comunes; la coincidencia queda vista para quien da el segundo "me gusta" y nueva para el otro; un mensaje propio no genera novedad y uno ajeno sí, hasta abrir el chat; nadie puede marcar vistas ajenas ni llamar a `record_swipe()`; sin sesión no se pueden llamar.

## Reglas de arquitectura

1. Las reglas críticas van **en la base** (RLS, triggers, CHECK) además de en la app. La app ayuda con mensajes claros; la base es la que protege.
2. Las reglas de negocio puras van en `src/lib/` sin depender de Next ni de Supabase, con pruebas.
3. El esquema solo cambia con una migración nueva en `supabase/migrations/`; nunca editar una ya aplicada.

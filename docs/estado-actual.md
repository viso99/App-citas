# Estado actual del código

Qué hay **realmente** en el repo. No es lo que el producto debe hacer: eso está en [producto.md](producto.md). Cómo está organizado el código: [arquitectura.md](arquitectura.md).

**[Verificado 2026-11-09]** en la rama `claude/coincidencias`: lint, typecheck, 20 pruebas y build pasan. La migración `20261109020000_coincidencias.sql` se probó en un PostgreSQL 16 local; **todavía no está aplicada en Supabase**. La migración `20261109010000_descubrir.sql` se probó en local y **[Verificado 2026-11-09]** está aplicada en Supabase (10 políticas en las tablas, 4 en el almacenamiento, 6 columnas nuevas en `profiles`, RLS en `swipes`, y las funciones no se pueden llamar sin sesión). **[Verificado 2026-11-09]** el proyecto de Supabase `app-citas` existe (región eu-west-1, Irlanda) y tiene aplicada la migración `20261109000000_perfiles.sql` (8 políticas en las tablas, 3 en el almacenamiento, bucket privado). **[Confirmado 2026-11-09]** Sergio probó en el celular, en https://app-citas-khaki.vercel.app, el registro con enlace y el perfil con fotos, y funcionó.

## Primera versión: qué está hecho

| Parte (de [producto.md](producto.md)) | Estado |
|---|---|
| 1. Registro y perfil | **Hecho y probado por Sergio en el celular.** Registro y entrada con correo (por ahora llega un enlace; el código llega cuando haya servicio de correo propio). Perfil con nombre, fecha de nacimiento (18+), descripción opcional, género, a quién quiere conocer, consentimiento y de 2 a 6 fotos privadas |
| 2. Descubrir y deslizar | **Publicado, sin probar con gente real.** Ubicación aproximada (móvil o ciudad), preferencias de edad y distancia, tarjetas con fotos, deslizar o botones de "me gusta" y "paso" |
| 3. Coincidencias | **Hecho en código (rama `claude/coincidencias`), sin probar con gente real.** Un "me gusta" mutuo crea la coincidencia: aviso "¡Es una coincidencia!" en Descubrir y pantalla `/coincidencias` con la lista (foto, nombre, edad y fecha). Todavía no se puede abrir un chat ni deshacer una coincidencia |
| 4. Chat | No empezado |
| 5. Bloquear y denunciar | No empezado |

## Límites conocidos

- El nombre "Citas" es provisional (P-1) y no hay ícono propio.
- No se puede borrar la cuenta desde la app todavía (regla 6 de [privacidad-y-legal.md](privacidad-y-legal.md)); ver P-11.
- Las fotos no se pueden reordenar: quedan en el orden en que se subieron.
- La coincidencia solo se avisa a quien da el segundo "me gusta" (en ese momento). La otra persona la ve en su lista, sin notificación.
- No se puede deshacer un "paso" ni un "me gusta".
- Los correos con código usan el envío de prueba de Supabase, con un límite muy bajo por hora.

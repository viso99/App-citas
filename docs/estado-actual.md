# Estado actual del código

Qué hay **realmente** en el repo. No es lo que el producto debe hacer: eso está en [producto.md](producto.md). Cómo está organizado el código: [arquitectura.md](arquitectura.md).

**[Verificado 2026-11-09]** en la rama `claude/descubrir`: lint, typecheck, 20 pruebas y build pasan. La migración `20261109010000_descubrir.sql` se probó en un PostgreSQL 16 local; **todavía no está aplicada en Supabase**. **[Verificado 2026-11-09]** el proyecto de Supabase `app-citas` existe (región eu-west-1, Irlanda) y tiene aplicada la migración `20261109000000_perfiles.sql` (8 políticas en las tablas, 3 en el almacenamiento, bucket privado). **[Confirmado 2026-11-09]** Sergio probó en el celular, en https://app-citas-khaki.vercel.app, el registro con enlace y el perfil con fotos, y funcionó.

## Primera versión: qué está hecho

| Parte (de [producto.md](producto.md)) | Estado |
|---|---|
| 1. Registro y perfil | **Hecho y probado por Sergio en el celular.** Registro y entrada con correo (por ahora llega un enlace; el código llega cuando haya servicio de correo propio). Perfil con nombre, fecha de nacimiento (18+), descripción opcional, género, a quién quiere conocer, consentimiento y de 2 a 6 fotos privadas |
| 2. Descubrir y deslizar | **Hecho en código (rama `claude/descubrir`), sin probar con gente real.** Ubicación aproximada (móvil o ciudad), preferencias de edad y distancia, tarjetas con fotos, deslizar o botones de "me gusta" y "paso". Los "me gusta" se guardan, pero todavía no generan coincidencias |
| 3. Coincidencias | No empezado |
| 4. Chat | No empezado |
| 5. Bloquear y denunciar | No empezado |

## Límites conocidos

- El nombre "Citas" es provisional (P-1) y no hay ícono propio.
- No se puede borrar la cuenta desde la app todavía (regla 6 de [privacidad-y-legal.md](privacidad-y-legal.md)); ver P-11.
- Las fotos no se pueden reordenar: quedan en el orden en que se subieron.
- Todavía no se avisa de las coincidencias: los "me gusta" mutuos se guardan y se usarán en la parte 3.
- No se puede deshacer un "paso" ni un "me gusta".
- Los correos con código usan el envío de prueba de Supabase, con un límite muy bajo por hora.

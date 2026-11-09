# Estado actual del código

Qué hay **realmente** en el repo. No es lo que el producto debe hacer: eso está en [producto.md](producto.md). Cómo está organizado el código: [arquitectura.md](arquitectura.md).

**[Verificado 2026-11-09]** en la rama `claude/registro-perfil`: lint, typecheck, 12 pruebas y build pasan. **No se probó todavía contra un proyecto real de Supabase** (no existe aún, ver [desarrollo.md](desarrollo.md)), así que registro, fotos y guardado no se vieron funcionar de punta a punta.

## Primera versión: qué está hecho

| Parte (de [producto.md](producto.md)) | Estado |
|---|---|
| 1. Registro y perfil | **Hecho en código, sin probar con Supabase real.** Registro y entrada con correo y código. Perfil con nombre, fecha de nacimiento (18+), descripción opcional, género, a quién quiere conocer, consentimiento y de 2 a 6 fotos privadas |
| 2. Descubrir y deslizar | No empezado |
| 3. Coincidencias | No empezado |
| 4. Chat | No empezado |
| 5. Bloquear y denunciar | No empezado |

## Límites conocidos

- El nombre "Citas" es provisional (P-1) y no hay ícono propio.
- No se puede borrar la cuenta desde la app todavía (regla 6 de [privacidad-y-legal.md](privacidad-y-legal.md)); ver P-11.
- Las fotos no se pueden reordenar: quedan en el orden en que se subieron.
- Al guardar el perfil no se lleva a ninguna otra pantalla, porque "Descubrir" no existe.
- Los correos con código usan el envío de prueba de Supabase, con un límite muy bajo por hora.

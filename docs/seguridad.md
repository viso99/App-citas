# Seguridad: qué protege a Zuvi y cómo se revisa

Qué defensas hay contra ataques, quién vigila y qué hallazgos se conocen. La privacidad y el RGPD están en [privacidad-y-legal.md](privacidad-y-legal.md); las decisiones, en D-43 ([decisiones-2.md](decisiones-2.md)).

**El repositorio es público** [Verificado 2026-11-19]: cualquiera puede leer el código. Por eso la protección real son las reglas de la base (RLS) y las claves secretas fuera del repo, no que el código sea secreto.

## Quién vigila (todo gratis)

| Vigilante | Qué hace | Dónde se ve |
|---|---|---|
| **Agente `seguridad`** (`.claude/agents/seguridad.md`) | Claude lo usa antes de abrir cada PR con código: revisa el cambio pensando como un atacante con una cuenta normal | En el PR (Claude resume lo que encontró) |
| **Revisión semanal** (tarea programada de Claude, domingos 10:13 hora de Madrid) | Pasa el agente por todo el repo. Si encuentra algo, abre un PR con el arreglo; si no, no hace nada | PRs nuevos en GitHub y aviso al móvil de Sergio |
| **CodeQL** (`.github/workflows/codeql.yml`) | Análisis automático de GitHub en cada PR y los domingos | Pestaña *Security* del repo |
| **Dependabot** (`.github/dependabot.yml`) | Los lunes abre PRs para actualizar librerías | PRs de `dependabot` |
| **`npm audit` en la CI** (`.github/workflows/ci.yml`) | Falla si una librería que llega a los usuarios tiene un fallo grave conocido | Checks del PR |

**Falta que Sergio active** (un clic cada uno, gratis) en [Settings → Code security](https://github.com/viso99/app-citas/settings/security_analysis): *Dependabot alerts*, *Dependabot security updates*, *Secret scanning* con *Push protection*, y *Private vulnerability reporting* (para que alguien que encuentre un fallo lo avise en privado). **[Supuesto]** pueden estar ya activas: no se ve desde aquí.

**Hallazgos graves y repo público:** un issue público contaría el fallo a todo el mundo antes de arreglarlo. La revisión semanal no abre issues: abre directamente el PR con el arreglo, con una descripción breve.

## Lo que ya está bien [Verificado 2026-11-19]

- Las 9 tablas tienen RLS. Las 3 carpetas de fotos (`profile-photos`, `chat-photos`, `verification-photos`) son privadas y limitadas por persona o por coincidencia.
- Todas las funciones `security definer` fijan `search_path` y no se pueden llamar sin sesión.
- La clave secreta de Supabase solo se usa en el servidor: en `/api/recordatorios`, protegida con `CRON_SECRET` (se compara sin dar pistas por el tiempo), y en `src/lib/supabase/sendPush.ts` para leer las direcciones de avisos (desde 2026-11-22, ver S-4).
- `.env*` está en `.gitignore` y no hay claves en el historial de git.
- Cabeceras de seguridad en `next.config.ts` (no se puede meter Zuvi en otra web, etc.).
- `npm audit`: 0 fallos conocidos (se actualizó `vitest` a la 5, que tenía uno crítico; solo se usa en las pruebas).

## Hallazgos arreglados

- **S-4 · media · Revisión semanal 2026-11-22 · Las direcciones de avisos del móvil de otra persona se podían leer.** Quien acababa de coincidir o escribir a alguien podía pedir con su sesión las direcciones de avisos del móvil de esa persona y después pasarlas a su cuenta: la otra dejaba de recibir sus avisos y podía recibir avisos no deseados aunque hubiera bloqueado. **Arreglo:** migración `20261122000000_avisos_solo_servidor.sql` (solo permisos y una función nueva, no toca datos): la sesión solo pregunta `can_notify()` (sí o no) y el servidor lee y limpia las direcciones con la clave secreta; `push_targets()` y `forget_push_endpoint()` quedan cerradas para las sesiones. Necesita `SUPABASE_SECRET_KEY` en Vercel: sin ella no salen avisos de coincidencias ni mensajes. [Verificado 2026-11-22] en PostgreSQL 16 local.

## Hallazgos conocidos (sin arreglar)


- **S-1 · baja · Modo viaje sin caducidad garantizada:** quien llame a Supabase directamente (sin la app) puede poner `profiles.travel_started_at` en el futuro para que el modo viaje no caduque a los 30 días, o poner unas coordenadas de viaje que no son de la lista de ciudades. Solo cambia dónde aparece esa misma persona. Arreglo propuesto: un disparador que ponga la fecha con `now()` y una comprobación de que la ciudad es de la lista. Necesita migración.
- **S-2 · baja · "Activo hace poco" se puede falsear:** la persona puede cambiar su propio `last_active_at`. Mismo tipo de arreglo.
- **S-5 · baja · "Está escribiendo" en un canal abierto:** el canal de Realtime del chat no es privado; alguien que conozca los dos ids podría ver cuándo se escriben o mandar avisos falsos de "escribiendo". Los mensajes no se ven (respetan RLS). Arreglo: canal privado con política en `realtime.messages`. Necesita migración.
- **S-6 · baja · Reacciones y borrados inventados al escribir:** al crear un mensaje directamente se pueden rellenar `a_reaction`, `b_reaction` o `deleted_at`. Arreglo: disparador que las vacíe al insertar. Necesita migración.
- **S-7 · baja · Denunciar borra las pruebas:** al denunciar se borran las fotos del chat y, al bloquear, los mensajes; quien revisa no los ve. Es una decisión de producto (qué guardar y cuánto tiempo, junto con S-3 de [pendientes.md](pendientes.md)).
- **S-8 · baja · Ocultar a alguien con tres cuentas:** tres denuncias ocultan un perfil hasta la revisión (D-14), y crear tres cuentas es fácil. Arreglo posible: contar solo cuentas con cierta antigüedad y avisar a quien revisa. Necesita migración.
- Mejoras opcionales: fijar las acciones de GitHub por su SHA, y una CSP que limite los scripts.

## Lista de revisión (la usa el agente)

La lista completa vive en el agente: `.claude/agents/seguridad.md`. Resumen: RLS y políticas de cada tabla, funciones `security definer`, Storage, acciones y rutas del servidor con `getUser()`, nada de HTML de usuarios, secretos fuera del repo, dependencias, cabeceras y datos personales nuevos.

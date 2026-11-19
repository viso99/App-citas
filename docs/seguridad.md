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
- La clave secreta de Supabase solo se usa en `/api/recordatorios` (servidor), protegida con `CRON_SECRET`, que ahora se compara sin dar pistas por el tiempo.
- `.env*` está en `.gitignore` y no hay claves en el historial de git.
- Cabeceras de seguridad en `next.config.ts` (no se puede meter Zuvi en otra web, etc.).
- `npm audit`: 0 fallos conocidos (se actualizó `vitest` a la 5, que tenía uno crítico; solo se usa en las pruebas).

## Hallazgos conocidos (sin arreglar)

- **S-1 · baja · Modo viaje sin caducidad garantizada:** quien llame a Supabase directamente (sin la app) puede poner `profiles.travel_started_at` en el futuro para que el modo viaje no caduque a los 30 días, o poner unas coordenadas de viaje que no son de la lista de ciudades. Solo cambia dónde aparece esa misma persona. Arreglo propuesto: un disparador que ponga la fecha con `now()` y una comprobación de que la ciudad es de la lista. Necesita migración.
- **S-2 · baja · "Activo hace poco" se puede falsear:** la persona puede cambiar su propio `last_active_at`. Mismo tipo de arreglo.

## Lista de revisión (la usa el agente)

La lista completa vive en el agente: `.claude/agents/seguridad.md`. Resumen: RLS y políticas de cada tabla, funciones `security definer`, Storage, acciones y rutas del servidor con `getUser()`, nada de HTML de usuarios, secretos fuera del repo, dependencias, cabeceras y datos personales nuevos.

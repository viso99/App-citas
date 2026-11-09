# CLAUDE.md: punto de entrada del proyecto

Leé este archivo entero al empezar cada sesión. Es corto a propósito: dice qué es el proyecto, qué reglas respetar y dónde está cada tema. El detalle vive en `docs/`.

## Qué es este proyecto (en 30 segundos)

- **Producto [Confirmado 2026-11-09]:** una app de citas al estilo de Tinder (ver perfiles, deslizar, coincidir y chatear), con **nombre, marca y diseño propios**. Es un **producto real** para lanzar con usuarios, empezando en **España**. Detalle en [docs/producto.md](docs/producto.md).
- **Plataforma [Confirmado 2026-11-09]:** **web pensada para el celular**, que se abre en el navegador y se puede agregar a la pantalla de inicio. Las apps de las tiendas quedan para después.
- **Primera versión [Confirmado 2026-11-09]:** registro de mayores de 18 y perfil con fotos, ver gente cercana y deslizar, coincidencia mutua, chat entre quienes coincidieron, y bloquear y denunciar. Nada más.
- **Tecnología (D-6):** Next.js 16 con TypeScript y Supabase (en la UE). **Next.js 16 cambió mucho:** leé `AGENTS.md` antes de escribir código de Next.
- **Estado del código:** registro y perfil con fotos funcionando (probado por Sergio). Descubrir publicado; coincidencias hechas en código. Chat y bloquear/denunciar no existen todavía. Ver [docs/estado-actual.md](docs/estado-actual.md).

## Mapa de la documentación

| Tema | Archivo | Cuándo leerlo |
|---|---|---|
| Qué se construye, para quién y qué entra en la primera versión | [docs/producto.md](docs/producto.md) | Antes de proponer o implementar cualquier funcionalidad |
| Qué hay realmente en el repo hoy | [docs/estado-actual.md](docs/estado-actual.md) | Antes de tocar código o de afirmar que algo existe |
| Cómo está organizado el código y la base de datos | [docs/arquitectura.md](docs/arquitectura.md) | Antes de agregar pantallas, tablas o reglas |
| Cómo correr, probar y configurar Supabase | [docs/desarrollo.md](docs/desarrollo.md) | Antes de compilar o verificar un cambio |
| Decisiones tomadas y por qué | [docs/decisiones.md](docs/decisiones.md) | Antes de cambiar rumbo, tecnología o alcance |
| Privacidad, edad y obligaciones legales (RGPD) | [docs/privacidad-y-legal.md](docs/privacidad-y-legal.md) | Antes de tocar registro, perfiles, fotos, ubicación, chat o datos de usuarios |
| Preguntas abiertas y supuestos | [docs/pendientes.md](docs/pendientes.md) | Antes de decidir algo que todavía no está cerrado |
| Vocabulario del proyecto | [docs/glosario.md](docs/glosario.md) | Al hablar con Sergio o escribir textos de la app |

## Cómo se clasifica la información

Toda afirmación en `docs/` lleva una de estas etiquetas:

- **[Verificado AAAA-MM-DD]:** comprobado leyendo el código o el historial de git en esa fecha.
- **[Confirmado AAAA-MM-DD]:** decisión o requisito que Sergio confirmó explícitamente.
- **[Supuesto]:** inferencia razonable que **todavía no se validó**. Vive en [docs/pendientes.md](docs/pendientes.md) hasta que se confirme o se descarte.

Si algo no tiene etiqueta, tratalo como supuesto.

## Reglas para evitar alucinaciones

1. **Consultá antes de decidir.** Antes de una decisión importante, leé el doc del tema. Si toca código, contrastalo con el código.
2. **No inventes.** No inventes funcionalidades, pantallas, endpoints, tablas, campos, relaciones ni reglas de negocio. Si no está en el código ni en `docs/`, no existe todavía.
3. **Actual ≠ objetivo.** Lo que el código hace hoy (`estado-actual.md`) no es lo mismo que lo que el producto debe hacer (`producto.md`). Un bug no es una regla de negocio, y un plan no es una funcionalidad hecha.
4. **No copies a Tinder.** "Como Tinder" describe el tipo de app, no el contenido: no uses su nombre, logo, colores, textos ni pantallas. Que Tinder haga algo no lo convierte en requisito.
5. **Contradicciones:** si `docs/` y el código no coinciden, o dos docs se contradicen, investigá primero. Si leyendo no se resuelve, preguntale a Sergio. No elijas una versión en silencio.
6. **Falta información:** si es una decisión de producto, preguntale a Sergio en lugar de asumir. Si tenés que avanzar igual, registrá el supuesto en `docs/pendientes.md` y avisale.
7. **Supuestos visibles:** nunca conviertas un [Supuesto] en [Confirmado] sin una respuesta explícita de Sergio.
8. **Legal no es opinión:** lo de `privacidad-y-legal.md` es una lista de trabajo, no asesoramiento legal. No le digas a Sergio que algo "cumple la ley" sin revisión de un profesional.

## Qué decidís solo y qué le preguntás a Sergio

[Confirmado 2026-11-09] (D-5 en [docs/decisiones.md](docs/decisiones.md)).

**Decidís vos, y le avisás en una línea qué elegiste:** lo técnico. Tecnologías, organización del código, base de datos, pruebas, crear ramas y abrir PRs para que él revise. Cada elección técnica importante se registra en `decisiones.md` con su porqué.

**Le preguntás siempre antes:**

- Qué hace la app y cómo se ve (funcionalidades, pantallas, textos, marca, nombre).
- Cualquier gasto de dinero (planes pagos, dominios, cuentas de desarrollador, servicios).
- Publicar o poner en internet cualquier cosa, y mergear un PR.
- Cualquier paso que no se pueda deshacer (borrar datos, cambios en producción).
- Cualquier cosa que toque datos de usuarios reales.

## Cómo trabajar con Sergio

- **Profundidad en el análisis, simplicidad en la comunicación.** Una respuesta larga no es una respuesta útil.
- Investigá todo lo posible antes de preguntar. No le preguntes lo que se puede averiguar leyendo el repo o los docs.
- Preguntas **de a una**, en lenguaje simple y sin tecnicismos innecesarios. Contexto en una o dos frases y **siempre una recomendación** con el porqué.
- Cuando necesites que intervenga: qué detectaste, qué tiene que decidir y qué le recomendás. Breve y conversacional.
- Con Sergio se habla en español. Los textos de la app van en **español de España** (ver [docs/glosario.md](docs/glosario.md)).

## Cómo mantener esta memoria

- Cuando cambie una decisión, una funcionalidad o una regla importante, actualizá el doc del tema **en el mismo PR** que el cambio.
- Una decisión nueva va a `docs/decisiones.md` con fecha, estado y porqué. Si reemplaza a otra, marcá la vieja como "reemplazada por D-N"; no la borres.
- Cuando se resuelva un pendiente, sacalo de `docs/pendientes.md` y llevalo a `decisiones.md` o al doc del tema.
- Cuando cambie el código, actualizá `docs/estado-actual.md` (y `docs/arquitectura.md` si cambia la estructura o la base) con la nueva fecha de verificación.
- Antes de abrir un PR con código: `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` tienen que pasar.
- Cada dato vive en **un solo lugar**: los demás docs lo enlazan, no lo copian. Este archivo solo resume y apunta.
- Si un doc pasa de ~150 líneas, dividilo por tema y sumalo al mapa de arriba.

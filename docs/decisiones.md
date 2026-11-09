# Registro de decisiones

Una entrada por decisión. No se borran: si una cambia, se marca como **reemplazada por D-N** y se agrega la nueva al final.

Formato: **ID · fecha · estado**, qué se decidió y por qué. Las decisiones técnicas las toma Claude (ver D-5) y se pueden revisar; las de producto son de Sergio.

---

**D-1 · 2026-11-09 · vigente**
Se construye una **app de citas al estilo de Tinder**, con nombre, marca y diseño propios.
*Por qué:* pedido de Sergio.

**D-2 · 2026-11-09 · vigente**
Es un **producto real** para lanzar con usuarios, no un proyecto para aprender ni de portfolio. Se empieza chico (Sergio y conocidos), pero construyendo pensando en usuarios reales.
*Por qué:* Sergio eligió "producto real" ante la recomendación de construir para usuarios reales desde el inicio, así no hay que rehacer la base. Consecuencia: verificación de mayoría de edad, protección de fotos y datos, bloqueo y denuncia desde la primera versión.

**D-3 · 2026-11-09 · vigente**
Se empieza con una **web pensada para el celular**, no con apps de las tiendas.
*Por qué:* Sergio eligió la opción recomendada: se puede probar en días, sin esperar la aprobación de las tiendas ni pagar cuentas de desarrollador, y después se puede llevar a las tiendas reutilizando gran parte.

**D-4 · 2026-11-09 · vigente**
Se lanza primero en **España**, y la **primera versión** tiene solo: registro de mayores de 18 y perfil con fotos, descubrir gente cercana deslizando, coincidencia mutua, chat entre quienes coincidieron, y bloquear y denunciar.
*Por qué:* Sergio eligió España. Se recomendó un solo país porque una app de citas necesita gente cerca entre sí. Sergio aprobó el alcance mínimo propuesto: es lo justo para probar con gente real; pagos, "superlikes" y videollamadas quedan para después.

**D-5 · 2026-11-09 · vigente**
**Claude decide lo técnico** y le avisa a Sergio qué eligió. Sergio decide siempre: qué hace la app y cómo se ve, cualquier gasto, publicar y mergear, pasos que no se pueden deshacer y todo lo que toque datos de usuarios reales. La lista completa está en [CLAUDE.md](../CLAUDE.md).
*Por qué:* Sergio eligió la opción recomendada, para avanzar más rápido y concentrarse en las decisiones de producto.

**D-6 · 2026-11-09 · vigente (decisión técnica, se puede revisar)**
Tecnología de partida:
- **Next.js con TypeScript** para la web (una sola base de código para pantallas y servidor), instalable en el celular como web app (PWA).
- **Supabase** como servicio de base de datos (PostgreSQL), usuarios e inicio de sesión, almacenamiento de fotos y mensajes en tiempo real para el chat, **en una región de la Unión Europea**.
- Búsqueda por cercanía con **PostGIS** (extensión de PostgreSQL), guardando la ubicación aproximada, no la exacta.

*Por qué:* cubre con pocas piezas lo que pide la primera versión (cuentas, fotos, cercanía, chat en tiempo real) y es muy usado y documentado. Alojar los datos en la UE simplifica el RGPD ([privacidad-y-legal.md](privacidad-y-legal.md)). Next.js deja abierta la puerta a una app de tiendas más adelante (por ejemplo, con React Native) reutilizando lógica. Se arranca con los planes gratuitos: **pasar a un plan pago lo decide Sergio** (D-5).
*Estado:* todavía no se instaló nada ([estado-actual.md](estado-actual.md)). Si al empezar el código aparece una razón fuerte para cambiar algo, se registra como decisión nueva y se le avisa a Sergio.

**D-7 · 2026-11-09 · vigente**
La gente se registra y entra **con su correo, recibiendo un código** para confirmarlo. Sin contraseña.
*Por qué:* Sergio eligió la opción recomendada: es gratis y funciona para todos. Google y Apple pueden sumarse después como atajo, y el teléfono (SMS, con costo) cuando haya más usuarios.
Detalles técnicos (se pueden revisar): Supabase Auth con código de un solo uso (`signInWithOtp` + `verifyOtp`); la misma pantalla `/entrar` sirve para registrarse y para entrar.

**D-8 · 2026-11-09 · vigente**
El perfil lleva solo: **nombre de pila, fecha de nacimiento** (para mostrar la edad y frenar a menores), **de 2 a 6 fotos**, **descripción corta opcional**, **género** y **a quién quiere conocer** (hombres, mujeres o todos).
*Por qué:* Sergio aprobó el mínimo propuesto: cada dato extra es más que proteger por el RGPD y más pasos antes de usar la app. Intereses, altura, trabajo, etc. se suman si los usuarios lo piden.
Detalles técnicos (se pueden revisar): nombre de 1 a 40 caracteres, descripción hasta 500, fotos JPG, PNG o WebP de hasta 5 MB en almacenamiento privado. Antes de guardar género y preferencia se pide consentimiento explícito (RGPD art. 9) y se guarda cuándo se dio. Las reglas críticas también están en la base de datos ([arquitectura.md](arquitectura.md)).

**D-9 · 2026-11-09 · vigente**
Las opciones de género del perfil son **Mujer, Hombre y No binario** (antes supuesto S-3).
*Por qué:* Sergio dijo que personalmente no está de acuerdo con la opción "No binario", pero aceptó dejarla si funciona mejor para el producto. Se le recomendó dejarla porque es lo habitual en las apps de citas en España, no cambia nada para quien no la elige (cada persona solo ve a quien eligió conocer) y sacarla puede traer quejas y malas reseñas al empezar. Se puede revisar si Sergio lo pide.

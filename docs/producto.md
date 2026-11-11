# Producto: app de citas

Qué se quiere construir. Las decisiones y su porqué están en [decisiones.md](decisiones.md); lo que falta definir, en [pendientes.md](pendientes.md).

## Visión

**[Confirmado 2026-11-09]** Una app de citas del estilo de Tinder: la persona ve perfiles de gente cercana, indica si le gusta o no, y cuando a dos personas se gustan mutuamente pueden chatear.

Tiene **nombre, marca y diseño propios**. "Como Tinder" describe el tipo de app, no algo a copiar. El nombre todavía no está decidido ([pendientes.md](pendientes.md)).

## Para quién

- **[Confirmado 2026-11-09]** Es un **producto real**, para lanzar con usuarios reales. Al principio la prueban Sergio y personas conocidas, pero se construye desde el inicio pensando en usuarios reales (seguridad, privacidad, moderación).
- **[Confirmado 2026-11-09]** Solo **mayores de 18 años**.
- **[Confirmado 2026-11-09]** Se lanza primero en **España**. Consecuencias: cumplir el RGPD ([privacidad-y-legal.md](privacidad-y-legal.md)) y textos en español de España.

## Plataforma

**[Confirmado 2026-11-09]** **Web pensada para el celular**: se abre en el navegador y se puede agregar a la pantalla de inicio. Tiene que verse y usarse bien primero en el celular; en la computadora, que funcione. Las apps de Play Store y App Store quedan para después, si la web funciona.

## Primera versión

**[Confirmado 2026-11-09]** Entra solo esto:

1. **Registro y perfil:** solo mayores de 18. Perfil con fotos.
2. **Descubrir:** ver perfiles de gente cercana, uno por vez, y deslizar: "me gusta" o "paso".
3. **Coincidencia:** se crea cuando las dos personas se dieron "me gusta".
4. **Chat:** solo entre personas que coincidieron.
5. **Seguridad:** bloquear y denunciar perfiles.

**[Confirmado 2026-11-09]** Fuera de la primera versión: pagos y suscripciones, "superlikes", videollamadas y cualquier otra función. Se suman después según lo que digan los usuarios, y solo con el visto bueno de Sergio.

## Después de la primera versión

**[Confirmado 2026-11-11]** Sergio pidió sumar estos extras, todos gratis y sin pagos. Además aprobó una lista de 10 más (control, chat, perfil y avisos en el móvil), que se van haciendo por grupos:

1. **Superlike** (D-17): un "me gusta" especial, **1 al día**. Quien lo recibe ve esa tarjeta antes que las demás y marcada con "Te ha dado un superlike".
2. **Aficiones** (D-18): al hacer el perfil se eligen **hasta 5 de una lista amplia** (unas 60, por grupos). Son opcionales. Se ven en la tarjeta y se destacan las que tenéis en común.
3. **Aviso de novedades** (D-19): un punto en "Coincidencias" cuando hay una coincidencia nueva o un mensaje sin leer, y la etiqueta "Nuevo" en cada una.
4. **Ordenar las fotos** (D-20): en el perfil, cada foto tiene flechas para moverla, y la primera, marcada "Principal", es la que se ve primero en la tarjeta y en Coincidencias.
5. **Control** (D-21): deshacer el último "paso", ver y quitar bloqueos (en Perfil) y deshacer una coincidencia (en el chat).
6. **Chat** (D-22): "Leído" o "Enviado" bajo tu último mensaje, "<nombre> está escribiendo…" y enviar fotos.
7. **Perfil más completo** (D-23): datos opcionales (altura, trabajo, estudios, tabaco, alcohol, hijos), hasta 3 preguntas con respuesta corta, filtros en Descubrir (no fuma, quiere hijos, verificado) y perfil verificado con un selfie que revisa Sergio.
8. **Avisos en el móvil** (D-24): cada persona puede activarlos en Perfil; avisan de coincidencias y mensajes nuevos sin enseñar nombres ni mensajes.

**[Confirmado 2026-11-11]** Y una segunda lista de 10 (D-25 a D-34), todas gratis:

9. **Les gustas:** ver quién te dio "me gusta" y contestar.
10. **Me gusta con mensaje:** un texto corto que la otra persona ve en tu tarjeta y que abre el chat si coincidís.
11. **Pausar mi perfil:** dejar de salir en Descubrir sin borrar nada.
12. **Activo hace poco:** en la tarjeta, si la persona usó la app en las últimas 24 horas.
13. **Ideas para el primer mensaje** en un chat vacío.
14. **Notas de voz** en el chat, hasta 1 minuto.
15. **Reacciones** a mensajes con un emoji.
16. **Borrar un mensaje** propio para los dos.
17. **Ver mi perfil como lo ven los demás.**
18. **Bienvenida** de 3 pantallas al entrar por primera vez, con consejos de seguridad.

**[Confirmado 2026-11-11]** Y una tercera lista de 7 (D-36 a D-42), todas gratis. Sergio quitó la videollamada:

19. **Qué buscas**, opcional y sin opciones sobre sexo, con filtro "Solo quien busca lo mismo que yo".
20. **Responder a un mensaje concreto** en el chat, citándolo.
21. **Compartir mi cita** con alguien de confianza: con quién, dónde y cuándo.
22. **Modo viaje:** ver gente de otra ciudad de España antes de ir.
23. **Idiomas, mascotas y signo** en el perfil.
24. **Recordatorio de chats parados** en el móvil.
25. **Descargar mis datos.**

**[Confirmado 2026-11-09]** Registro con correo y código (D-7). El perfil lleva nombre de pila, fecha de nacimiento, de 2 a 6 fotos, descripción corta opcional, género y a quién quiere conocer (D-8).

Los demás detalles (a qué distancia, a quién se le muestra cada perfil, cómo se verifica la edad, qué pasa al bloquear o denunciar) **no están definidos**. Están en [pendientes.md](pendientes.md). No los inventes: preguntale a Sergio o registralos como supuesto.

# Privacidad, edad y obligaciones legales

> ⚠️ Esta página es una **lista de trabajo** para no olvidar temas, **no es asesoramiento legal**. Antes de abrir la app a usuarios fuera del círculo de prueba, tiene que revisarla un profesional (pendiente P-9 en [pendientes.md](pendientes.md)). No le digas a Sergio que algo "cumple la ley" sin esa revisión.

## Lo que está confirmado

- **[Confirmado 2026-11-09]** La app se lanza en **España** y es **solo para mayores de 18** ([decisiones.md](decisiones.md), D-2 y D-4).
- **[Confirmado 2026-11-09]** Es un producto real: se construye desde el inicio con privacidad y seguridad en mente, no como un agregado posterior.

## Marco que aplica (conocimiento general, a validar con un profesional)

- **RGPD** (Reglamento General de Protección de Datos de la UE) y la **LOPDGDD** española. El organismo de control en España es la **AEPD**.
- En una app de citas, la **orientación sexual y la vida sexual** son "categorías especiales" de datos (artículo 9 del RGPD): necesitan consentimiento explícito y más protección. Las preferencias de a quién se quiere conocer y el uso mismo de la app pueden revelarlas.
- Al permitir que los usuarios publiquen contenido y denuncien perfiles, también puede aplicar la normativa europea de servicios digitales (DSA) en lo que toca a denuncias y moderación. **[Supuesto]**: a confirmar con el profesional.

## Reglas de diseño que se siguen desde la primera versión

Son decisiones técnicas tomadas por Claude (D-5), coherentes con lo de arriba. Se pueden revisar:

1. **Datos en la UE:** base de datos y fotos alojadas en una región de la Unión Europea (D-6).
2. **Mínimos datos:** no se pide ni se guarda nada que la primera versión no use. Cada dato nuevo del perfil se justifica. Las aficiones (D-18) son opcionales, de una lista fija, y la lista no incluye religión, política ni salud para no pedir datos de categoría especial.
3. **Ubicación aproximada:** se guarda una ubicación redondeada a unos 2 km (lo hace la base, no solo la app) y a otros usuarios solo se les muestra la distancia en km enteros, nunca la posición ni menos de 2 km (D-12). Quien no quiere compartir la ubicación del móvil puede elegir su ciudad.
4. **Mayoría de edad:** se pide la fecha de nacimiento al registrarse y se rechaza a menores de 18. Cómo se verifica de verdad está pendiente (P-4).
5. **Consentimiento explícito** para los datos sensibles (orientación, preferencias), separado de la aceptación de condiciones.
6. **Borrar la cuenta borra los datos:** la persona puede eliminar su cuenta y sus datos desde la app (en Perfil, "Eliminar mi cuenta"). Se borran los archivos de fotos y, en cascada, todo lo demás. Qué pasa con las denuncias: S-3 en [pendientes.md](pendientes.md).
7. **Fotos privadas por defecto en el almacenamiento:** solo las ve un usuario que tiene permiso de verlas, no cualquiera con el enlace.
8. **Chat privado:** solo lo leen las dos personas que coincidieron. Las reglas de acceso se aplican en la base de datos, no solo en la pantalla.
9. **Bloquear** corta todo contacto en las dos direcciones. **Denunciar** guarda la denuncia para revisión y bloquea (D-14). Las denuncias no se ven desde la app: solo quien revisa, en Supabase.

## Antes de abrir la app a usuarios reales

Pendientes en [pendientes.md](pendientes.md): política de privacidad y condiciones de uso, revisión legal profesional, en qué plazo se revisan las denuncias, y cómo se verifica la edad.

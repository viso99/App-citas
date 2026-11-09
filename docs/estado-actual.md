# Estado actual del código

Qué hay **realmente** en el repo. No es lo que el producto debe hacer: eso está en [producto.md](producto.md).

**[Verificado 2026-11-09]** leyendo el repo `viso99/App-citas`:

- El repo tiene un solo commit ("Initial commit") con un `README.md` que solo dice `# App-citas`.
- Además están esta documentación (`CLAUDE.md` y `docs/`).
- **No hay código.** No existe todavía ninguna pantalla, base de datos, tabla, endpoint, función, prueba ni configuración de compilación o despliegue.
- La tecnología elegida está en [decisiones.md](decisiones.md) (D-6), pero todavía no se instaló ni se configuró nada.

## Cómo actualizar este archivo

Cada PR que agregue o cambie código actualiza esta página: qué módulos hay, qué hace cada uno, qué funcionalidades de la primera versión ya funcionan y cómo se verificó, con la fecha. Si crece, pasá el detalle técnico a `docs/arquitectura.md` y dejá acá el resumen.

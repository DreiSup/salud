# salud

Registro crudo de lo que come y bebe Ysst, para integrarlo después en Higía (`DreiSup/HIGIA`). Contexto del proyecto en `docs/exportacion-2026-10-25.md`.

Fase de recogida de datos (60-90 días) sin intervenir: no valores ni aconsejes sobre la dieta salvo que se pida. Restricciones a vigilar: gluten y lactosa.

- **Registrar comidas y dar de alta alimentos**: skill `registrar-comida` (`.claude/skills/registrar-comida/SKILL.md`).
- **Modelo de datos**: `docs/modelo-de-datos.md`. Manda sobre cualquier otro documento.
- **Datos**: tablas CSV en `datos/`. Se escriben solo con `scripts/salud.py`, que valida antes de guardar.
- **Antes de cada commit**: `python scripts/salud.py validar` debe dar 0 errores.
- **Huecos y datos por confirmar**: `pendientes.md`. Si llega un dato pendiente, corrígelo y táchalo.
- Los archivos temporales (JSON de entrada) van en `.tmp/`, que no se sube.

# web

Panel de solo lectura de la alimentación de Ysst. Diseño de Claude Design (encargo en `docs/prompt-claude-design.md`); decisiones en `docs/log-decisiones.md`.

- **Datos**: `lib/cargar.ts` lee `../datos/*.csv`, `../pendientes.md` y `../datos/metas.csv` en el build. La página es estática; cada push a `main` la vuelve a publicar.
- **Cálculos**: `lib/calculo.ts` es un port de `scripts/salud.py`. `tests/paridad.test.ts` compara los totales de todos los días con los de `salud.py` (necesita `python3`).
- **Fecha de hoy**: se calcula en el navegador con la zona de Madrid, no en el build.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # paridad con salud.py
npm run typecheck
npm run build      # genera out/
```

Vercel: proyecto con *Root Directory* `web` (y la opción por defecto de incluir los archivos de fuera de esa carpeta, porque el build lee `../datos`).

# Log de decisiones

Decisiones y contexto que una sesión nueva necesita para no empezar de cero. Entradas por fecha, la más reciente arriba. Al tomar una decisión, añádela aquí en la misma sesión.

Lo que ya está en `CLAUDE.md`, `docs/modelo-de-datos.md` o la skill `registrar-comida` no se repite: aquí va el porqué y lo que aún no tiene sitio fijo.

---

## 2026-10-26 · Web de consulta (`web/`)

**Estado:** decidido el planteamiento; el diseño de Claude Design está pendiente de recibir. No hay código todavía.

### Qué es

- Un panel **de solo lectura** para consultar lo que come Ysst sin esfuerzo. Es un MVP para crear el hábito; Higía completa se hará más adelante (necesita una semana de foco que ahora no hay).
- El registro **no** se hace en la web: Ysst habla con Claude (Claude Code en la nube, desde el móvil), Claude calcula y escribe los CSV con `salud.py` y los sube a `main`. La web solo lee.
- No hace falta MCP ni conector: el flujo de registro ya funciona con Claude Code. Un MCP solo tendría sentido para registrar desde el chat normal de claude.ai.
- Sin consejos ni valoraciones en la interfaz (fase de recogida de datos). Los colores informan de las metas que fija Ysst; no juzgan.

### Tecnología

- Código en este repo, carpeta `web/`.
- Next.js con exportación estática, Tailwind, shadcn/ui y Recharts. Es el stack previsto para Higía (`docs/exportacion-2026-10-25.md`), así los componentes se pueden reutilizar.
- Sin backend ni base de datos: la web lee los CSV de `datos/`.
- **Los cálculos se portan de `scripts/salud.py`** (lotes, `comestible_pct`, `bruto`, `item_valores`, desconocido ≠ 0, cobertura parcial) con un **test de paridad** que compare los totales de la web con los de `salud.py` en todos los días. Una sola verdad para los números.
- **Hosting: Vercel** (Ysst lo prefiere de momento; ya está conectado). Cada push a `main` redespliega: una comida registrada debe verse en 1-2 minutos.
- Desarrollo en la rama `claude/nice-allen-r5n2vi`. Se sube a `main` cuando el código esté listo. Los registros de comidas siguen yendo a `main` directamente, como siempre.

### Metas

- Nuevo archivo `datos/metas.csv`, con fecha de inicio por meta, para conservar el historial: cada día se evalúa con la meta vigente ese día. Ysst las cambia pidiéndoselo a Claude.
- Rangos iniciales (desde 2026-10-26):

| Nutriente | Rango | Origen |
|---|---|---|
| Energía | 1.800–2.200 kcal | Ysst |
| Proteína | 150–200 g | Ysst |
| Hidratos disponibles | 130–250 g | Claude: encaja con las kcal y la proteína de Ysst (los 45-60 % de la EFSA no cuadran con esa proteína) |
| Grasa | 45–85 g | EFSA, 20-35 % de la energía a ~2.000 kcal |
| Saturadas | máx. 22 g | OMS, <10 % de la energía |
| Azúcares | máx. 90 g | Ingesta de referencia UE (azúcares totales) |
| Fibra | mín. 25 g | EFSA |
| Sal | máx. 5 g | OMS |
| Cafeína | máx. 400 mg | EFSA |

### Semáforo

Con el valor central, no con la banda de error:

- **Neutro:** por debajo del mínimo. Un día cerrado por debajo del mínimo sigue neutro, sin marca.
- **Verde:** dentro del rango.
- **Amarillo:** rozando el tope, entre el 95 % y el 105 % del máximo (margen ±5 % aceptado por Ysst).
- **Rojo:** por encima del 105 % del máximo.
- En kcal y proteína el aviso es muy visible; en el resto, discreto.

### Pantallas y uso

- Ysst la mira sobre todo al acabar el día y antes de la 3.ª comida. Hace 3 comidas al día: mostrar «te quedan N comidas, entre A y B kcal y C-D g de proteína por comida».
- Pantallas: **Día** (principal; flechas entre días; resumen con kcal y proteína protagonistas; registro con ingredientes desplegables), **Semana** (como un calendario sin horas: comidas y totales por día), **Mes** (calendario), **Tendencias** (kcal y proteína por día frente a la banda de la meta; 7/30/90 días), **Metas** (solo lectura, con historial).
- Mostrar: banda de error discreta, totales incompletos como «≥ X g · falta dato en N comidas», avisos de gluten y lactosa, estado del día, zona discreta de pendientes.
- Escritorio (uso principal ahora) y móvil. Modo claro y oscuro. Español. Estilo minimalista tipo Apple (Salud, Fitness).
- Claude Design entrega variantes del resumen del día y de las gráficas; Ysst elige.
- El encargo completo que se pasó a Claude Design está en `docs/prompt-claude-design.md`.

---

## 2026-10-26 · Registro desde la libreta de papel

Ysst pasó a mano las comidas de septiembre y octubre que tenía en una libreta (del 18/09 al 22/10). Criterios:

- `origen = libreta`. Aproximado a propósito: Ysst no quiere que se le pregunten marcas ni detalles.
- Hora nominal por orden: 1.ª 10:00, 2.ª 15:30, 3.ª 19:00, 4.ª 21:30. Ysst no quiere apuntar horas reales.
- Día con 3 comidas o más → `completo`; con menos → `parcial` («solo N comidas apuntadas»), para no contar días a medias en las medias.
- Si el día ya existía en la exportación del 25/10, **no se duplica**: se añaden solo las comidas que faltan y las diferencias van a `pendientes.md`.
- Convenciones deducidas:
  - **Tortilla «lo de siempre»:** 4 huevos camperos L, 120 g de carne picada en crudo, 20 g de mozzarella rallada y 20 g de aceite. Si la libreta dice otra carne o queso, se cambia solo eso.
  - **Cacahuetes:** en septiembre, Collaret pelados; en octubre, los de cáscara de Family Cash, pesados con cáscara (`bruto`), como en la exportación.
  - **Carne picada en octubre:** la de Family Cash.
  - «Comida carne» = la tanda de carne picada con cebolla y pimientos vigente (`lote-carne-pimientos-2026-09`, `-2026-10`, `lote-carne-calabacin-2026-10` desde el 18/10).
  - Platos sin receta (lentejas, pollo al curry, ensalada de patata, chocolate casero) → tandas con receta nominal declarada en `notas`.
- Las molestias digestivas que Ysst menciona (la mañana del 17/10 y del 23/10) se apuntan en las notas del día en que comió (16/10 y 22/10), para el futuro módulo de resultados.

### Acceso a fuentes desde la nube

- Desde estas sesiones **no hay acceso** a USDA, BEDCA, OpenFoodFacts ni a las webs de los supermercados (el proxy los rechaza). `WebSearch` sí funciona; `WebFetch` no.
- Los valores puestos de memoria o leídos en resúmenes de búsqueda están marcados en la fuente y listados en `pendientes.md` para contrastarlos.

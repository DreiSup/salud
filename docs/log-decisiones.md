# Log de decisiones

Decisiones y contexto que una sesión nueva necesita para no empezar de cero. Entradas por fecha, la más reciente arriba. Al tomar una decisión, añádela aquí en la misma sesión.

Lo que ya está en `CLAUDE.md`, `docs/modelo-de-datos.md` o la skill `registrar-comida` no se repite: aquí va el porqué y lo que aún no tiene sitio fijo.

---

## 2026-10-26 · Web: vista «Año» (mosaico tipo GitHub)

- **Diseño:** prototipo `Alimentación v3` de Claude Design; solo se porta la pestaña nueva «Año» (`web/components/VistaAnio.tsx`). El resto del panel no cambia, salvo lo mínimo para enlazarla: pestaña en `Panel.tsx`, barra de pestañas del móvil a 6 columnas y URL `#/anio` (último año) o `#/anio/2026`.
- **Color:** selector con las cuatro opciones del encargo (Registro, Energía, Proteína, En meta). Por defecto **Registro**, la que recomendaba el diseño: ahora lo que se construye es el hábito de registrar.
- **Móvil:** variante recomendada, scroll horizontal anclado en la semana actual, con «lun / mié / vie» fijos a la izquierda. Las otras dos («últimos 6 meses» y «vertical») están en el prototipo por si Ysst las pide.
- **Días sin cerrar** (sin fila en `dias.csv` y anteriores a hoy): con trama, como los parciales; la leyenda dice «Parcial, sin cerrar o total incompleto». Hoy lleva borde azul esté o no cerrado.
- **Rachas:** días seguidos con al menos una comida; la actual cuenta desde hoy, o desde ayer si hoy aún no hay nada.

---

## 2026-10-26 · Web: implementación del diseño de Claude Design

**Estado:** en `main` (commit `3d7ffb9`) y publicada en Vercel. Ysst creó el proyecto a mano desde vercel.com/new (Root Directory `web`): el conector de Vercel de las sesiones no identifica su cuenta («User not found»), así que desde aquí no se puede gestionar el proyecto. Cada push a `main` la vuelve a publicar.

- **Diseño:** prototipo de Claude Design (`Alimentación v2`), portado pantalla a pantalla con sus tokens de color, tipografía y medidas. Se quita la barra de «revisión de variantes» del prototipo.
- **Variantes elegidas** (las que el diseño recomendaba; Ysst aún no ha elegido): resumen del día **«Números»** (cifra grande con barra por bloques, uno por comida) y tendencias **«Barras»**. Las otras («Barras con rango» y «Anillos»; «Línea» y «Margen de error») están en el prototipo y se pueden portar si las pide.
- **Cambio sobre lo acordado:** ni Tailwind, ni shadcn/ui, ni Recharts. El diseño es CSS propio (tokens tipo Apple) y las gráficas son barras simples con franjas y trama; esas librerías no aportaban nada y añadían dependencias. Next.js 15 con exportación estática y TypeScript.
- **Datos en el build**, no en el navegador: `web/lib/cargar.ts` lee `datos/` y `pendientes.md` y la página sale ya calculada. Sin backend, sin llamadas a GitHub. La fecha de «hoy» sí se calcula en el navegador (Madrid). La cabecera dice «Datos de las HH:MM» (hora del build).
- **Una sola verdad para los números:** `web/lib/calculo.ts` es un port de `salud.py` y `web/tests/paridad.test.ts` compara los totales, la cobertura y la banda de error de las kcal de todos los días (41 días el 26/10, todos iguales). La banda de error de la proteína se calcula con el mismo método que la de las kcal (salud.py no la muestra).
- **Metas:** `datos/metas.csv`, nueva tabla de `salud.py` (comandos `meta` y `metas`, validada). Vigentes **desde el 11/08/2026**, el primer día con datos, para que el historial también tenga colores.
- **Estados del día:** sin cierre y hoy → «Abierto» (y «te quedan N comidas»); sin cierre y pasado → «Sin cerrar».
- **Lactosa:** casi ningún alimento tiene el dato. Si una comida lleva un lácteo (alérgeno leche, o nombre de queso, yogur, kéfir…) sin dato de lactosa, se marca «Lácteo · lactosa sin dato» en vez de no decir nada.
- **Pendientes:** se leen de `pendientes.md` (solo los `- [ ]`). En cada día se muestran los que mencionan esa fecha en formato dd/mm; por eso en `pendientes.md` conviene no escribir fechas dd/mm que no sean de comidas.
- **URL:** la vista y la fecha van en el hash (`#/dia/2026-10-22`, `#/mes/2026-10`, `#/tendencias/30`), para recargar o compartir sin perderlas.
- **Vercel:** *Root Directory* `web`, con los archivos de fuera de esa carpeta incluidos en el build (lee `../datos`).

---

## 2026-10-26 · Web de consulta (`web/`)

**Estado:** decidido el planteamiento (la implementación está en la entrada de arriba).

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

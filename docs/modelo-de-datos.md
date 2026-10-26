# Modelo de datos

Base de todo el registro: qué se documenta de cada alimento y de cada consumo, y por qué. Los datos viven en tablas CSV (`datos/`) que son ya las tablas de la futura base de datos de Higía.

## Principios

1. **Guardar la fuente original, no solo los números.** Foto de la etiqueta, o la tabla copiada de la web con su enlace. De ahí se puede sacar en el futuro lo que hoy no se pide.
2. **Lo irrecuperable se registra bien hoy.** Qué, cuánto, cuándo y cómo se midió no se puede reconstruir. La composición de un alimento sí se puede completar más tarde.
3. **Catálogo completo, registro diario mínimo.** Documentar un alimento se hace una vez y lo hace Claude. Apuntar lo que comes se hace cada día y lo haces tú: ahí está la fricción, y ahí hay que pedir lo mínimo.
4. **Desconocido ≠ 0 ≠ trazas.** Un valor que no se sabe no se escribe. Nunca se rellena con 0.
5. **Cada número dice de dónde sale.** La fuente se indica por valor, no por alimento.
6. **Nada entra sin validar.** Los CSV se escriben con `scripts/salud.py`, que comprueba todo y no guarda nada si hay un error.

## Decisiones

| # | Decisión | Elegido |
|---|---|---|
| 1 | Fuente por valor o por alimento | Por valor |
| 2 | Lactosa | En gramos |
| 3 | Bebidas y suplementos | Se registran, con el mismo modelo |
| 4 | Fotos de etiquetas | En el repo, comprimidas. Si no hay foto, la tabla de la web o la fuente oficial, copiada literal con su enlace |
| 5 | Códigos de nutrientes | Nombres cortos en español, cada uno ligado a su código INFOODS/EuroFIR |
| 6 | Visibilidad del repo | Público |
| 7 | Almacenamiento | CSV en tablas normalizadas, migrables a PostgreSQL sin transformar |

## Tablas

```
alimentos ─┬─ fuentes
           ├─ nutrientes      (cada valor apunta a una fuente del mismo alimento)
           └─ composicion     (lotes y recetas → otros alimentos)

comidas ─── comida_items ─── item_valores
               └── alimentos (id + versión)

dias                          nutrientes_def (diccionario)
```

Formato de todas: UTF-8, separador coma, primera fila de cabecera, decimales con punto, listas separadas por `; `. Campo vacío = no se sabe.

## 1. Alimento

Un alimento es cualquier cosa que se ingiere: producto envasado, alimento fresco, bebida, suplemento, lote cocinado o receta.

### `alimentos.csv`: una fila por alimento y versión

| Columna | Obligatoria | Nota |
|---|---|---|
| `id` | sí | Minúsculas, números y guiones. Estable: no cambia aunque cambie la versión |
| `version` | sí | Empieza en 1. Ver «Versiones» |
| `vigente_desde` | no | Fecha desde la que vale esta versión |
| `tipo` | sí | `envasado`, `fresco`, `bebida`, `suplemento`, `lote`, `receta` |
| `nombre` | sí | Tal como aparece en el producto |
| `marca`, `formato`, `supermercado` | si existen | |
| `ean` | si existe | Código de barras: el identificador más fiable de un envasado |
| `base_por` | sí (no en recetas) | `100 g`, `100 ml` o `1 unidad` (suplementos: cápsula, cacito) |
| `base_estado` | sí (no en recetas) | `tal_cual`, `escurrido`, `cocido`, `preparado`. Los valores son siempre de la parte comestible |
| `comestible_pct` | no | Qué parte del peso bruto se come (huevo 88, sandía 60). Vacío = 100 |
| `peso_unidad_g` | no | Peso **bruto** de una unidad, tal como se cuenta (huevo con cáscara: 68) |
| `densidad_g_ml` | no | Para convertir entre gramos y mililitros |
| `peso_cocinado_g`, `raciones` | lotes | Peso final del lote y en cuántas raciones salió |
| `gluten` | sí | `si`, `no`, `trazas`, `desconocido`. Nunca se asume |
| `gluten_fuente` | si gluten ≠ desconocido | Nombre de una de sus fuentes |
| `ingredientes` | si existe | Texto literal de la etiqueta |
| `alergenos`, `trazas` | si existen | Listas |
| `notas` | no | |

### `fuentes.csv`: de dónde salen los valores

| Columna | Nota |
|---|---|
| `alimento_id`, `version` | |
| `fuente` | Nombre corto, único dentro del alimento (`etiqueta`, `bedca`…). Es lo que citan los nutrientes |
| `tipo` | `etiqueta`, `web`, `bedca`, `usda`, `openfoodfacts`, `estimado`, `calculado` |
| `especifica` | `si` si describe este producto concreto (etiqueta, web, lote propio). `no` si es un genérico de tabla |
| `ref` | Identificador en la base de datos y descripción (`FDC 171890 Beverages, coffee, brewed, espresso`) |
| `url` | Si viene de la web |
| `foto` | Ruta en `fotos/` |
| `texto` | La tabla copiada literal cuando no hay foto |
| `fecha` | Cuándo se leyó |

Jerarquía: `etiqueta`/`web` > `bedca` > `usda` > `openfoodfacts` > `estimado`. Una etiqueta tampoco es exacta: la normativa UE admite desviaciones de en torno a ±20 % (±2 g en valores pequeños).

### `nutrientes.csv`: un valor por fila

| Columna | Nota |
|---|---|
| `alimento_id`, `version` | |
| `nutriente` | Clave de `nutrientes_def.csv` |
| `valor` | Por la base del alimento, en la unidad del diccionario |
| `cualificador` | Vacío, `<` (por debajo de) o `trazas` |
| `fuente` | Una de las fuentes del alimento |

Se guarda **todo lo que dé la fuente**. El diccionario completo (43 nutrientes, con código INFOODS, unidad y si es imprescindible) está en [`datos/nutrientes_def.csv`](../datos/nutrientes_def.csv). Si la fuente específica no trae un imprescindible, se completa con BEDCA o USDA como fuente aparte.

Los imprescindibles y por qué:

- kcal, proteína, hidratos disponibles, azúcares, fibra, grasa, saturada, sal y sodio: la base de cualquier análisis.
- **Alcohol**: 7 kcal/g. Sin él, las bebidas alcohólicas no cuadran.
- **Potasio, calcio, fósforo y magnesio**: necesarios para calcular el PRAL.
- **Lactosa en gramos**: sienta mal en cantidad acumulada, así que hace falta la cantidad.
- **Cafeína**: con el objetivo de energía y rendimiento, es de las variables que más influyen.

Hidratos: siempre **disponibles**, sin fibra (criterio UE). USDA da «by difference», con fibra: se resta antes de guardar. Sodio: si solo hay sal, el script lo calcula al sumar (sal × 400).

### `composicion.csv`: lotes y recetas

`alimento_id`, `version`, `linea`, `ingrediente_id`, `ingrediente_version`, `cantidad`, `unidad`, `bruto`, `nota`.

- **Lote** (guiso, albóndigas): sus nutrientes son de tipo `calculado`, por 100 g de cocinado, a partir de los ingredientes crudos y el peso cocinado. Solo se calculan los nutrientes que tienen todos los ingredientes. Cada ración se registra como un item del lote.
- **Receta** (tortilla de siempre): no tiene nutrientes. Es una plantilla que se expande en sus ingredientes al registrar.

### Versiones

- **Corrección de un error** (un número mal copiado, un dato que faltaba): se edita la versión actual. El error queda corregido también en los días pasados.
- **El producto cambia de receta o de etiqueta**: versión nueva con `vigente_desde`. La anterior no se toca, y los días pasados siguen apuntando a la versión que se comió.

## 2. Consumo

### `comidas.csv`: una fila por comida

Una comida es un momento en el que se ingiere algo, incluida una bebida suelta o un suplemento.

| Columna | Obligatoria | Nota |
|---|---|---|
| `comida_id` | sí | `AAAA-MM-DD-N` |
| `fecha` | sí | Día local |
| `momento` | sí | Fecha y hora con zona: `2026-10-26T10:00+01:00` |
| `descripcion` | sí | «Tortilla de siempre», «Café» |
| `texto_original` | sí | Lo que dijiste, literal. Permite rehacer cualquier interpretación |
| `consumido_valor`, `consumido_unidad` | no | Si solo se comió parte de un plato compuesto: gramos (`g`) o `fraccion` |
| `estado` | sí | `registrada` o `anulada`. Un error se anula, no se borra |
| `motivo_anulacion` | si anulada | |
| `origen` | sí | `registro`, o `exportacion-2026-10-25` para el histórico |
| `notas` | no | |

### `comida_items.csv`: lo que se comió

| Columna | Obligatoria | Nota |
|---|---|---|
| `comida_id`, `linea` | sí | |
| `alimento_id`, `alimento_version` | sí | Qué versión se comió |
| `cantidad`, `unidad` | sí | `g`, `ml` o `ud` |
| `bruto` | no | `si` si los gramos incluyen cáscara o hueso: se aplica `comestible_pct`. En `ud` siempre se usa el peso bruto |
| `estado` | sí | Igual que el `base_estado` del alimento; si no coincide, hay que convertir la cantidad o usar otro alimento |
| `origen_cantidad` | sí | `bascula`, `envase`, `estimado` |
| `incertidumbre_pct` | sí | Báscula 2, envase 3-5, a ojo 25-40, chorro de aceite hasta 50 |
| `preparacion` | no | `crudo`, `plancha`, `frito`, `hervido`, `horno`… La grasa añadida va como item aparte |
| `nombre_registrado` | no | Cómo se nombró («4 huevos L») |
| `notas` | no | |

Los nutrientes **no se copian** al consumo: el item apunta a alimento + versión. Los totales siempre se calculan; no se guardan.

### `item_valores.csv`: excepciones del histórico

`comida_id`, `linea`, `nutriente`, `valor`, `fuente`. Valores por 100 g que se usaron en su día y difieren del catálogo actual (los cacahuetes Collaret calculados con OpenFoodFacts antes de tener la etiqueta, por ejemplo). Sustituyen al catálogo solo para esos nutrientes de ese item.

### `dias.csv`: estado de cada día

`fecha`, `estado` (`completo`, `parcial`, `incompleto`), `notas`. Permite excluir de los análisis los días a medio registrar.

## 3. Fotos

- Carpeta `fotos/`. WebP, lado mayor de 1600 px, calidad 80: `scripts/foto.py` lo hace.
- Nombre: `<id-alimento>_<cara>_<AAAA-MM-DD>.webp`. Caras: `frontal`, `tabla`, `ingredientes`.
- Si no hay foto, la fuente lleva `url` y `texto` con la tabla copiada literal.

## 4. Resultado (pendiente)

Fuera de este registro, pero necesario para que los datos de lactosa y gluten respondan algo: cómo te sentó (digestión, energía, síntomas). Se definirá con el módulo de deposiciones y observaciones de Higía.

## Histórico (11/08–22/10)

Los 17 días de la exportación del 25/10/2026 llevan `origen = exportacion-2026-10-25`:

- No tienen momento (salvo uno con hora), texto original, `origen_cantidad` ni `incertidumbre_pct`. El cálculo usa un 25 % por defecto para la banda de error.
- Los alimentos tienen una sola fuente: la que había en el catálogo. Gluten y lactosa solo constan donde las notas lo decían expresamente.
- Sus totales recalculados cuadran con el resumen de la exportación (±0,2 kcal por redondeo).

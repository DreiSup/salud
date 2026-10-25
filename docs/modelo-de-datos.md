# Modelo de datos

Base de todo el registro: qué se documenta de cada alimento y de cada consumo, y por qué. El catálogo, los archivos diarios y, más adelante, el esquema de Higía se construyen sobre este documento.

## Principios

1. **Guardar la fuente original, no solo los números.** Foto de la etiqueta, o la tabla copiada de la web con su enlace. De ahí se puede sacar en el futuro lo que hoy no se pide.
2. **Lo irrecuperable se registra bien hoy.** Qué, cuánto, cuándo y cómo se midió no se puede reconstruir. La composición de un alimento sí se puede completar más tarde.
3. **Catálogo completo, registro diario mínimo.** Documentar un alimento se hace una vez y lo hace Claude. Apuntar lo que comes se hace cada día y lo haces tú: ahí está la fricción, y ahí hay que pedir lo mínimo.
4. **Desconocido ≠ 0 ≠ trazas.** Un valor que no se sabe se omite. Nunca se rellena con 0.
5. **Cada número dice de dónde sale.** La fuente se indica por valor, no por alimento.

## Decisiones

| # | Decisión | Elegido |
|---|---|---|
| 1 | Fuente por valor o por alimento | Por valor |
| 2 | Lactosa | En gramos |
| 3 | Bebidas y suplementos | Se registran, con el mismo modelo |
| 4 | Fotos de etiquetas | En el repo, comprimidas. Si no hay foto, la tabla de la web o la fuente oficial, copiada literal con su enlace |
| 5 | Códigos de nutrientes | Nombres cortos en español, cada uno ligado a su código INFOODS/EuroFIR |
| 6 | Visibilidad del repo | Público |

## 1. Alimento

Un alimento es cualquier cosa que se ingiere: producto envasado, alimento fresco, bebida, suplemento, lote cocinado o receta.

### Identidad

| Campo | Obligatorio | Nota |
|---|---|---|
| `id` | sí | `kebab-case`, estable. No cambia aunque cambie la versión |
| `version` | sí | Empieza en 1. Ver «Versiones» |
| `tipo` | sí | `envasado`, `fresco`, `bebida`, `suplemento`, `lote`, `receta` |
| `nombre` | sí | Nombre del producto tal como aparece |
| `marca` | si existe | |
| `formato` | si existe | `200 g`, `6×125 g`, `1 kg` |
| `supermercado` | si existe | Dónde se compró |
| `ean` | si existe | Código de barras. Es el identificador más fiable de un envasado |
| `ingredientes` | si existe | Texto literal de la etiqueta, sin resumir |
| `alergenos` | si existe | Los declarados en negrita. Lista |
| `trazas` | si existe | «Puede contener…». Lista |

### A qué se refieren los valores

| Campo | Nota |
|---|---|
| `base.por` | `100 g`, `100 ml` o `1 unidad` (suplementos: cápsula, cacito) |
| `base.estado` | `tal_cual`, `escurrido`, `cocido`, `preparado`, `parte_comestible` |
| `comestible_pct` | Qué parte del peso bruto se come (huevo 88, sandía 60, cacahuete con cáscara 75) |
| `peso_unidad_g` | Peso de una unidad o loncha, cuando se cuenta por unidades |
| `densidad_g_ml` | Solo líquidos con base en ml |

La cantidad que se registra al comer tiene que estar en el mismo estado que la base: escurrido con escurrido, cocido con cocido.

### Fuentes

Cada alimento lista sus fuentes una vez, con un nombre corto, y cada nutriente apunta a una.

| Campo | Nota |
|---|---|
| `tipo` | `etiqueta`, `web` (ficha del súper o del fabricante), `bedca`, `usda`, `openfoodfacts`, `estimado`, `calculado` (lotes y recetas) |
| `especifica` | `true` si describe este producto concreto (etiqueta, web). `false` si es un genérico de tabla (BEDCA, USDA) |
| `foto` | Ruta en `fotos/`, si la hay |
| `url` | Si viene de la web |
| `texto` | La tabla copiada literal cuando no hay foto. Así queda constancia aunque la web cambie |
| `ref` | Identificador en la base de datos (`BEDCA 1234`, `FDC 168322`) y descripción del alimento usado |
| `fecha` | Cuándo se leyó |

Jerarquía: `etiqueta`/`web` > `bedca` > `usda` > `openfoodfacts` > `estimado`. Una etiqueta tampoco es exacta: la normativa UE admite desviaciones de en torno a ±20 % (±2 g en valores pequeños).

### Nutrientes

Se guarda **todo lo que dé la fuente**. ★ indica lo imprescindible: si un alimento no tiene ese valor en su fuente específica, se completa con BEDCA o USDA indicándolo.

| Clave | INFOODS | Unidad | | Nota |
|---|---|---|---|---|
| `kcal` | ENERC_KCAL | kcal | ★ | Los kJ se calculan (× 4,184) |
| `agua` | WATER | g | | |
| `prot` | PROCNT | g | ★ | |
| `hc` | CHOAVL | g | ★ | Hidratos disponibles, sin fibra (criterio UE). USDA da CHOCDF, que incluye la fibra: restarla |
| `azucar` | SUGAR | g | ★ | |
| `azucar_anadido` | SUGAD | g | | Casi nunca en la etiqueta UE |
| `almidon` | STARCH | g | | |
| `polialcoholes` | POLYL | g | | |
| `fibra` | FIBTG | g | ★ | |
| `grasa` | FAT | g | ★ | |
| `sat` | FASAT | g | ★ | |
| `mono` | FAMS | g | | |
| `poli` | FAPU | g | | |
| `trans` | FATRN | g | | |
| `omega3_ala` | F18D3N3 | g | | |
| `omega3_epa` | F20D5N3 | g | | |
| `omega3_dha` | F22D6N3 | g | | |
| `omega6` | FAPUN6 | g | | |
| `colesterol` | CHOLE | mg | | |
| `alcohol` | ALC | g | ★ | 7 kcal/g. Sin él, las bebidas alcohólicas no cuadran |
| `sal` | NACL | g | ★ | La que declara la etiqueta |
| `sodio` | NA | mg | ★ | Si solo hay sal: sodio = sal × 400. Si solo hay sodio: sal = sodio × 2,5 / 1000 |
| `potasio` | K | mg | ★ | PRAL |
| `calcio` | CA | mg | ★ | PRAL |
| `fosforo` | P | mg | ★ | PRAL |
| `magnesio` | MG | mg | ★ | PRAL |
| `hierro` | FE | mg | | |
| `zinc` | ZN | mg | | |
| `selenio` | SE | µg | | |
| `yodo` | ID | µg | | |
| `vit_a` | VITA_RAE | µg | | Equivalentes de actividad de retinol |
| `vit_d` | VITD | µg | | |
| `vit_e` | VITE | mg | | |
| `vit_k` | VITK1 | µg | | |
| `vit_c` | VITC | mg | | |
| `vit_b1` | THIA | mg | | |
| `vit_b2` | RIBF | mg | | |
| `vit_b3` | NIA | mg | | |
| `vit_b6` | VITB6A | mg | | |
| `folato` | FOL | µg | | |
| `vit_b12` | VITB12 | µg | | |
| `lactosa` | LACS | g | ★ | En gramos, no sí/no |
| `cafeina` | CAFFN | mg | ★ | |

Cada valor es un objeto:

```json
"kcal":    {"valor": 263, "fuente": "etiqueta"},
"lactosa": {"valor": 0.1, "fuente": "etiqueta", "cualificador": "<"},
"potasio": {"valor": 300, "fuente": "usda"}
```

`cualificador`: `<` (por debajo de), `trazas`. Sin cualificador, el valor es el que es.

### Gluten

No es un nutriente con cantidad fiable, así que va aparte:

```json
"gluten": {"valor": "no", "fuente": "etiqueta"}
```

Valores: `si`, `no`, `trazas`, `desconocido`. Nunca se asume.

### Versiones

- **Corrección de un error** (un número mal copiado, un dato que faltaba): se edita la versión actual. Es lo que se quiere: el error queda corregido también en los días pasados.
- **El producto cambia de receta o de etiqueta**: se crea una versión nueva con `vigente_desde`, y la anterior no se toca. Los días pasados siguen apuntando a la versión que se comió.

### Lotes y recetas

Un lote (guiso, albóndigas) o una receta (tortilla de siempre) es un alimento más, con `tipo: lote` o `receta`:

- `items`: los ingredientes crudos, con sus gramos y su referencia al catálogo;
- `peso_cocinado_g`: el peso final, o la merma supuesta, indicándolo;
- `raciones`, si se sabe.

Sus nutrientes son `calculado` a partir de los ingredientes.

### Ejemplo

```json
"bacon-lonchas-carrefour-sg": {
  "version": 1,
  "tipo": "envasado",
  "nombre": "Bacon lonchas sin gluten",
  "marca": "Carrefour El Mercado",
  "formato": "200 g",
  "supermercado": "Carrefour",
  "ean": "…",
  "ingredientes": "…texto literal…",
  "alergenos": [],
  "trazas": [],
  "base": {"por": "100 g", "estado": "tal_cual"},
  "peso_unidad_g": 16.7,
  "fuentes": {
    "etiqueta": {"tipo": "etiqueta", "especifica": true, "foto": "fotos/bacon-lonchas-carrefour-sg_tabla_2026-08-11.webp", "fecha": "2026-08-11"},
    "usda":     {"tipo": "usda", "especifica": false, "ref": "FDC … Pork, cured, bacon, unprepared", "fecha": "2026-10-25"}
  },
  "nutrientes": {
    "kcal":    {"valor": 263, "fuente": "etiqueta"},
    "grasa":   {"valor": 23,  "fuente": "etiqueta"},
    "sat":     {"valor": 7.8, "fuente": "etiqueta"},
    "hc":      {"valor": 1,   "fuente": "etiqueta"},
    "prot":    {"valor": 14,  "fuente": "etiqueta"},
    "sal":     {"valor": 2.2, "fuente": "etiqueta"},
    "potasio": {"valor": "…", "fuente": "usda"}
  },
  "gluten": {"valor": "no", "fuente": "etiqueta"}
}
```

(Los `…` son ilustrativos.)

## 2. Consumo

Un archivo por día, con sus comidas. Una comida es un momento en el que se ingiere algo, incluida una bebida suelta o un suplemento.

### Comida

| Campo | Obligatorio | Nota |
|---|---|---|
| `momento` | sí | Fecha y hora con zona: `2026-10-25T10:00+02:00` |
| `descripcion` | sí | «Tortilla de siempre», «Café» |
| `texto_original` | sí | Lo que dijiste, tal cual. Permite rehacer cualquier interpretación |
| `items` | sí | Lo que se comió |
| `consumido` | no | Si solo se comió una parte de un plato compuesto: `{"valor": 500, "unidad": "g"}` o una fracción |
| `notas` | no | |

### Item

| Campo | Obligatorio | Nota |
|---|---|---|
| `alimento` | sí | `id` del catálogo |
| `version` | sí | Versión del alimento que se comió |
| `cantidad` | sí | `{"valor": 50, "unidad": "g"}`. Unidades: `g`, `ml`, `ud` |
| `bruto` | no | `true` si la cantidad incluye cáscara o hueso. Se aplica `comestible_pct` |
| `estado` | sí | Igual que la `base.estado` del alimento. Si no coincide, hay que convertir antes |
| `origen_cantidad` | sí | `bascula`, `envase`, `estimado` |
| `incertidumbre_pct` | sí | Báscula 2, envase 3-5, a ojo 25-40, chorro de aceite hasta 50 |
| `preparacion` | no | `crudo`, `plancha`, `frito`, `hervido`, `horno`… La grasa añadida va como item aparte |
| `valores_registrados` | no | Solo en el histórico: valores por 100 g que se usaron entonces cuando difieren del catálogo |

Los nutrientes **no se copian** al consumo. El item apunta a `alimento` + `version`, y como una versión no cambia de receta, el día queda fijo. Los totales siempre se calculan; no se guardan.

## 3. Fotos

- Carpeta `fotos/`.
- Formato WebP, lado mayor de 1600 px, calidad 80. Debe leerse la tabla nutricional.
- Nombre: `<id-alimento>_<cara>_<AAAA-MM-DD>.webp`. Caras: `frontal`, `tabla`, `ingredientes`.
- Si no hay foto, la fuente lleva `url` + `texto` con la tabla copiada literal.

## 4. Resultado (pendiente)

Fuera de este registro, pero necesario para que los datos de lactosa y gluten respondan algo: cómo te sentó (digestión, energía, síntomas). Se definirá con el módulo de deposiciones y observaciones de Higía.

## Estado

El catálogo y los días migrados del 25/10 siguen el formato anterior (`README.md`). Falta migrarlos a este modelo y adaptar `scripts/calcular.py` para que lea los nutrientes del catálogo.

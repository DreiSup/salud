---
name: registrar-comida
description: Registra en los CSV del repo lo que Ysst ha comido o bebido (comidas, bebidas, suplementos), con todos los nutrientes y la fuente de cada valor, y da de alta los productos nuevos. Úsala siempre que diga "apunta", "he comido", "he bebido", "registra", "anota la cena", mencione una comida con gramos o marcas, mande una foto o un enlace de una etiqueta, hable de una tanda cocinada, o pida ver lo que lleva un día, aunque no nombre la skill.
---

# Registrar comidas

El valor está en dos cosas: no inventar datos y no equivocarse en las cuentas. Tú buscas los valores y preguntas lo que falte; `scripts/salud.py` valida, guarda y calcula. **No añadas filas a los CSV de `datos/` a mano**: todo pasa por el script, que no guarda nada si hay un error. La única excepción es corregir un dato erróneo de una fila existente, siempre seguido de `python scripts/salud.py validar`.

El modelo de datos completo está en `docs/modelo-de-datos.md`. Solo datos: no valores ni aconsejes sobre la dieta salvo que Ysst lo pida.

## Flujo

0. **Sincroniza** antes de escribir nada: `git pull --rebase origin main`. Ysst registra desde el móvil en sesiones distintas y cada una puede haber añadido comidas.
1. **Fecha y hora reales.** `python scripts/salud.py ahora`. Da la hora de Madrid aunque la sesión en la nube corra en UTC: usa siempre esa, nunca `date`. Nunca supongas el día. Si dice «ayer» o «esta mañana», calcúlalo desde ahí.
2. **Busca cada alimento en el catálogo.** `python scripts/salud.py buscar <texto>`. Para ver valores, base y peso por unidad: `python scripts/salud.py alimento <id>`. Las recetas habituales (`tipo: receta`, p. ej. `tortilla-de-siempre`) no se registran como tales: se expanden en sus ingredientes.
3. **Pregunta antes de calcular**, todo en una sola tanda y solo lo que cambie el resultado (ver «Preguntas que importan»). Incluye siempre la hora si no la ha dicho. Si pide aproximar, aproxima sin preguntar y dilo.
4. **Da de alta los productos nuevos** (ver «Alta de alimentos»).
5. **Registra la comida.** Escribe el JSON en `.tmp/` y ejecuta `python scripts/salud.py registrar .tmp/comida.json`. El script devuelve el informe del día: pégalo.
6. **Commit y push a `main`**: `git add datos fotos && git commit -m "comidas: AAAA-MM-DD <descripción>" && git push origin HEAD:main`. Los registros van siempre a `main`, sin ramas ni pull requests. Si el push falla porque `main` avanzó, `git pull --rebase origin main`, `validar` y vuelve a empujar. No des la comida por guardada hasta que el push haya funcionado.
7. Cuando diga que el día está terminado: `python scripts/salud.py cerrar <fecha> completo` (o `parcial`/`incompleto` con una nota).

## Formato para registrar

```json
{
  "fecha": "2026-10-26",
  "momento": "2026-10-26T10:00+01:00",
  "descripcion": "Tortilla de siempre y café",
  "texto_original": "lo que escribió Ysst, literal",
  "items": [
    {"alimento": "huevo-campero-l", "cantidad": 4, "unidad": "ud", "origen_cantidad": "estimado", "incertidumbre_pct": 25, "preparacion": "plancha", "nombre_registrado": "4 huevos L"},
    {"alimento": "bacon-lonchas-carrefour-sg", "cantidad": 3, "unidad": "ud", "origen_cantidad": "envase", "incertidumbre_pct": 5},
    {"alimento": "mozzarella-rallada-carrefour", "cantidad": 30, "unidad": "g", "origen_cantidad": "estimado", "incertidumbre_pct": 25},
    {"alimento": "aceite-oliva", "cantidad": 7.5, "unidad": "g", "origen_cantidad": "estimado", "incertidumbre_pct": 50, "notas": "un poco de aceite"}
  ],
  "consumido": null
}
```

- `momento` con la zona horaria que da `ahora` (España: `+01:00` en invierno, `+02:00` en verano).
- **Libreta** (comidas pasadas apuntadas en papel): `"origen": "libreta"`. Ysst quiere aproximado: no preguntes hora ni marca; usa lo del catálogo y recetas o tandas nominales, y dilo. Hora nominal por orden: 1.ª 10:00, 2.ª 15:30, 3.ª 19:00 (si hay una o dos comidas, son la 1.ª o la 1.ª y 2.ª). El día se cierra como `completo` con la nota «libreta, aproximado».
- `unidad`: `g`, `ml` o `ud`. En `ud` se usa el `peso_unidad_g` del alimento, que es bruto (con cáscara), y se aplica solo su `comestible_pct`.
- `bruto: true` solo con gramos que incluyen cáscara, hueso o piel no comestible.
- `estado`: si se omite, se toma el del alimento. Si Ysst lo comió en otro estado (crudo frente a cocido, sin escurrir frente a escurrido), no fuerces: usa otro alimento o convierte la cantidad y dilo.
- `incertidumbre_pct`: báscula 2, envase 3-5, a ojo 25-40, chorro de aceite hasta 50.
- `consumido`: solo si se comió parte de un plato compuesto: `{"valor": 500, "unidad": "g"}` o `{"valor": 0.5, "unidad": "fraccion"}`.
- La grasa de cocinado va como item propio.
- Bebidas y suplementos se registran igual, cada uno como una comida o dentro de la comida en la que se tomaron.

## Alta de alimentos

Un producto nuevo se da de alta antes de registrar la comida: `python scripts/salud.py alta .tmp/alimento.json`.

```json
{
  "id": "yogur-griego-hacendado",
  "tipo": "envasado",
  "nombre": "Yogur griego natural",
  "marca": "Hacendado",
  "formato": "6×125 g",
  "supermercado": "Mercadona",
  "ean": "8480000…",
  "ingredientes": "texto literal de la etiqueta",
  "alergenos": ["leche"],
  "trazas": [],
  "base_por": "100 g",
  "base_estado": "tal_cual",
  "peso_unidad_g": 125,
  "gluten": "no",
  "gluten_fuente": "etiqueta",
  "fuentes": [
    {"nombre": "etiqueta", "tipo": "etiqueta", "especifica": true, "foto": "fotos/yogur-griego-hacendado_tabla_2026-10-26.webp", "fecha": "2026-10-26"},
    {"nombre": "bedca", "tipo": "bedca", "especifica": false, "ref": "BEDCA 1234 Yogur griego"}
  ],
  "nutrientes": {
    "kcal": 120, "grasa": 10, "sat": 6.5, "hc": 4.5, "azucar": 4.5, "prot": 3.5, "sal": 0.1,
    "lactosa": {"valor": 4, "fuente": "bedca"},
    "calcio": {"valor": 120, "fuente": "bedca"}
  }
}
```

- `id`: minúsculas y guiones, estable. Un número suelto en `nutrientes` usa la primera fuente; si viene de otra, usa la forma `{"valor", "fuente", "cualificador"}`.
- **Guarda todo lo que dé la fuente.** Las claves válidas están en `datos/nutrientes_def.csv`. Si la fuente específica no trae algún imprescindible (`imprescindible = si`), complétalo con BEDCA o USDA como fuente aparte.
- **Desconocido no es 0.** Si no consta, se omite. `cualificador`: `<` («menos de 0,5 g») o `trazas`.
- `gluten`: `si`, `no`, `trazas` o `desconocido`. Nunca lo supongas.
- `tipo`: `envasado`, `fresco`, `bebida`, `suplemento`, `lote`, `receta`. `base_por`: `100 g`, `100 ml` o `1 unidad`. `base_estado`: `tal_cual`, `escurrido`, `cocido`, `preparado`.
- **Corrección de un error** en un producto existente: no hay comando; dilo y edita la fila con cuidado, luego `validar`. **Cambio de receta o etiqueta**: `alta … --nueva-version`.
- El script avisa si las kcal no cuadran con los macros (>15 %): revisa el dato antes de seguir.

### Fuentes

1. `etiqueta`: foto del envase. Es la mejor.
2. `web`: ficha del súper o del fabricante. Guarda `url` y copia la tabla literal en `texto`.
3. `bedca`: Base de Datos Española de Composición de Alimentos. Lleva caída desde agosto de 2026; si no responde, dilo y pasa a la siguiente.
4. `usda`: solo si no hay nada español. Avisa cuando la uses. Guarda en `ref` el FDC ID y la descripción.
5. `openfoodfacts`: por marca y nombre exacto (`es.openfoodfacts.org`).
6. `estimado`: último recurso, siempre dicho.

Casos aprendidos:

- **Frescos sin etiqueta** (huevo, fruta, verdura, carne y pescado frescos) están exentos por normativa: usa BEDCA o USDA.
- **Webs de Consum** cargan por JavaScript y no se leen: busca en OpenFoodFacts.
- **Hidratos**: la etiqueta UE da hidratos disponibles (sin fibra). USDA da «carbohydrate by difference», que incluye la fibra: **réstala** antes de guardar.
- **Sodio y sal**: guarda lo que declare la fuente. El script calcula el sodio desde la sal si falta.
- **Etiquetas «sobre producto escurrido»**: `base_estado: escurrido`, y la cantidad que se registra también escurrida.
- **Valores implausibles** (p. ej. 6 g de proteína en un tomate frito): no los uses. Márcalo y usa un valor coherente.
- **Azúcares añadidos, mono, poli y trans** casi nunca vienen en la etiqueta europea: no los deduzcas sin decir que es estimación tuya.

### Fotos

Ysst usa esto desde el móvil. Cuando adjunta una foto, el archivo queda en la sesión (normalmente en `/root/.claude/uploads/…`; si no ves la ruta, búscala con `ls -t /root/.claude/uploads/*/ | head`). Léela para sacar los valores y guárdala comprimida:

```bash
python scripts/foto.py <ruta-imagen> <id-alimento> <frontal|tabla|ingredientes>
```

Devuelve la ruta para la `foto` de la fuente. Requiere Pillow (`pip install pillow`). Si no hay foto, la fuente lleva `url` y la tabla copiada en `texto`.

## Tandas cocinadas

Cuando Ysst cocina una vez y come varias (guiso, albóndigas), se da de alta el lote completo como alimento `tipo: lote`:

```json
{"id": "lote-guiso-2026-10", "tipo": "lote", "nombre": "Guiso de carne (oct 2026)", "base_por": "100 g", "base_estado": "cocido",
 "peso_cocinado_g": 1150,
 "composicion": [{"alimento": "carne-picada-vacuno-cdc", "cantidad": 900}, {"alimento": "cebolla", "cantidad": 110}],
 "notas": "peso cocinado medido en báscula"}
```

Sin `nutrientes`: el script los calcula por 100 g de cocinado a partir de la composición, y solo los que tienen todos los ingredientes. Si no hay peso cocinado, usa una merma nominal (carne picada ≈ sin pérdida neta, verduras sofritas −15 %), conviértela a peso y dilo en `notas`. Después, cada ración se registra como un item del lote con sus gramos.

## Preguntas que importan

- **Crudo o cocido** (arroz, pasta, legumbre, carne). En el arroz, la diferencia es casi ×3.
- **Con o sin cáscara, corteza o hueso.**
- **Escurrido o con líquido** (atún, maíz, conservas).
- **Peso de una unidad** cuando viene contado y el alimento no tiene `peso_unidad_g`. Pregúntalo una vez y guárdalo en el alimento.
- **Tamaño** cuando no hay peso (pequeño, mediano, grande), con los gramos de cada opción a la vista.
- **Grasa de cocinado**: si hubo aceite y cuánto. En fritura no se absorbe todo: asume una fracción y dila.
- **Qué parte del plato** comió, si el peso es del plato completo.
- **La hora**, si no la ha dicho.

Usa el selector de opciones cuando la respuesta sea una elección cerrada.

## Convenciones de Ysst

- Huevo campero L: 68 g con cáscara, 88 % comestible (ya en el catálogo: registrar en `ud`).
- Bacon Carrefour: 16.7 g por loncha (en el catálogo: registrar en `ud`).
- Mozzarella en la tortilla: 30 g, salvo que diga otra cosa.
- «Un poco de aceite»: 7.5 g, incertidumbre 50 %.
- Arroz: siempre cocido.
- Cacahuete con cáscara: 75 % comestible. Sandía y melón: 60 %.

## Otros comandos

- `python scripts/salud.py dia [fecha]`: informe de un día con todos los nutrientes y su cobertura.
- `python scripts/salud.py resumen [desde] [hasta]`: totales por día.
- `python scripts/salud.py anular <comida_id> <motivo>`: para un error, en vez de borrar.
- `python scripts/salud.py validar`: revisa todos los CSV. Debe dar 0 errores antes de cada commit.

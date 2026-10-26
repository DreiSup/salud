# salud

Registro crudo de lo que como y bebo cada día. Más adelante se integrará en Higía.

## Estructura

```
datos/                    tablas CSV (la base de datos)
  alimentos.csv             un producto por fila y versión
  fuentes.csv               de dónde salen los valores de cada producto
  nutrientes.csv            un valor por fila: producto, nutriente, valor, fuente
  composicion.csv           ingredientes de lotes cocinados y recetas
  comidas.csv               una comida por fila: momento, descripción, texto original
  comida_items.csv          lo que se comió en cada comida y cuánto
  item_valores.csv          valores registrados en el histórico que difieren del catálogo
  dias.csv                  estado de cada día (completo, parcial, incompleto)
  nutrientes_def.csv        diccionario de nutrientes: clave, código INFOODS, unidad
fotos/                    etiquetas en WebP
scripts/salud.py          valida, guarda y calcula
scripts/foto.py           comprime una foto de etiqueta
docs/modelo-de-datos.md   qué se documenta y por qué
pendientes.md             huecos y datos por confirmar
```

## Uso

Con Claude Code abierto en la carpeta del repo, basta con decir lo que has comido («apunta: …»). La skill `registrar-comida` busca los valores, pregunta lo que falte, guarda y hace el commit.

A mano:

```bash
python scripts/salud.py ahora                  # fecha y hora local con zona
python scripts/salud.py buscar huevo           # busca en el catálogo
python scripts/salud.py alimento huevo-campero-l
python scripts/salud.py alta alimento.json     # alta de un producto
python scripts/salud.py registrar comida.json  # guarda una comida
python scripts/salud.py dia 2026-10-20         # informe de un día
python scripts/salud.py resumen 2026-10-01     # totales por día
python scripts/salud.py anular 2026-10-20-2 "duplicada"
python scripts/salud.py cerrar 2026-10-20 completo
python scripts/salud.py validar                # revisa todo
```

Solo necesita Python 3.8 o superior. `foto.py` necesita además Pillow (`pip install pillow`).

Los CSV se cargan directamente en PostgreSQL con `\copy` cuando llegue la migración.

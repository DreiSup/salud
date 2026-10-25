# salud

Registro crudo de lo que como cada día. Más adelante se integrará en Higía.

## Estructura

```
comidas/AAAA/MM/AAAA-MM-DD.json   un archivo por día
catalogo/alimentos.json           productos habituales, lotes cocinados y recetas, por 100 g
scripts/calcular.py               calcula los totales de un día
pendientes.md                     huecos y datos por confirmar
docs/exportacion-2026-10-25.md    exportación original del proyecto Salud (11/08–22/10)
```

> **El modelo de datos definitivo está en [`docs/modelo-de-datos.md`](docs/modelo-de-datos.md).** Lo que sigue describe el formato actual, pendiente de migrar.

## Formato de un día

Es el formato que usa `scripts/calcular.py`, así que cualquier día se puede recalcular:

```bash
python scripts/calcular.py comidas/2026/10/2026-10-20.json
```

```json
{
  "dia": "2026-10-25",
  "estado": "Completo",
  "comidas": [
    {
      "numero": 1,
      "comida": "Tortilla de siempre",
      "hora": "10:00",
      "items": [
        {
          "nombre": "Huevo campero L (4 ud)",
          "catalogo_id": "huevo-campero-l",
          "gramos_brutos": 272,
          "comestible_pct": 88,
          "fuente": "bedca",
          "origen_cantidad": "estimado",
          "incertidumbre_pct": 25,
          "lactosa": "no",
          "gluten": "no",
          "por100": {"kcal": 141, "prot": 12.7, "hc": 0.68, "grasa": 9.7, "sat": 2.8, "fibra": 0, "sal": 0.36}
        }
      ],
      "consumido_g": null
    }
  ]
}
```

### Reglas

- **Solo datos crudos**: qué se comió, cuánto y de dónde sale cada valor. Los totales no se guardan, se calculan.
- **Valores siempre por 100 g**, copiados en cada ingrediente aunque estén en el catálogo. Así el día no cambia si el catálogo se corrige después.
- **Nutrientes** (`por100`): `kcal, prot, hc, azucar, azucar_anadido, fibra, grasa, sat, mono, poli, trans, sal`. HC son hidratos disponibles, sin fibra. Si no se sabe un valor, se omite. Nunca se pone 0 por defecto.
- **Cantidad**: `gramos` (porción comestible) o `gramos_brutos` + `comestible_pct`.
- **`fuente`**: `etiqueta` > `bedca` > `usda` > `estimado`. `lote` para un cocinado del catálogo. `fuente_detalle` aclara el origen (p. ej. `OpenFoodFacts`).
- **`origen_cantidad`**: `envase`, `bascula`, `estimado`.
- **`incertidumbre_pct`**: envase 3-5, báscula 2, a ojo 25-40, chorro de aceite hasta 50.
- **`lactosa` y `gluten`**: `si`, `no`, `trazas`, `desconocido`. Nunca se asume.
- **`consumido_g`**: solo si se comió una parte de un plato compuesto.
- `numero`, `hora`, `estado`, `origen`, `catalogo_id` y `fuente_detalle` son opcionales. El script los ignora.

### Histórico (11/08–22/10)

Los 17 días migrados de la exportación del 25/10/2026 tienen estas particularidades:

- Solo había kcal, proteína, grasa e HC por ingrediente. Cuando esos cuatro valores coinciden con el catálogo, el ingrediente lleva el `por100` completo del catálogo (con sat, fibra, sal…). Así ha pasado en 120 de los 127.
- En los 7 restantes, el valor registrado entonces difiere del catálogo actual: los cacahuetes Collaret calculados con OpenFoodFacts antes de tener la etiqueta, y un yogur. Llevan el valor original, derivado de la exportación, y `por100_origen` lo indica.
- No tienen `origen_cantidad` ni `incertidumbre_pct`. El script usa un 25 % por defecto para la banda de error.
- Los totales recalculados cuadran con el resumen de la exportación (±0,2 kcal por redondeo).

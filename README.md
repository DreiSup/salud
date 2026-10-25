# salud

Registro crudo de lo que como cada día. Más adelante se integrará en Higía.

## Estructura

```
comidas/AAAA/MM/AAAA-MM-DD.json   un archivo por día
catalogo/alimentos.json           productos habituales con valores por 100 g
scripts/calcular.py               calcula totales a partir de un día
```

## Formato de un día

Es el mismo formato que usa `scripts/calcular.py`, así que cualquier día se puede recalcular:

```bash
python scripts/calcular.py comidas/2026/10/2026-10-25.json
```

```json
{
  "dia": "2026-10-25",
  "comidas": [
    {
      "comida": "Desayuno",
      "hora": "08:30",
      "items": [
        {
          "nombre": "Huevo campero L (2 ud)",
          "catalogo_id": "huevo-l",
          "gramos_brutos": 136,
          "comestible_pct": 88,
          "fuente": "bedca",
          "incertidumbre_pct": 25,
          "por100": {"kcal": 141, "prot": 12.7, "hc": 0.68, "grasa": 9.7, "sat": 2.8, "fibra": 0, "sal": 0.36}
        }
      ],
      "consumido_g": null
    }
  ]
}
```

### Reglas

- **Solo datos crudos.** Lo que se comió, cuánto y de dónde sale cada valor. Los totales no se guardan: se calculan.
- **Valores siempre por 100 g**, copiados en cada ingrediente aunque estén en el catálogo, para que el día no cambie si el catálogo se corrige después.
- **Nutrientes** (`por100`): `kcal, prot, hc, azucar, azucar_anadido, fibra, grasa, sat, mono, poli, trans, sal`. Si no se sabe un valor, se omite. Nunca se pone 0 por defecto.
- **Cantidad**: `gramos` (porción comestible) o `gramos_brutos` + `comestible_pct`.
- **`fuente`**: `etiqueta` > `bedca` > `usda` > `estimado`.
- **`incertidumbre_pct`**: envase 3-5, báscula 2, a ojo 25-40, chorro de aceite hasta 50.
- **`consumido_g`**: solo si se comió una parte de un plato compuesto.
- `hora` y `catalogo_id` son opcionales. El script los ignora.

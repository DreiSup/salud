# salud

Registro crudo de comidas diarias de Ysst. Fase de recogida de datos (60-90 días) sin intervenir: no valores ni aconsejes sobre la dieta salvo que se pida. Más adelante se integrará en Higía (`DreiSup/HIGIA`).

- El formato y las reglas están en `README.md`. Síguelos al pie de la letra.
- Cuando Ysst diga lo que ha comido, usa la skill `calculo-nutricional` para resolver valores, y guarda el resultado en `comidas/AAAA/MM/AAAA-MM-DD.json`. Si el día ya existe, añade la comida; no reescribas las anteriores.
- El catálogo de productos vive en `catalogo/alimentos.json`. Úsalo antes de buscar valores y añade cada producto nuevo confirmado.
- Antes de hacer commit, comprueba que el día se calcula sin errores: `python scripts/calcular.py <archivo>`.
- Un commit por día o comida, con mensaje `comidas: AAAA-MM-DD <comida>`.

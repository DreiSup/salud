# salud

Registro crudo de las comidas diarias de Ysst, para integrarlo después en Higía (`DreiSup/HIGIA`). Contexto completo del proyecto en `docs/exportacion-2026-10-25.md`.

**El modelo de datos está en `docs/modelo-de-datos.md` y manda sobre cualquier otro documento.** El catálogo y los días actuales siguen el formato anterior hasta que se migren.

Fase de recogida de datos (60-90 días) sin intervenir: no valores ni aconsejes sobre la dieta salvo que se pida. Restricciones a vigilar: gluten y lactosa.

## Registrar una comida

1. Comprueba la fecha real del sistema antes de asignar el día.
2. Usa la skill `calculo-nutricional` para resolver los valores, pero toma el catálogo de `catalogo/alimentos.json` (no de la memoria del proyecto de claude.ai).
3. Haz todas las preguntas antes de calcular, incluida la hora.
4. Guarda la comida en `comidas/AAAA/MM/AAAA-MM-DD.json` con el formato de `README.md`. Si el día ya existe, añade la comida sin tocar las anteriores.
5. Añade al catálogo cada producto nuevo confirmado. Los lotes cocinados van en `lotes`.
6. Comprueba que el día se calcula sin errores: `python scripts/calcular.py <archivo>`.
7. Haz un commit por comida, con el mensaje `comidas: AAAA-MM-DD <comida>`.

## Convenciones

- Huevo campero L: 68 g con cáscara, 88 % comestible. 4 ud = 239.36 g, `estimado`, 25 %.
- Bacon Carrefour: 16.7 g por loncha. 3 lonchas = 50 g, `envase`, 5 %.
- Mozzarella en la tortilla: 30 g, salvo que diga otra cosa.
- «Un poco de aceite»: 7.5 g, 50 %.
- Arroz: siempre cocido.
- Cacahuete con cáscara: 75 % comestible. Sandía y melón: 60 %.

## Huecos

Están en `pendientes.md`. Si un dato pendiente llega, corrige el día y táchalo de la lista.

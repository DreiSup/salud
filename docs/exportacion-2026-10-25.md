# Higía — Exportación de datos nutricionales y contexto del proyecto

Oct 25, 2026 · @ysst

## Qué contiene

Todo lo calculado de nutrición entre el 11/08/2026 y el 22/10/2026: 17 días registrados, catálogo de 39 productos y 3 lotes cocinados. Además, el contexto de Higía y lo que queda por construir, para cargarlo en otra herramienta o sesión sin perder nada.

- Fuente de los datos: el chat «Documentar nutrición en Obsidian» del proyecto Salud y el catálogo guardado en memoria.
- Los valores de 11/08 a 11/09 son los de la exportación CSV reconciliada con el esquema de producción; sustituyen a las tablas antiguas del chat (p. ej. el 12/08 pasó de 1377 a 2074 kcal tras la reconstrucción).
- Desde el 14/09 rige el protocolo nuevo (por 100 g, hora, origen\_cantidad, incertidumbre); los días posteriores llevan esos campos.
- kcal en kcal; resto en gramos. HC = hidratos disponibles (sin fibra).

## Higía: qué es y dónde está

Higía es una app personal de salud y nutrición que acumula 60-90 días de datos propios para descubrir patrones sin consejos externos. No da recomendaciones de salud por diseño: es n=1, decides tú con tus datos.

| Aspecto | Estado |
| --- | --- |
| Objetivo personal de fondo | Energía y rendimiento primero; ganar músculo limpio después |
| Restricciones a vigilar | Gluten y lactosa en la medida de lo posible (no intolerancia; acumulados sientan mal) |
| Stack | Python, PostgreSQL |
| Esquema implementado | `alimentos`, `tandas`, `comidas`, `comida_items` + trazabilidad (`fuente`, `base`, `origen_cantidad`, `incertidumbre_pct`, `porcion_comestible_pct`) |
| Sync de actividad | Google Health API (OAuth 2.0), sucesora de la Fitbit Web API, con un Fitbit |
| Fuentes nutricionales | Fichas de Carrefour y Consum, BEDCA, etiquetas fotografiadas |
| Capa de lectura | Vault de Obsidian |
| IA | Claude como asistente y futuro cliente MCP; Claude Code para implementar |
| Docs de referencia ya hechos | `fitbit-google-health-data-structure.md`, `higia-google-health-api-prompt.md` |
| Herramienta de cálculo | Skill `calculo-nutricional` (calculadora Python + catálogo en memoria del proyecto) |

Flujo actual de registro: describes la comida con marca, gramos, enlace o foto; Claude busca los valores, pregunta lo que falta y devuelve tabla o inserts SQL para producción. Solo datos, sin valoración de la dieta.

## Lo que quiero construir

Roadmap en tres fases: uso personal → contactos invitados → App Store y Google Play. Interfaz AI-first: hablas o escribes a un LLM que estructura los datos; la app sirve sobre todo para ver gráficas.

**Confirmado como dirección**

- API como interfaz principal; LLM y frontend son clientes iguales.
- Servidor MCP para operar Higía en lenguaje natural: local, expuesto con Cloudflare Tunnel o Tailscale Funnel, autenticación por API key.
- Reglas MCP: el LLM nunca escribe directo en la base de datos; se guarda la transcripción cruda junto al registro; estado `pendiente_confirmacion` para inferencias dudosas.
- Multiusuario desde ya: `usuario_id` en todas las tablas; catálogo compartido (`alimentos`) separado de datos personales (`comidas`).
- Escritorio para gráficas y análisis detallado; móvil ligero (lo esencial + conversación con el LLM).

**Planeado, sin confirmar**

| Módulo | Forma prevista |
| --- | --- |
| Deposiciones | Tabla `deposiciones` (Bristol, color, volumen, urgencia, dolor…) + campos diarios de contexto |
| Diario de sueños | `sueno_relato` (inmutable), `sueno_interpretacion` (versionada, con enfoque), `simbolo` + `sueno_simbolo` (N:N) |
| Formas genéricas | Sesiones, Métricas (`metrica_def` + `metrica_registro`), Observaciones, Documentos |
| Actividad | Tabla única `sesion_actividad` con `origen` y `ref_externa` para evitar duplicados de Fitbit |
| PRAL | Carga ácida de la dieta (Remer-Manz) desde proteína, fósforo, potasio, magnesio y calcio |

**Dashboard (plan previo de la app de salud)**

- Home que responde en 3 segundos: cómo dormí hoy, comparación con otros días y tendencia semanal.
- Pestañas Sueño (fases) y Corazón (HR, HRV, SpO2).
- Next.js + shadcn en frontend; PostgreSQL + TimescaleDB; datos crudos desde el día 1; backup automático; sync diario, no 24/7.
- Hosting gratis o casi: Oracle Always Free si va fuera de casa. Acceso público con login de Google.
- Estética: réplica de Apple Health o liquid glass. Claude Design ya entregó la arquitectura de frontend, pendiente de revisión.

**Contenido paralelo**: posts en Substack y en la web sobre métricas (Sleep, Nutrition, Heart, Fitness), primero en español, empezando por RHR, HRV, HRR, VO2 max y regularidad del sueño.

## Principios y riesgos

El riesgo central es la fricción: capturar con precisión choca con la evidencia de que el abandono en apps de registro de comida lo causa casi siempre la fricción al apuntar.

- **Taxonomía ≠ modelo de datos.** Sueño / Corazón / Nutrición es presentación; los datos se organizan en Sesiones, Métricas, Observaciones y Documentos.
- **Trazabilidad en todo**: fuente, incertidumbre y origen de la cantidad en cada registro.
- **No determinismo del LLM**: puede corromper datos numéricos; por eso el MCP no escribe directo.
- **RGPD art. 9**: datos de salud = categoría especial. Cifrado en reposo y borrado desde el día 1, incluso con conocidos.
- **Sync local-first descartado** para app de un usuario: PowerSync, Electric, Zero y Turso evaluados y apartados.
- **Tiendas**: Apple 5.1.2(i) sobre consentimiento de IA de terceros; Google Play pide 12 testers durante 14 días a cuentas personales.
- **Fuentes de salud**: el prestigio de la institución no filtra. Mejor mirar si el autor vende algo, si usa dolencias indiagnosticables y si distingue animal / asociación / ensayo humano. «Dieta alcalina» es pseudociencia; lo serio es la carga ácida (PRAL/NEAP).

**Trampas de Google Health / Takeout**

- Fitbit legacy en hora local sin zona; Google Health CSV en UTC → normalizar con `Europe/Madrid`.
- Peso en gramos, altura en milímetros.
- Unir sueño por `sleep_id`, no por rangos de tiempo.
- Carpetas de glucosa: placeholders vacíos, ignorar.

## Protocolo de registro

Desde el 14/09/2026 cada cálculo sigue estas reglas; los datos anteriores solo tienen kcal, proteína, grasa e HC.

1. Valores siempre por 100 g; la ración se calcula aparte.
2. Todas las preguntas antes de calcular, incluida la hora (`momento`).
3. Por alimento: kcal, proteína, HC, azúcar, azúcar añadido, fibra, grasa, saturada, sal (mono, poli y trans si constan).
4. Jerarquía de fuentes: etiqueta → BEDCA (caída desde agosto 2026) → USDA (avisando) → estimado (OpenFoodFacts, FatSecret).
5. `lactosa` y `gluten`: si / no / trazas / desconocido, nunca asumido.
6. Lotes cocinados como lote completo (crudo, cocinado, raciones), nunca prorrateados a mano.
7. Cada ingrediente lleva `origen_cantidad` e `incertidumbre_pct`.
8. Salida en 3 bloques CSV: `alimentos`, `comidas`, `comida_items`, con `cantidad_g` ya comestible.

| Convención | Valor |
| --- | --- |
| Huevo campero L | 68 g con cáscara, 88 % comestible → 59.84 g; 4 ud = 239.36 g; `estimado`, 25 % |
| Bacon Carrefour | 16.7 g/loncha (12 × 200 g); 3 lonchas = 50 g; `envase`, 5 % |
| Mozzarella por defecto | 30 g en la tortilla, salvo que digas otra cosa |
| «Un poco de aceite» | 7.5 g (punto medio de 5-10 g), 50 % |
| Arroz | Siempre cocido |
| Cacahuete con cáscara | 75 % comestible |
| Sandía y melón | 60 % pulpa comestible |
| Incertidumbre por método | Envase 3-5 %, báscula 2 %, a ojo 25-40 %, chorro de aceite hasta 50 % |
| Fecha | Comprobar la fecha real del sistema antes de asignar el día |

## Catálogo de alimentos (por 100 g)

39 productos confirmados en el catálogo, más 6 usados solo como estimación. Vacío = no consta en la fuente.

| id | Producto | Fuente | kcal | Prot | HC | Azúcar | Grasa | Sat | Fibra | Sal | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| huevo-campero-l | Huevos camperos Círculo de Calidad (Carrefour) | bedca | 141 | 12.7 | 0.68 |  | 9.7 | 2.8 | 0 | 0.36 | Base comestible; sin lactosa ni gluten |
| bacon-lonchas-carrefour-sg | Bacon lonchas Carrefour El Mercado sin gluten 200 g | etiqueta | 263 | 14 | 1 |  | 23 | 7.8 | 0 | 2.2 | Lactosa sí, gluten no |
| mozzarella-rallada-carrefour | Mozzarella rallada Carrefour 200 g | etiqueta | 299 | 25 | 2.6 |  | 21 | 14 |  | 1.3 | Lactosa sí |
| queso-4quesos-dia | Queso rallado 4 quesos Dia Láctea 200 g | etiqueta | 370 | 26 | 1.9 | 0 | 30 | 21 |  | 1.6 | Lactosa sí |
| carne-picada-vacuno-cdc | Preparado carne picada vacuno Círculo de Calidad (Carrefour) | etiqueta | 209 | 20.3 | 0.5 |  | 14.5 | 7.2 | 0 | 1 |  |
| burger-meat-mercadona | Burger meat vacuno 82 % (Mercadona, F. Martínez) | etiqueta | 182 | 17 | 0.9 | 0.8 | 12 | 5 |  | 0.3 | Harina de arroz, fibra de guisante, sulfitos E-221; sin gluten |
| cacahuete-collaret-consum | Cacahuete tostado Collaret (Consum) | etiqueta | 587 | 24 | 21 |  | 50 | 7.7 | 8.4 | 0.01 | Con cáscara: 75 % comestible |
| cacahuete-cascara-family-cash | Cacahuete cáscara 2 granos tostado (Family Cash) 3 kg | etiqueta | 612 | 23.8 | 12.7 | 4.1 | 50.3 | 8.5 | 6.9 | 0.01 | Valores de grano; trazas de gluten, leche, sésamo, soja, mostaza, frutos de cáscara, sulfitos |
| cacahuete-lidl | Cacahuetes tostados Lidl \~375 g | etiqueta | 624 | 27.1 | 9.8 | 5.1 | 51.2 | 7.0 | 7.9 | 0.05 | Parte comestible |
| frankfurt-lidl | Frankfurt ahumada Lidl 1 kg | etiqueta | 278 | 12.3 | 2.0 | 1.0 | 24.5 | 11.0 | 0.2 | 1.80 | 1 ud ≈ 100 g |
| yogur-natural-andros | Yogur natural Andros La Serna 125 g | etiqueta | 124 | 2.9 | 5.7 | 5.7 | 10 | 6.5 |  | 0.10 | Lactosa sí |
| yogur-griego-carrefour-extra | Yogur griego natural Carrefour Extra 6×125 g | etiqueta | 125 | 4 | 5 |  | 10 | 7 | 0 | 0 | Lactosa sí |
| queso-brine-lidl | Cheese in Brine Lidl 1800 g | etiqueta | 294 | 14.2 | 0.6 | 0.6 | 26.1 | 15.7 | 0 | 2.40 | Escurrido; lactosa <0.1 g |
| queso-cabra-lidl | Queso de cabra en salmuera Lidl (lata) | etiqueta | 270 | 15.0 | 0.7 | 0.7 | 23.0 | 16.1 | 0 | 2.20 | Escurrido |
| rulo-cabra | Rulo de cabra | usda | 264 | 18.5 | 0 |  | 21.1 | 14.6 | 0 | 1.17 | Lactosa sí |
| atun-aceite-oliva-carrefour | Atún claro en aceite de oliva Carrefour, pack 8 | estimado | 200 | 25 | 0 |  | 10 | 1.7 |  | 1.2 | Lata 70 g, 52 g escurrido |
| tomate-frito-sin-azucar-carrefour | Tomate frito sin azúcar, reducido en sal, Carrefour | etiqueta | 74 | 1.2 | 8.7 |  | 3.8 |  |  |  | Proteína estimada (web daba 6.0) |
| pasas-sultanas-consum | Pasas sultanas Consum 300 g | estimado | 322 | 2.7 | 71 | 71 | 1 | 0.3 | 9.6 | 0.04 | OpenFoodFacts |
| ciruela-sin-hueso-consum | Ciruelas sin hueso Consum 300 g | estimado | 221 | 1.8 | 49 | 35 | 0.7 |  | 6.5 |  | \~10 g/ud |
| miel-flores-eco-carrefour | Miel de flores eco Carrefour Bio 500 g | etiqueta | 331 | 0 | 82.9 |  | 0 | 0 |  |  | Cucharadita ≈ 7 g |
| empanada-ternera-aloloco-carrefour | Empanadas ternera Aloloco (Carrefour) 160 g | etiqueta | 225 | 10 | 30 |  | 6.1 |  |  |  |  |
| arroz-blanco-cocido | Arroz blanco cocido | usda | 130 | 2.7 | 28 |  | 0.3 |  |  |  |  |
| garbanzos-cocidos-bote | Garbanzos cocidos de bote, escurridos | usda | 139 | 7.25 | 22.5 |  | 2.14 |  |  |  |  |
| aguacate | Aguacate crudo | usda | 160 | 2 | 8.53 |  | 14.7 | 2.13 | 6.7 | 0.018 | Medio mediano pelado ≈ 60 g |
| tomate-cherry | Tomate cherry | usda | 18 | 0.88 | 3.89 |  | 0.2 | 0.028 | 1.2 | 0.013 |  |
| tomate | Tomate | usda | 18 | 0.9 | 3.9 |  | 0.2 |  |  |  | Mediano 123 g, grande 182 g |
| lechuga-romana | Lechuga romana | usda | 17 | 1.23 | 3.29 |  | 0.3 | 0.039 | 2.1 | 0.02 |  |
| cebolla | Cebolla | usda | 40 | 1.1 | 9.3 |  | 0.1 |  |  |  | Mediana ≈ 110 g |
| pimiento-rojo | Pimiento rojo | usda | 31 | 1.0 | 6.0 |  | 0.3 |  |  |  |  |
| pimiento-verde | Pimiento verde | usda | 20 | 0.86 | 4.64 |  | 0.17 |  |  |  | Normal ≈ 100 g |
| calabacin | Calabacín | usda | 17 | 1.2 | 3.1 |  | 0.3 |  |  |  |  |
| patata-cruda | Patata cruda | usda | 77 | 2.05 | 17.5 |  | 0.09 | 0.025 | 2.1 | 0.015 |  |
| zanahoria-cruda | Zanahoria cruda | usda | 41 | 0.93 | 9.58 |  | 0.24 | 0.032 | 2.8 | 0.17 |  |
| sandia | Sandía | usda | 30 | 0.61 | 7.55 |  | 0.15 |  |  |  | 60 % comestible |
| melon | Melón | usda | 34 | 0.8 | 7.9 |  | 0.09 |  |  |  | 60 % comestible |
| datil-deglet-noor | Dátil seco Deglet Noor | usda | 282 | 2.45 | 75 |  | 0.39 |  |  |  | \~8 g/ud |
| queso-fresco-burgos | Queso fresco tipo Burgos | estimado | 174 | 12.4 | 3.3 |  | 13 |  |  |  |  |
| anchoa-aceite | Anchoas en aceite | estimado | 210 | 29 | 0 |  | 10 |  |  |  |  |
| aceite-oliva | Aceite de oliva / AOVE | usda | 884 | 0 | 0 | 0 | 100 | 13.8 | 0 | 0 |  |

**Usados solo como estimación (fuera del catálogo)**

| Producto | Fuente | kcal | Prot | HC | Grasa | Notas |
| --- | --- | --- | --- | --- | --- | --- |
| Carne picada 100 % vacuno Family Cash (mostrador) | estimado (ref. Eroski) | 170 | 20 | 0 | 10 | Rango entre marcas 164-209 kcal |
| Queso rallado 4 quesos Family Cash | estimado | 328 | 18 | 5.5 | 26 |  |
| Salsa de soja (con trigo) | usda | 53 | 8.1 | 4.9 | 0.6 | Sal 14.1 g; gluten sí |
| Anacardos tostados sin sal | usda | 574 | 15.3 | 29.4 | 46.4 | Azúcar 5.9, sat 9.2, fibra 3.3 |
| Plátano mediano pelado (118 g) | usda | 89 | 1.09 | 20.2 | 0.33 | Azúcar 12.2, fibra 2.6 |
| Empanada pollo thai Carrefour | valor nominal | 240 | 9 | 30 | 9 | 70 g/ud |

## Recetas habituales y lotes

Tres lotes cocinados se usan como ingrediente con su densidad por 100 g de cocinado.

| Lote | Composición (crudo) | kcal/100 g | Prot | HC | Grasa | Usado en |
| --- | --- | --- | --- | --- | --- | --- |
| Albóndigas (ago 2026) | 900 g carne picada vacuno Carrefour + 150 g patata + 70 g zanahoria + 60.75 g huevo + \~30 g aceite absorbido en fritura → 55 ud | 262.5 | 22.1 | 4.9 | 17.8 | 12/08, 14/08 |
| Guiso Mercadona (ago 2026) | 1 kg carne picada Mercadona + 1 cebolla mediana (\~110 g) + 2 pimientos verdes | 150.7 | 13.7 | 2.3 | 9.5 | 28/08 |
| Guiso Carrefour (sept 2026) | 900 g carne-picada-vacuno-cdc + 100 g pimiento verde + 110 g cebolla + 123 g tomate → 1183 g cocinado nominal | 166.3 | 15.7 | 2.0 | 11.1 | 08/09, 09/09, 11/09 |

**Tortilla de siempre**: 4 huevos camperos L (239.36 g comestible) + 3 lonchas de bacon (50 g) + mozzarella (30 g por defecto). Con 30 g de mozzarella da 558.7 kcal, 44.9 g de proteína, 41.0 g de grasa y 2.9 g de HC.

La carne «picada» de Mercadona resultó ser burger meat al 82 % (etiqueta del 22/10). El guiso del 28/08 se calculó con una ficha estimada casi idéntica (182/17/1/12), así que su energía apenas cambia; sí cambia la naturaleza del producto (sulfitos).

## Resumen por día

17 días con datos: 12 completos, 1 con un hueco declarado y 4 con solo la primera comida registrada.

| Fecha | Comidas | kcal | Prot (g) | Grasa (g) | HC (g) | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-22 | 1 | 1035.3 | 66.9 | 79.1 | 11.3 | Parcial (solo comida 1) |
| 2026-10-21 | 1 | 1081.2 | 68.6 | 82.8 | 12.3 | Parcial (solo comida 1) |
| 2026-10-20 | 4 | 1937.5 | 114.8 | 112.8 | 118.0 | Completo |
| 2026-10-05 | 1 | 739.0 | 61.6 | 53.1 | 3.8 | Parcial (solo comida 1) |
| 2026-09-15 | 1 | 853.3 | 59.5 | 65.2 | 11.8 | Parcial (solo comida 1) |
| 2026-09-11 | 2 | 1407.4 | 97.4 | 85.0 | 64.3 | Completo |
| 2026-09-10 | 1 | 465.0 | 15.6 | 30.0 | 42.8 | Completo según registro |
| 2026-09-09 | 3 | 1904.3 | 133.0 | 129.0 | 61.1 | Completo |
| 2026-09-08 | 2 | 1350.4 | 101.1 | 88.5 | 43.4 | Completo |
| 2026-08-28 | 3 | 1639.2 | 106.2 | 105.7 | 65.9 | Incompleto: falta empanada de ternera |
| 2026-08-27 | 3 | 2293.6 | 128.7 | 173.0 | 55.5 | Completo |
| 2026-08-26 | 2 | 1268.4 | 74.0 | 92.4 | 32.6 | Completo |
| 2026-08-25 | 2 | 1294.2 | 76.4 | 94.5 | 31.9 | Completo |
| 2026-08-14 | 3 | 2032.9 | 117.7 | 115.7 | 139.7 | Completo |
| 2026-08-13 | 3 | 1883.7 | 110.3 | 118.0 | 110.3 | Completo |
| 2026-08-12 | 3 | 2074.4 | 139.4 | 157.3 | 36.9 | Completo (reconstruido de producción) |
| 2026-08-11 | 3 | 1653.2 | 105.7 | 117.6 | 53.7 | Completo |

El 14/09 no aparece: sus tres comidas quedaron sin calcular (ver Huecos).

## Registro detallado por ingrediente

127 filas, una por ingrediente y comida, con la cantidad ya en porción comestible. Formato listo para importar a PostgreSQL o a una hoja.

```csv
fecha,comida,descripcion,ingrediente,cantidad_g,kcal,proteina_g,grasa_g,hc_g,fuente
2026-08-11,1,Tortilla francesa,Huevo campero L,239.36,337.51,30.40,23.22,1.63,bedca
2026-08-11,1,Tortilla francesa,Bacon lonchas Carrefour,50,131.50,7.00,11.50,0.50,etiqueta
2026-08-11,1,Tortilla francesa,Mozzarella rallada Carrefour,20,59.80,5.00,4.20,0.52,etiqueta
2026-08-11,2,Carne picada con arroz y verdura,Carne picada vacuno Carrefour,180,376.20,36.54,26.10,0.90,etiqueta
2026-08-11,2,Carne picada con arroz y verdura,Arroz blanco cocido,70,91.00,1.90,0.20,19.60,usda
2026-08-11,2,Carne picada con arroz y verdura,Pimiento rojo,15,4.70,0.15,0.05,0.90,usda
2026-08-11,2,Carne picada con arroz y verdura,Calabacín,20,3.40,0.24,0.06,0.62,usda
2026-08-11,3,Cacahuetes yogur y miel,Cacahuete Collaret,80,469.60,19.50,39.80,17.00,estimado (OFF)
2026-08-11,3,Cacahuetes yogur y miel,Yogur griego Carrefour Extra,125,156.25,5.00,12.50,6.25,etiqueta
2026-08-11,3,Cacahuetes yogur y miel,Miel flores eco Carrefour,7,23.20,0.00,0.00,5.80,etiqueta
2026-08-12,1,Tortilla francesa,Huevo campero L,240,338.40,30.48,23.28,1.63,bedca
2026-08-12,1,Tortilla francesa,Bacon lonchas Carrefour,50,131.50,7.00,11.50,0.50,etiqueta
2026-08-12,1,Tortilla francesa,Mozzarella rallada Carrefour,50,149.50,12.50,10.50,1.30,etiqueta
2026-08-12,2,Albóndigas (14 ud) con ensalada,Albóndigas (lote),224,587.93,49.55,39.89,10.98,lote
2026-08-12,2,Albóndigas (14 ud) con ensalada,Tomate cherry,25,4.50,0.22,0.05,0.97,usda
2026-08-12,2,Albóndigas (14 ud) con ensalada,Lechuga romana,25,4.25,0.31,0.08,0.82,usda
2026-08-12,2,Albóndigas (14 ud) con ensalada,Rulo de cabra,25,66.00,4.63,5.28,0.00,usda
2026-08-12,2,Albóndigas (14 ud) con ensalada,Aceite de oliva,15,132.60,0.00,15.00,0.00,usda
2026-08-12,3,Albóndigas (5 ud) yogur y cacahuetes,Albóndigas (lote),80,209.98,17.70,14.25,3.92,lote
2026-08-12,3,Albóndigas (5 ud) yogur y cacahuetes,Yogur griego Carrefour Extra,125,156.25,5.00,12.50,6.25,etiqueta
2026-08-12,3,Albóndigas (5 ud) yogur y cacahuetes,Cacahuete Collaret,50,293.50,12.00,25.00,10.50,etiqueta
2026-08-13,1,Tortilla + ciruelas,Huevo campero L,239.36,337.51,30.40,23.22,1.63,bedca
2026-08-13,1,Tortilla + ciruelas,Bacon lonchas Carrefour,50,131.50,7.00,11.50,0.50,etiqueta
2026-08-13,1,Tortilla + ciruelas,Mozzarella rallada Carrefour,20,59.80,5.00,4.20,0.52,etiqueta
2026-08-13,1,Tortilla + ciruelas,Ciruela sin hueso Consum,50,110.50,0.90,0.35,24.50,estimado (OFF)
2026-08-13,2,Carne con verdura arroz y aguacate,Carne picada vacuno Carrefour,200,418.00,40.60,29.00,1.00,etiqueta
2026-08-13,2,Carne con verdura arroz y aguacate,Pimiento rojo,30,9.40,0.30,0.10,1.80,usda
2026-08-13,2,Carne con verdura arroz y aguacate,Calabacín,30,5.10,0.36,0.09,0.93,usda
2026-08-13,2,Carne con verdura arroz y aguacate,Arroz blanco cocido,100,130.00,2.71,0.29,28.00,usda
2026-08-13,2,Carne con verdura arroz y aguacate,Aguacate,60,96.00,1.20,8.82,5.12,usda
2026-08-13,3,Sandía y cacahuetes,Sandía (60% de 646 g),387.6,116.28,2.36,0.58,29.26,usda
2026-08-13,3,Sandía y cacahuetes,Cacahuete Collaret,80,469.60,19.50,39.80,17.00,estimado (OFF)
2026-08-14,1,Tortilla + ciruelas,Huevo campero L,239.36,337.51,30.40,23.22,1.63,bedca
2026-08-14,1,Tortilla + ciruelas,Bacon lonchas Carrefour,50,131.50,7.00,11.50,0.50,etiqueta
2026-08-14,1,Tortilla + ciruelas,Mozzarella rallada Carrefour,30,89.70,7.50,6.30,0.78,etiqueta
2026-08-14,1,Tortilla + ciruelas,Ciruela sin hueso Consum,40,88.40,0.72,0.28,19.60,estimado (OFF)
2026-08-14,2,Cacahuetes con cáscara y melón,Cacahuete Collaret (75% de 100 g),75,440.25,18.28,37.31,15.94,estimado (OFF)
2026-08-14,2,Cacahuetes con cáscara y melón,Melón (60% de 520 g),312,106.08,2.50,0.28,24.65,usda
2026-08-14,3,Albóndigas con arroz queso y garbanzos,Albóndigas (lote),163,427.83,36.06,29.03,7.99,lote
2026-08-14,3,Albóndigas con arroz queso y garbanzos,Arroz blanco cocido,189,245.70,5.13,0.54,52.92,usda
2026-08-14,3,Albóndigas con arroz queso y garbanzos,Queso fresco tipo Burgos,45,78.30,5.58,5.85,1.49,estimado
2026-08-14,3,Albóndigas con arroz queso y garbanzos,Garbanzos cocidos bote,63,87.60,4.57,1.35,14.18,usda
2026-08-25,1,Tortilla francesa,Huevo campero L,239.36,337.51,30.40,23.22,1.63,bedca
2026-08-25,1,Tortilla francesa,Bacon lonchas Carrefour,50,131.50,7.00,11.50,0.50,etiqueta
2026-08-25,1,Tortilla francesa,Mozzarella rallada Carrefour,40,119.60,10.00,8.40,1.04,etiqueta
2026-08-25,2,Melón y cacahuetes Lidl,Melón (pulpa),240,81.60,1.92,0.22,18.96,usda
2026-08-25,2,Melón y cacahuetes Lidl,Cacahuetes Lidl,100,624.00,27.10,51.20,9.80,etiqueta
2026-08-26,1,Tortilla francesa,Huevo campero L,239.36,337.51,30.40,23.22,1.63,bedca
2026-08-26,1,Tortilla francesa,Bacon lonchas Carrefour,50,131.50,7.00,11.50,0.50,etiqueta
2026-08-26,1,Tortilla francesa,Mozzarella rallada Carrefour,30,89.70,7.50,6.30,0.78,etiqueta
2026-08-26,2,Melón y cacahuetes Lidl,Melón (pulpa),252,85.68,2.02,0.23,19.91,usda
2026-08-26,2,Melón y cacahuetes Lidl,Cacahuetes Lidl,100,624.00,27.10,51.20,9.80,etiqueta
2026-08-27,1,Tortilla francesa,Huevo campero L,239.36,337.51,30.40,23.22,1.63,bedca
2026-08-27,1,Tortilla francesa,Bacon lonchas Carrefour,50,131.50,7.00,11.50,0.50,etiqueta
2026-08-27,1,Tortilla francesa,Mozzarella rallada Carrefour,30,89.70,7.50,6.30,0.78,etiqueta
2026-08-27,2,Ensalada (500 de 734 g),Tomate grande,124.0,22.34,1.12,0.25,4.84,estimado
2026-08-27,2,Ensalada (500 de 734 g),Aguacate,102.2,163.49,2.04,15.02,8.72,usda
2026-08-27,2,Ensalada (500 de 734 g),Lechuga,68.1,11.58,0.84,0.20,2.24,usda
2026-08-27,2,Ensalada (500 de 734 g),Atún aceite oliva Carrefour (escurrido),72.9,145.78,18.22,7.29,0.00,estimado (OFF)
2026-08-27,2,Ensalada (500 de 734 g),Cebolla,34.1,13.62,0.37,0.03,3.17,estimado
2026-08-27,2,Ensalada (500 de 734 g),Anchoas en aceite,17.0,35.76,4.94,1.70,0.00,estimado
2026-08-27,2,Ensalada (500 de 734 g),Rulo de cabra,13.6,35.97,2.52,2.88,0.00,usda
2026-08-27,2,Ensalada (500 de 734 g),Queso de cabra Lidl,68.1,183.92,10.22,15.67,0.48,etiqueta
2026-08-27,3,Yogur pasas frankfurt cacahuetes,Yogur natural Andros,125,156.00,3.60,13.00,7.10,etiqueta
2026-08-27,3,Yogur pasas frankfurt cacahuetes,Pasas sultanas Consum,20,64.40,0.54,0.20,14.20,estimado (OFF)
2026-08-27,3,Yogur pasas frankfurt cacahuetes,Frankfurt Lidl,100,278.00,12.30,24.50,2.00,etiqueta
2026-08-27,3,Yogur pasas frankfurt cacahuetes,Cacahuetes Lidl,100,624.00,27.10,51.20,9.80,etiqueta
2026-08-28,1,Tortilla con frankfurt,Huevo campero L,239.36,337.51,30.40,23.22,1.63,bedca
2026-08-28,1,Tortilla con frankfurt,Bacon lonchas Carrefour (2),33.4,87.84,4.68,7.68,0.33,etiqueta
2026-08-28,1,Tortilla con frankfurt,Mozzarella rallada Carrefour,30,89.70,7.50,6.30,0.78,etiqueta
2026-08-28,1,Tortilla con frankfurt,Frankfurt Lidl,100,278.00,12.30,24.50,2.00,etiqueta
2026-08-28,2,Guiso Mercadona con arroz y aguacate,Guiso Mercadona (lote),300,452.10,41.07,28.60,7.01,lote
2026-08-28,2,Guiso Mercadona con arroz y aguacate,Arroz blanco cocido,100,130.00,2.71,0.29,28.00,usda
2026-08-28,2,Guiso Mercadona con arroz y aguacate,Aguacate,60,96.00,1.20,8.82,5.12,usda
2026-08-28,3,Empanadas Carrefour (incompleto),Empanada pollo thai,70,168.00,6.30,6.30,21.00,nominal
2026-09-08,1,Tortilla con cacahuetes,Huevo campero L,239.36,337.51,30.40,23.22,1.63,bedca
2026-09-08,1,Tortilla con cacahuetes,Bacon lonchas Carrefour,50,131.50,7.00,11.50,0.50,etiqueta
2026-09-08,1,Tortilla con cacahuetes,Mozzarella rallada Carrefour,20,59.80,5.00,4.20,0.52,etiqueta
2026-09-08,1,Tortilla con cacahuetes,Cacahuete Collaret,30,176.10,7.31,14.93,6.38,estimado (OFF)
2026-09-08,2,Guiso Carrefour con arroz,Guiso Carrefour (lote),310,515.50,48.71,34.33,6.33,lote
2026-09-08,2,Guiso Carrefour con arroz,Arroz blanco cocido,100,130.00,2.71,0.29,28.00,usda
2026-09-09,1,Tortilla con cacahuetes,Huevo campero L,239.36,337.51,30.40,23.22,1.63,bedca
2026-09-09,1,Tortilla con cacahuetes,Bacon lonchas Carrefour,50,131.50,7.00,11.50,0.50,etiqueta
2026-09-09,1,Tortilla con cacahuetes,Mozzarella rallada Carrefour,30,89.70,7.50,6.30,0.78,etiqueta
2026-09-09,1,Tortilla con cacahuetes,Cacahuete Collaret,40,234.80,9.75,19.90,8.50,estimado (OFF)
2026-09-09,2,Guiso Carrefour con arroz,Guiso Carrefour (lote),300,498.84,47.13,33.21,6.13,lote
2026-09-09,2,Guiso Carrefour con arroz,Arroz blanco cocido,100,130.00,2.71,0.29,28.00,usda
2026-09-09,3,Aguacate atún garbanzos tomate queso,Aguacate,90,144.00,1.80,13.23,7.68,usda
2026-09-09,3,Aguacate atún garbanzos tomate queso,Atún aceite oliva Carrefour (sin escurrir),70,140.00,17.50,7.00,0.00,estimado (OFF)
2026-09-09,3,Aguacate atún garbanzos tomate queso,Garbanzos cocidos bote,26,36.15,1.89,0.56,5.85,usda
2026-09-09,3,Aguacate atún garbanzos tomate queso,Tomate frito sin azúcar Carrefour,20,14.80,0.24,0.76,1.74,etiqueta
2026-09-09,3,Aguacate atún garbanzos tomate queso,Cheese in Brine Lidl,50,147.00,7.10,13.05,0.30,etiqueta
2026-09-10,1,Cacahuetes y dátiles,Cacahuete Collaret,60,352.20,14.63,29.85,12.75,estimado (OFF)
2026-09-10,1,Cacahuetes y dátiles,Dátil Deglet Noor (5 ud),40,112.80,0.98,0.16,30.01,usda
2026-09-11,1,Tortilla francesa,Huevo campero L,239.36,337.51,30.40,23.22,1.63,bedca
2026-09-11,1,Tortilla francesa,Bacon lonchas Carrefour,50,131.50,7.00,11.50,0.50,etiqueta
2026-09-11,1,Tortilla francesa,Mozzarella rallada Carrefour,30,89.70,7.50,6.30,0.78,etiqueta
2026-09-11,2,Guiso con arroz queso y garbanzos,Guiso Carrefour (lote),215,357.50,33.76,23.87,4.30,lote
2026-09-11,2,Guiso con arroz queso y garbanzos,Arroz blanco cocido,150,195.00,4.07,0.43,42.00,usda
2026-09-11,2,Guiso con arroz queso y garbanzos,Cheese in Brine Lidl,70,205.80,9.94,18.27,0.42,etiqueta
2026-09-11,2,Guiso con arroz queso y garbanzos,Garbanzos cocidos bote,65,90.38,4.71,1.39,14.63,usda
2026-09-15,1,Tortilla + cacahuetes (10:00),Huevo campero L,239.36,337.51,30.40,23.22,1.63,bedca
2026-09-15,1,Tortilla + cacahuetes (10:00),Bacon lonchas Carrefour,50,131.50,7.00,11.50,0.50,etiqueta
2026-09-15,1,Tortilla + cacahuetes (10:00),Mozzarella rallada Carrefour,50,149.50,12.50,10.50,1.30,etiqueta
2026-09-15,1,Tortilla + cacahuetes (10:00),Cacahuete Collaret,40,234.80,9.60,20.00,8.40,etiqueta
2026-10-05,1,Huevos carne y 4 quesos,Huevo campero L,239.36,337.51,30.40,23.22,1.63,bedca
2026-10-05,1,Huevos carne y 4 quesos,Carne picada 100% vacuno Family Cash,120,204.00,24.00,12.00,0.00,estimado
2026-10-05,1,Huevos carne y 4 quesos,Queso 4 quesos Family Cash,40,131.20,7.20,10.40,2.20,estimado
2026-10-05,1,Huevos carne y 4 quesos,Aceite de oliva,7.5,66.30,0.00,7.50,0.00,usda
2026-10-20,1,Carne huevos y soja,Burger meat Mercadona,120,218.40,20.40,14.40,1.08,etiqueta
2026-10-20,1,Carne huevos y soja,Huevo campero L,239.36,337.51,30.40,23.22,1.63,bedca
2026-10-20,1,Carne huevos y soja,Salsa de soja (con trigo),20,10.60,1.62,0.12,0.98,usda
2026-10-20,1,Carne huevos y soja,Aceite de oliva,7.5,66.30,0.00,7.50,0.00,usda
2026-10-20,2,Carne y arroz,Carne picada 100% vacuno Family Cash,220,374.00,44.00,22.00,0.00,estimado
2026-10-20,2,Carne y arroz,Arroz blanco cocido,180,234.00,4.88,0.52,50.40,usda
2026-10-20,2,Carne y arroz,Aceite de oliva,7.5,66.30,0.00,7.50,0.00,usda
2026-10-20,3,Anacardos y plátano,Anacardos tostados sin sal,80,459.20,12.24,37.12,23.52,usda
2026-10-20,3,Anacardos y plátano,Plátano mediano pelado,118,105.02,1.29,0.39,23.84,usda
2026-10-20,4,Infusiones con miel,Miel flores eco Carrefour,20,66.20,0.00,0.00,16.58,etiqueta
2026-10-21,1,Carne huevos y cacahuetes,Burger meat Mercadona,120,218.40,20.40,14.40,1.08,etiqueta
2026-10-21,1,Carne huevos y cacahuetes,Huevo campero L,239.36,337.51,30.40,23.22,1.63,bedca
2026-10-21,1,Carne huevos y cacahuetes,Cacahuete cáscara Family Cash (75% de 100 g),75,459.00,17.85,37.73,9.53,etiqueta
2026-10-21,1,Carne huevos y cacahuetes,Aceite de oliva,7.5,66.30,0.00,7.50,0.00,usda
2026-10-22,1,Carne huevos y cacahuetes,Burger meat Mercadona,120,218.40,20.40,14.40,1.08,etiqueta
2026-10-22,1,Carne huevos y cacahuetes,Huevo campero L,239.36,337.51,30.40,23.22,1.63,bedca
2026-10-22,1,Carne huevos y cacahuetes,Cacahuete cáscara Family Cash (75% de 90 g),67.5,413.10,16.07,33.95,8.57,etiqueta
2026-10-22,1,Carne huevos y cacahuetes,Aceite de oliva,7.5,66.30,0.00,7.50,0.00,usda
```

Desde el 15/09 hay azúcar, saturadas, fibra y sal por ingrediente en los cálculos del chat; aquí van solo los cuatro campos comunes a todo el histórico. Los valores por 100 g del catálogo permiten recalcular el resto.

## Huecos, pendientes y correcciones

Quedan abiertos un día entero sin calcular (14/09) y una comida sin cerrar (28/08).

- [ ] **14/09 sin calcular.** Comida 1 (10:00): 90 g cacahuetes nuevos (pesados; falta foto de etiqueta) + 60 g almendras al horno (a ojo). Comida 2 (15:30): ciorbă con pechuga de pollo; faltan cantidad, verduras, espesante o nata y peso del pollo. Comida 3 (18:45): 215 g arroz cocido + 2 latas atún Carrefour escurrido + 25 g AOVE (báscula) + 55 g maíz en lata Carrefour (¿escurrido?).
- [ ] **28/08, comida 3**: falta la empanada de ternera Aloloco; nunca se confirmó el peso.
- [ ] **Etiquetas pendientes**: carne picada 100 % vacuno y queso 4 quesos del Family Cash (05/10 y 20/10 van estimados).
- [ ] **Peso de la loncha de bacon**: el catálogo usa 16.7 g (envase); las tortillas antiguas del chat usaban \~11 g. La exportación reconciliada ya aplica 16.7 g.
- [ ] **Pimiento rojo y calabacín**: estaban fuera del catálogo de producción y de la lista de altas; ya están en el catálogo de la skill.

**Correcciones aplicadas en este documento**

| Fecha | Qué cambió | Antes | Ahora |
| --- | --- | --- | --- |
| 2026-10-22 | La carne de Mercadona es burger meat al 82 % (etiqueta) | Ficha estimada 180/17/3/12 | 182/17/0.9/12; sat y sal completas |
| 2026-10-21 | Misma carne + cacahuete Family Cash con etiqueta | 1078.8 kcal | 1081.2 kcal, HC 12.3 g |
| 2026-10-20 | Misma carne en comida 1 | 1935.1 kcal | 1937.5 kcal, HC 118.0 g |
| 2026-08-11 a 2026-09-11 | Reconciliación con el esquema de producción (bacon 50 g, huevo 239.36 g, 12/08 reconstruido) | Tablas antiguas del chat | Valores de la exportación CSV |

En el chat, las correcciones del 20 y 21/10 se dieron como 630.6 y 1078.6 kcal; estaban mal sumadas. Las cifras de aquí están recalculadas con 120 g × 182 kcal/100 g = 218.4 kcal.

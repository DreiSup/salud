# Encargo a Claude Design: panel de alimentación

Prompt que se pasó a Claude Design el 26/10/2026 para diseñar la web de `web/`. Las decisiones que lo justifican están en `docs/log-decisiones.md`. Desde entonces ha cambiado una cosa: el hosting será Vercel.

---

# Encargo: panel de alimentación diaria (solo lectura)

## Contexto
Registro lo que como hablando con Claude: le digo la comida y él calcula los nutrientes y los guarda como CSV en un repositorio público de GitHub (DreiSup/salud). Necesito una interfaz que convierta esos datos en algo que pueda consultar en 3 segundos, sin esfuerzo. Es un MVP para crear el hábito. Más adelante formará parte de Higía, mi app personal de salud, cuyo frontend previsto es Next.js + shadcn/ui con estética tipo Apple Health.

La interfaz es SOLO DE LECTURA: no hay botones para añadir, editar ni borrar comidas. Todo eso se hace hablando con Claude. Tampoco da consejos ni valora la dieta: nada de «¡bien hecho!» ni recomendaciones. Los colores informan; no juzgan.

## Tecnología
- React + Tailwind + shadcn/ui; gráficas con Recharts (los charts de shadcn). Pensado para exportarse como sitio estático (Next.js en Vercel o GitHub Pages).
- Sin backend: la página lee los CSV del repo al abrirse. Diseña los estados de carga, de error de red y de día sin registros.
- Escritorio (uso principal ahora, más espacio para gráficas) y móvil (lo esencial). Ambos importan.
- Modo claro y oscuro, siguiendo el del sistema.
- Interfaz en español; formato español: 1.850 kcal, 58,7 g, «lun 26 oct».

## Estilo
Minimalista, estilo Apple (Apple Health / Salud, Fitness): tipografía del sistema (SF Pro), mucho aire, tarjetas redondeadas, jerarquía por tamaño de número y no por adornos, animaciones sutiles. Opcionalmente un toque de liquid glass en barras de navegación. Dos protagonistas visuales: kcal y proteína. El resto de nutrientes, visibles pero secundarios.

## Metas y semáforo
Metas diarias (rangos), editables con el tiempo; cada día se evalúa con la meta vigente ese día:

| Nutriente | Rango | Tipo |
|---|---|---|
| Energía | 1.800–2.200 kcal | principal |
| Proteína | 150–200 g | principal |
| Hidratos disponibles | 130–250 g | secundario |
| Grasa | 45–85 g | secundario |
| Saturadas | máx. 22 g | secundario (solo tope) |
| Azúcares | máx. 90 g | secundario (solo tope) |
| Fibra | mín. 25 g | secundario (solo mínimo) |
| Sal | máx. 5 g | secundario (solo tope) |
| Cafeína | máx. 400 mg | secundario (solo tope) |

Colores (con el valor central, no con el margen de error):
- Neutro: por debajo del mínimo (o sin mínimo y lejos del tope). Un día cerrado por debajo del mínimo sigue en neutro, sin marca.
- Verde: dentro del rango.
- Amarillo: rozando el tope, entre el 95 % y el 105 % del máximo.
- Rojo: por encima del 105 % del máximo.
En kcal y proteína el estado debe notarse mucho (color del anillo/barra, número grande); en los secundarios, solo un indicador discreto.

## Particularidades de los datos (importante para el diseño)
- Cada valor tiene margen de error: «878 ± 53 kcal». Mostrarlo de forma discreta.
- Dato desconocido NO es 0. Si a una comida le falta un nutriente (p. ej. sin dato de azúcares), el total del día de ese nutriente es incompleto: mostrar algo como «≥ 12 g · falta dato en 1 comida», nunca un número que parezca completo.
- Gluten: por comida, sí / no / trazas / desconocido. Lactosa: en gramos. Quiero ver un aviso discreto en las comidas que lleven gluten o lactosa y el acumulado del día.
- Estado del día: abierto (hoy), completo, parcial o incompleto.
- Hago 3 comidas al día. Los días antiguos importados no tienen hora.
- Hay una lista de «pendientes» (datos por confirmar, p. ej. «falta la etiqueta de la carne de Family Cash»); quiero verla en una zona discreta.
- Los datos empiezan el 11/08/2026 y hay días sin registro.

## Pantallas

### 1. Día (pantalla principal)
- Navegación con flechas día anterior / siguiente y acceso a «hoy».
- Resumen arriba: kcal y proteína protagonistas, con consumido, rango y cuánto falta para llegar al mínimo y para el máximo.
- «Te quedan N comidas: entre A y B kcal y entre C y D g de proteína por comida» (lo que falta hasta el mínimo y hasta el máximo, dividido entre las comidas restantes de 3).
- Los secundarios en una cuadrícula o lista compacta con su semáforo.
- Registro del día: lista de comidas con hora, descripción, kcal ± error, proteína y avisos de gluten/lactosa. Al tocar una comida se despliegan sus ingredientes (nombre, cantidad en g o unidades, kcal y proteína de cada uno).
- Quiero VARIANTES del resumen para elegir: p. ej. (a) dos anillos tipo Actividad de Apple para kcal y proteína, (b) barras horizontales de progreso con la banda del rango marcada, (c) números grandes con una barra fina debajo. Propón la que creas mejor y al menos dos alternativas.

### 2. Semana
Como un calendario semanal pero sin horas: 7 columnas (lun–dom). En cada día, sus comidas como bloques (descripción, kcal, proteína) y abajo el total del día con el semáforo de kcal y proteína. Fila o pie con las medias de la semana. En móvil, adaptar (p. ej. lista vertical de días).

### 3. Mes / calendario
Cuadrícula mensual. Cada celda: número de día, kcal y proteína con su color, e indicador de cuántas comidas hay (p. ej. 3 puntos). Tocar un día abre la pantalla Día.

### 4. Tendencias
kcal y proteína por día frente a la banda de la meta, con selector de periodo (7 / 30 / 90 días). Quiero VARIANTES para elegir: barras diarias con la banda sombreada, línea con banda, y una tercera que propongas tú. Los días incompletos se distinguen visualmente (p. ej. barra con trama o más clara).

### 5. Metas
Vista (solo lectura) de los rangos vigentes y su historial de cambios con fechas. Texto breve: «Para cambiar una meta, díselo a Claude».

## Datos de ejemplo (reales)
Hoy, lunes 26/10/2026, día abierto, 1 comida de 3:
- 09:51 · Burrito de carne, huevo y queso · 878 ± 53 kcal · prot 58,7 g · HC 34,3 g · grasa 56,7 g · azúcares, saturadas y sal sin dato · gluten: sí (tortilla de trigo) · lactosa: sí (queso)
  - Tortilla de trigo Dia · 1 ud (60 g)
  - Carne picada vacuno Dia · 75 g en crudo
  - Carne picada ternera Family Cash · 75 g en crudo
  - Queso rallado 4 quesos Dia · 20 g
  - Huevo campero M/L Dia · 2,8 ud
  - Aceite de oliva · 14 g
Inventa con criterio el resto de días de la semana y del mes para que se vean todos los estados (verde, amarillo, rojo, neutro, día parcial, día sin datos, total incompleto).

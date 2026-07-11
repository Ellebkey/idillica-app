# Roadmap de producto

Features y decisiones de Idílica según salen de las pláticas con la repostera.
Cada entrada registra la necesidad original, qué se decidió y qué quedó para después.

## Hecho

### Escalado de recetas — "Preparar para N" (julio 2026)

**Necesidad**: "Si tengo una receta de 10 porciones, quiero mover la cantidad a 30
y que los ingredientes se ajusten". Y el matiz clave: no siempre es lineal — "cada
panadero con experiencia sabe".

**Decisiones**:

- **V1 = calculadora al producir**: el control "Preparar para" en la receta escala
  la vista (cantidades y costo del lote) sin guardar nada; la receta base queda
  intacta. Mientras se escala, las líneas son solo lectura.
- **Lo no lineal = lineal + aviso inteligente**: al escalar ≥2× se marcan en ámbar
  los ingredientes sensibles con su cantidad sugerida — leudantes al **75% de lo
  lineal** (el gas crece más rápido que la estructura) y sal/especias con
  **factor^0.7** (el sabor se concentra). La app solo sugiere; nunca ajusta sola.
- Cada ingrediente tiene **"¿cómo escala?"** (`normal | leudante | sazon`):
  auto-sugerido por nombre al crearlo, editable en su detalle. Los importados del
  Excel nacen "normal".
- **Integración elegida**: "Produje esta receta" hereda el factor y descuenta el
  inventario escalado (`POST /recetas/:id/producir` con `{factor}`).

**Referencias**: regla del 75% para leudantes al duplicar o más (pastrycal.com),
potencia 0.7 para sazón (cooklang.org), factor de conversión lineal como estándar
profesional (getmeez.com, marketman.com).

## Siguientes / V2

- **Tamaños vendibles (variantes)**: pastel de 10/20/30 personas como productos
  del catálogo con precio de venta propio (receta madre + variantes). Pendiente de
  confirmar que se venden tamaños fijos — si sí, requiere modelo de datos nuevo.
- **Ficha técnica escalada**: imprimir la ficha con las cantidades del lote
  escalado, como hoja de producción para el horno. Quedó fuera de la v1 a propósito.

## Backlog conocido (deuda del import de Excel)

- 154 ingredientes sin precio real (producto placeholder en $0) — se llenan con el
  botón `$` conforme se compra.
- 19 líneas candidatas a reconectarse como subreceta (necesitan rendimiento primero).
- Alérgenos no importados del Excel.
- Huevo importado en kg; debería medirse por pieza (corrección de datos).
- Mínimos de inventario en 0 para todo lo importado: las alertas "queda poco" se
  activan ingrediente por ingrediente al capturar su mínimo.

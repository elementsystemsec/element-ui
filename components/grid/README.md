# Grilla viva

Una retícula dibujada en canvas. Cada pocos segundos una celda crece, sus vecinas la acompañan y dentro aparece una imagen o un texto. Nunca tapa el contenido que marques con `data-grid-avoid`. Es la grilla del hero de los sitios de ELEMENT SYSTEMS convertida en componente.

**Archivos:** `element-grid.css`, `element-grid.js` · **API:** `ElementUI.Grid` · [Demo](demo.html)

## Uso

```html
<link rel="stylesheet" href="element-grid.css">

<section class="eui-grid" data-element-grid data-grid-mask="radial">
  <template data-grid-items>
    <img src="img/proyecto-1.webp" alt="">
    <span>¿Cuándo vence la tarea 2?</span>
    <img src="img/proyecto-2.webp" alt="">
  </template>

  <div class="eui-grid-halo" data-grid-avoid>
    <h1>Tu título</h1>
    <a href="#">Tu botón</a>
  </div>
</section>

<script defer src="element-grid.js"></script>
```

- Cada `<img>` de la plantilla se muestra como imagen (cubre la celda, alineada arriba). Cualquier otro elemento se muestra como texto sobre el color de acento.
- `data-grid-avoid` marca lo que nunca debe quedar tapado. Hazlo tan ajustado como puedas: si el bloque ocupa todo el ancho, no queda sitio para que crezca ninguna celda.
- El componente necesita un alto (por su contenido, `min-height` o `height`).

## Atributos

| Atributo | Qué hace | Por defecto |
|---|---|---|
| `data-grid-cell` | Lado de cada celda en px | `96` |
| `data-grid-cell-mobile` | Lado en pantallas de menos de 640 px | ⅔ del anterior |
| `data-grid-interval` | Milisegundos entre celdas | `3000` |
| `data-grid-delay` | Espera antes de la primera celda | `900` |
| `data-grid-grow` | Crecimiento de la celda: columna, fila | `2.9,2.3` |
| `data-grid-neighbor` | Crecimiento de las vecinas | `1.5` |
| `data-grid-ease` | Suavidad (más alto, más rápido) | `0.045` |
| `data-grid-radius` | Radio de las esquinas en px | `6` |
| `data-grid-gap` | Separación entre celdas en px | `2` |
| `data-grid-mask` | `radial`, `bottom` o `edges` | sin desvanecido |
| `data-grid-interactive` | `true`: la celda bajo el cursor también crece | `false` |
| `data-grid-autoplay` | `false`: solo con el cursor o con `next()` | `true` |
| `data-grid-avoid` | En el componente: selector propio de lo que no se debe tapar | `[data-grid-avoid]` |
| `data-grid-avoid-pad` | Margen alrededor de lo que no se debe tapar, en px | `30` |

## Colores

| Variable | Qué colorea | Claro |
|---|---|---|
| `--eui-grid-cell` | Las celdas: usa el color de fondo de tu página | `#fbfafd` |
| `--eui-grid-line` | Las líneas entre celdas | `rgba(23,24,26,.07)` |
| `--eui-grid-accent` | El fondo de las celdas con texto | `#dd6330` |
| `--eui-grid-label` | El texto de las celdas | `#15152a` |
| `--eui-grid-font` | La tipografía del texto | la del componente |

El tema oscuro se aplica con `data-theme="dark"` en `<html>` (o en el componente) o con la preferencia del sistema. Las variables por defecto tienen especificidad cero, así que cualquier clase tuya las sobrescribe.

## JavaScript

```js
const grid = ElementUI.Grid.get(document.querySelector('[data-element-grid]'));
grid.next();                                   // hace crecer otra celda ahora
grid.pause();  grid.resume();
grid.update({ cell: 72, interval: 2000, grow: [3, 2.4] });
grid.update({ items: true });                  // vuelve a leer la plantilla
grid.set({ gap: 8, radius: 12 });              // cambia separación y radio al instante (para animarlos)
grid.destroy();
ElementUI.Grid.mount(el);                      // grillas añadidas después de cargar
```

Solo dibuja mientras algo se mueve, se pausa fuera de pantalla y queda quieta con `prefers-reduced-motion`. El canvas es decorativo (`aria-hidden`).

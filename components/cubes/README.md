# Cubos isométricos

Retícula de cubos 3D con caras y bordes animados, desplazamiento alternado y reacción al cursor. Admite iconos o imágenes cuadradas (1:1) en la cara superior.

**Archivos:** `element-cubes.css`, `element-cubes.js`, carpeta `assets/` (iconos por defecto) · **API:** `ElementUI.Cubes` · [Demo](demo.html)

## Uso

```html
<link rel="stylesheet" href="element-cubes.css">

<div class="exhibit" data-element-cubes style="height:420px"
     data-eui-rows="5" data-eui-columns="7"
     data-eui-size="56" data-eui-gap="10"
     data-eui-face="#F7F3EF" data-eui-border="#DD6330"
     data-eui-mode="interactive">
  <div class="exhibit-scene"><div class="co-cube-wall"></div></div>
</div>

<script defer src="element-cubes.js"></script>
```

> El contenedor necesita una altura definida por CSS (`height` o `min-height`).

## Atributos

| Atributo | Función |
|---|---|
| `data-eui-rows` / `data-eui-columns` | Filas y columnas (si se omiten, se calculan según el espacio) |
| `data-eui-size` / `data-eui-gap` | Tamaño de cada cubo y separación, en px |
| `data-eui-face` / `data-eui-border` | Color de caras y bordes |
| `data-eui-mode` | `interactive`, `ambient`, `loading` o `static` |
| `data-eui-speed` | Multiplicador de velocidad (0.4–2.2) |
| `data-eui-radius` | Radio de reacción al cursor en px |
| `data-eui-intro` | `true` para animación de entrada |
| `data-eui-visuals` | `none`, `icons`, `images` o `mixed` |
| `data-eui-artwork` | Lista de imágenes propias separadas por comas (máx. 12). Las fotografías (JPG, PNG, WebP) cubren toda la cara superior |
| `data-eui-max` | Máximo de cubos (150 por defecto) cuando filas o columnas son automáticas: en pantallas grandes los cubos crecen en vez de multiplicarse. Con filas y columnas fijas, la matriz se escala entera para caber |
| `data-eui-rest` | Apertura mínima en reposo (0–0.6). Con pocos cubos grandes, `0.5` hace que se lean como cubos |
| `data-eui-repeat` | `true` reparte esas imágenes por toda la pared en lugar de solo en el centro |
| `data-eui-assets` | Carpeta de las imágenes (también de las de `data-eui-artwork` con ruta relativa). Por defecto, `assets/` junto a `element-cubes.js` |
| `data-icon-visibility` | `reveal` (aparecen al abrirse el cubo) o `always` |
| `data-eui-idle` | `false` para desactivar el movimiento en reposo |

## Logotipos y enlaces

Para redes sociales, habilidades, servicios o clientes, pon una plantilla dentro del componente. Cada elemento ocupa un cubo: al abrirse, la tapa toma el color de `data-top`, las aristas el de `data-edge` y el logotipo aparece encima. Si el elemento es un `<a>`, el cubo se puede pulsar.

```html
<div class="exhibit" data-element-cubes data-eui-rows="4" data-eui-columns="6" data-eui-size="72">
  <template data-eui-items>
    <a href="https://wa.me/593000000000" target="_blank" aria-label="WhatsApp" data-top="#ffffff" data-edge="#25D366">
      <img src="img/whatsapp.svg" alt="">
    </a>
    <span aria-label="JavaScript" data-top="#ffffff" data-edge="#E2C000"><img src="img/javascript.svg" alt="JavaScript"></span>
  </template>
  <div class="exhibit-scene"><div class="co-cube-wall"></div></div>
</div>
```

- Los SVG se muestran como logotipo centrado; las fotos (o `data-fit="cover"`) cubren la tapa.
- Las piezas se reparten alrededor del centro sin tocarse; con `data-eui-repeat="true"`, por toda la pared.
- Para el teclado, el componente añade una lista de enlaces oculta: al enfocar uno se abre su cubo.
- Con pocas piezas (casi tantas como cubos) se colocan en orden de lectura.
- `cubes.openItem(i)` abre la pieza número `i` y el evento `eui-cubes:item` avisa cuál está abierta (`detail.index`, `label`, `href`, `text` con `data-text`). Ejemplo de carrusel: `examples/integraciones.html`.
- Iconos de marca listos en `assets/icons/` (Simple Icons, CC0). Ejemplos: `examples/footer.html` y `examples/portafolio.html`.

## JavaScript

```js
const cubes = ElementUI.Cubes.get(document.querySelector('[data-element-cubes]'));
cubes.pause();
cubes.resume();
cubes.destroy();
ElementUI.Cubes.mount(el);
```

La animación de los cubos es la versión aprobada: no modificarla sin una revisión explícita.

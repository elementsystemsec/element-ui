# Olas

Agua animada que llena un espacio hasta el nivel que elijas. Tres bloques enormes y redondeados giran a distinto ritmo sobre la superficie y dibujan el oleaje; el nivel puede subir y bajar como una marea o animarse desde JavaScript (ideal para una carga con progreso). Para fondos, banners, pies de página, cabeceras de perfil y pantallas de carga.

**Archivos:** `element-waves.css`, `element-waves.js` · **API:** `ElementUI.Waves` · [Demo](demo.html)

## Uso

```html
<link rel="stylesheet" href="element-waves.css">

<section data-element-waves data-waves-level="40" data-waves-tide="true">
  <h1>Tu contenido</h1>
</section>

<script defer src="element-waves.js"></script>
```

El componente necesita un alto (por su contenido, `min-height` o `height`). Tu contenido queda siempre por encima del agua.

## Atributos

| Atributo | Qué hace | Por defecto |
|---|---|---|
| `data-waves-level` | Altura de la línea del agua, de 0 a 100 (de -25 a 125 la saca del todo, útil para transiciones) | `50` |
| `data-waves-curve` | Forma de la ola: `soft`, `medium` o `strong` | `medium` |
| `data-waves-speed` | Multiplicador de velocidad, de 0.2 a 4 | `1` |
| `data-waves-tide` | `true`: el nivel sube y baja | `false` |
| `data-waves-tide-amp` | Cuánto sube la marea, en % | `6` |
| `data-waves-tide-time` | Cuánto tarda la marea, en s | `6` |
| `data-waves-direction` | `down`: el agua cuelga desde arriba | `up` |
| `data-waves-rise` | Duración del cambio de nivel, en ms | `1200` |
| `data-waves-paused` | `true`: empieza quieto | `false` |

## Colores

| Variable | Qué colorea | Claro |
|---|---|---|
| `--eui-waves-bg` | El fondo sobre el agua; admite `transparent` | `#f7f3ef` |
| `--eui-waves-water` | El agua | `#dd6330` |
| `--eui-waves-foam`, `--eui-waves-foam-2` | Las dos olas de atrás | el agua al 55 % y al 30 % |

El tema oscuro se aplica con `data-theme="dark"` en `<html>` (o en el componente) o con la preferencia del sistema.

## JavaScript

```js
const waves = ElementUI.Waves.get(document.querySelector('[data-element-waves]'));
waves.setLevel(80);                 // sube el agua con transición
await waves.cover();                // transición: el agua sube y tapa todo ({ from: 'top' }: cae desde arriba)
await waves.uncover({ exit: 'up' }); // y sale por arriba ('down': se vacía hacia abajo)
waves.pause();  waves.resume();
waves.update({ curve: 'soft', speed: 1.4, tide: true });
waves.destroy();
ElementUI.Waves.mount(el);          // olas añadidas después de cargar
```

## Transiciones entre escenas

Pon un `data-element-waves` fijo a pantalla completa con `--eui-waves-bg: transparent` y `data-waves-level="-25"` (fuera de la vista). Para cambiar de escena:

```js
const curtain = ElementUI.Waves.get(document.querySelector('#telon'));
await curtain.cover({ from: 'bottom' });   // o 'top': el agua cae desde arriba
mostrarSiguienteEscena();                  // cambia lo que hay detrás mientras está tapado
await curtain.uncover({ exit: 'up' });     // o 'down': se vacía hacia abajo
```

`cover()` y `uncover()` aceptan `ms` (duración) y devuelven una promesa. Con movimiento reducido el cambio es inmediato. Ejemplo completo en `examples/transicion-olas.html`.

Fuera de pantalla deja de girar y con `prefers-reduced-motion` queda quieta en su nivel. El agua es decorativa (`aria-hidden`).

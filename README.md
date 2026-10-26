# Element UI

Componentes con movimiento para la web, de **ELEMENT SYSTEMS**. HTML, CSS y JavaScript sin frameworks ni dependencias: cada componente son dos archivos y funciona por separado.

![Ejemplos hechos con Element UI](media/preview.jpg)

[English](README_EN.md)

## Componentes

| Componente | Qué hace | Peso |
|---|---|---|
| [**Grilla viva**](components/grid/README.md) | Retícula en canvas: una celda crece y dentro aparece una imagen o un texto, sin tapar tu contenido | ~5.8 kB gzip |
| [**Cubos isométricos**](components/cubes/README.md) | Cubos 3D que se despliegan con el cursor, con logotipos, fotos y enlaces; también como fondo o indicador de carga | ~10.8 kB gzip |
| [**Olas**](components/waves/README.md) | Agua animada que llena un espacio hasta un nivel; sirve de fondo, de carga con progreso y de transición entre escenas | ~3.5 kB gzip |

Cada carpeta trae su `README.md` con todos los atributos y la API, y un `demo.html` que se abre sin servidor.

## Uso

**Desde el CDN** (cada versión etiquetada en GitHub queda disponible en jsDelivr):

```html
<!-- Todo el paquete -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/elementsystemsec/element-ui@v2.0.0/dist/element-ui.css">
<script defer src="https://cdn.jsdelivr.net/gh/elementsystemsec/element-ui@v2.0.0/dist/element-ui.js"></script>

<!-- O un solo componente -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/elementsystemsec/element-ui@v2.0.0/components/waves/element-waves.css">
<script defer src="https://cdn.jsdelivr.net/gh/elementsystemsec/element-ui@v2.0.0/components/waves/element-waves.js"></script>
```

**Copiando archivos:** lleva la carpeta `components/<id>/` a tu proyecto y enlaza sus dos archivos.

Después, un atributo `data-element-*` activa el componente:

```html
<section data-element-waves data-waves-level="40" data-waves-tide="true">
  <h1>Tu título</h1>
</section>
```

Todos se montan solos al cargar la página, respetan `prefers-reduced-motion`, se detienen fuera de pantalla y tienen tema claro y oscuro.

## Ejemplos

En [`examples/`](examples/) hay páginas completas hechas con los componentes, agrupadas por uso y con variantes para comparar: hero, inicio de sesión, pantalla de carga, banner de perfil, banners en cuatro formatos, pie de página, transición entre escenas, portafolio e integraciones. Ábrelas, copia el HTML y adáptalo.

Para verlas en línea, activa **Settings → Pages → Deploy from a branch → `main` / `(root)`**: quedan en `https://elementsystemsec.github.io/element-ui/examples/`. En local: `npm run serve`.

## Estructura

```
components/<id>/       ← el componente: element-<id>.css · element-<id>.js · README.md · demo.html
components.json        ← registro: nombre, descripción, categorías, archivos, API
dist/                  ← todo el paquete en un archivo (generado)
examples/              ← los componentes en páginas reales
assets/                ← fotografías e iconos de los ejemplos (ver sus CREDITS.md)
templates/component/   ← plantilla para componentes nuevos
scripts/               ← new · build · check · serve (Node 18+, sin dependencias) · photos.py
```

## Añadir un componente

```bash
npm run new -- tabs "Pestañas" "Pestañas accesibles con indicador animado." "Navegación"
```

Crea `components/tabs/` (CSS, JS, README y demo) y lo registra como `experimental`. Después:

1. Programa el componente: `npm run serve` → `http://localhost:5173/components/tabs/demo.html`.
2. Documenta atributos y API en su `README.md`.
3. `npm run check && npm run build`.
4. Anota el cambio en `CHANGELOG.md`, sube la versión en `package.json` y publica.

Las reglas de cada componente están en [CONTRIBUTING.md](CONTRIBUTING.md).

## Publicar una versión

```bash
npm run check && npm run build
git add -A && git commit -m "Componente Pestañas"
git tag v2.1.0 && git push && git push --tags
```

Versiones semánticas: **parche** (2.0.1) para correcciones, **menor** (2.1.0) para componentes u opciones nuevas, **mayor** (3.0.0) si cambian clases, atributos o archivos que otras webs ya usan.

Si publicas el repositorio en otra cuenta o con otro nombre, cambia `elementUI.repo` en `package.json` y los enlaces del CDN de este README.

## Créditos y licencia

Fotografías de los ejemplos generadas con ChatGPT y de Magnific (designed by wirestock - Magnific.com y designed by rawpixel.com - Magnific.com); iconos de Simple Icons. Detalle en [`assets/photos/CREDITS.md`](assets/photos/CREDITS.md) y [`assets/icons/CREDITS.md`](assets/icons/CREDITS.md). Los ejemplos usan Hanken Grotesk y JetBrains Mono de Google Fonts; los componentes no cargan fuentes.

Código bajo licencia MIT ([LICENSE](LICENSE)). La marca y el isotipo de ELEMENT SYSTEMS se usan como autoría y no se ofrecen como recursos reutilizables.

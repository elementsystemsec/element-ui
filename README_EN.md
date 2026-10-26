# Element UI

Motion components for the web by **ELEMENT SYSTEMS**. Plain HTML, CSS and JavaScript, no framework, no dependencies; each component is two files and works on its own. Full documentation is in Spanish: [README.md](README.md).

![Examples built with Element UI](media/preview.jpg)

- **Living Grid** (`components/grid/`, `ElementUI.Grid`): a canvas grid where one cell grows at a time, its neighbours follow, and an image or a text label appears inside, never covering the content you mark with `data-grid-avoid`.
- **Isometric Cubes** (`components/cubes/`, `ElementUI.Cubes`): 3D cubes that unfold on hover, with logos, photos and links on specific cubes; ambient, loading and static modes.
- **Waves** (`components/waves/`, `ElementUI.Waves`): animated water that fills a space up to a level. Use it as a background, as a progress indicator (`setLevel()`), or as a scene transition (`await cover()` / `await uncover()`).

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/elementsystemsec/element-ui@v2.0.0/dist/element-ui.css">
<script defer src="https://cdn.jsdelivr.net/gh/elementsystemsec/element-ui@v2.0.0/dist/element-ui.js"></script>
```

Full-page examples (hero, login, loading, profile banners, banners, footer, transitions…) live in [`examples/`](examples/), grouped by use with variants per component.

Add a component with `npm run new -- tabs "Tabs"`: it creates the component folder from the template and registers it. Then `npm run check && npm run build`. MIT license.

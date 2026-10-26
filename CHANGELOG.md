# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado semántico.

## [2.0.0] - 2026-10-26

Primera versión pública.

### Componentes
- **Grilla viva** (`grid`): retícula en canvas donde una celda crece, sus vecinas la acompañan y dentro aparece una imagen o un texto, sin tapar lo marcado con `data-grid-avoid`. Desvanecidos (`radial`, `bottom`, `edges`), reacción al cursor (también con el componente transformado en 3D) y API `next()`, `pause()`, `resume()`, `update()`, `set({ gap, radius })` y `destroy()`.
- **Cubos isométricos** (`cubes`): cubos 3D que se despliegan con el cursor, en modos interactivo, ambiente, carga y estático. `<template data-eui-items>` pone logotipos, fotos y enlaces en cubos concretos, con color de tapa y de aristas por cubo y lista accesible para el teclado. Fotografías propias con `data-eui-artwork` y `data-eui-repeat`, apertura mínima con `data-eui-rest`, límite de cubos con `data-eui-max`, proporción conservada en pantallas pequeñas, `openItem(i)` y evento `eui-cubes:item`.
- **Olas** (`waves`): agua animada con tres olas que giran a distinto ritmo, marea opcional y nivel animable con `setLevel()`. El aire queda transparente, así que funciona sobre fotos y colores. Transiciones entre escenas con `await cover({ from })` y `await uncover({ exit })`.

### Ejemplos
- Páginas completas en `examples/`, agrupadas por uso y con variantes por componente: hero, inicio de sesión, pantalla de carga, banner de perfil, banners en cuatro formatos, pie de página, transición entre escenas, portafolio e integraciones. Índice en `examples/index.html`.

### Herramientas
- `npm run new` crea un componente desde `templates/component/` y lo registra en `components.json`; `npm run build` genera `dist/`; `npm run check` valida estructura y enlaces; `npm run serve` sirve el proyecto en local. Sin dependencias.
- `scripts/photos.py` regenera los recortes de las fotografías de los ejemplos a partir de un original (ver `assets/photos/PROMPTS.md`).

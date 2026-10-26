# Cómo añadir y mantener componentes

## Reglas de cada componente

1. **Independiente.** Vive en `components/<id>/` y funciona solo con sus archivos. Su `demo.html` no carga nada más, y además es la vista previa de la galería: debe verse bien a pantalla completa y en una tarjeta.
2. **Sin dependencias.** HTML, CSS y JavaScript nativos.
3. **Nombres con prefijo.** Archivos `element-<id>.css/js`, clases `eui-<id>…`, atributo de montaje `data-element-<id>`, opciones `data-<id>-…`, variables `--eui-<id>-…`.
4. **API común.** `window.ElementUI.<Nombre>` con `mount(el)`, `mountAll()` y `get(el)`. Cada instancia tiene `update(opciones)` y `destroy()`. Se monta sola al cargar la página.
5. **Configuración en HTML** con atributos `data-*`, con valores por defecto y límites validados.
6. **Colores por variables CSS** con `:where()` para que cualquier clase del usuario las sobrescriba. Tema oscuro con `data-theme="dark"` y con la preferencia del sistema.
7. **Accesibilidad.** Respeta `prefers-reduced-motion`; lo decorativo lleva `aria-hidden`; lo interactivo se usa con teclado.
8. **Rendimiento.** Anima solo mientras haya algo que mover y se detiene fuera de pantalla.
9. **Documentado.** README del componente con ejemplo mínimo, tabla de atributos, variables CSS y API, y una `demo.html` que se abre sin servidor.

`npm run new -- <id>` crea todo esto desde `templates/` con los nombres correctos.

## Flujo de trabajo

```bash
npm run new -- <id> "Nombre" "Descripción" "Categoría"
npm run serve      # http://localhost:5173
npm run check      # estructura, registro y enlaces
npm run build      # dist/
```

Un componente nuevo empieza como `experimental`. Pásalo a `stable` en `components.json` cuando sus clases y atributos ya no vayan a cambiar. Incluye `dist/` en el commit: la integración continua comprueba que esté al día.

## Qué no cambiar sin revisión

- La animación aprobada de los cubos isométricos y el comportamiento de la grilla viva (es la de los sitios de ELEMENT SYSTEMS).
- Clases, atributos o archivos de componentes `stable`: otras webs dependen de ellos. Cambiarlos es una versión mayor.

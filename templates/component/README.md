# __NAME__

__DESCRIPTION__

**Archivos:** `element-__ID__.css`, `element-__ID__.js` · **API:** `ElementUI.__CLASS__` · [Demo](demo.html)

## Uso

```html
<link rel="stylesheet" href="element-__ID__.css">

<div class="eui-__ID__" data-element-__ID__>
  …
</div>

<script defer src="element-__ID__.js"></script>
```

## Atributos

| Atributo | Función | Valor inicial |
|---|---|---|
| `data-__ID__-motion` | `on` / `off` | `on` |

## JavaScript

```js
const instance = ElementUI.__CLASS__.get(document.querySelector('[data-element-__ID__]'));
instance.update({ motion: false });
instance.destroy();
```

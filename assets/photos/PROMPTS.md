# Fotografías: qué reemplazar y cómo

Cada fotografía es una **ranura**: un nombre (`dalia`, `oleaje`, …) del que salen varios recortes. Para cambiarla no hay que tocar HTML: basta un original nuevo con el mismo nombre.

## Flujo

1. Genera o descarga la imagen en el **formato del original** que indica la tabla (cuadrado 1:1 para casi todas).
2. Guárdala como `assets/photos/src/<ranura>.jpg` (o `.png`, `.webp`), por ejemplo `assets/photos/src/dalia.jpg`.
3. Ejecuta `python3 scripts/photos.py` (o `python3 scripts/photos.py dalia` para una sola). Se regeneran todos los recortes de esa ranura con su tamaño exacto.
4. Si el sujeto queda mal encuadrado, indica el foco en `assets/photos/src/focus.json`: `{ "dalia": [0.5, 0.4] }` (x e y de 0 a 1).
5. Actualiza la fila de la ranura en `CREDITS.md` con el autor, el enlace y la licencia.

Tamaño mínimo del original: 2048 px por lado (4096 si la escalas con Magnific). Evita texto, logotipos y caras reconocibles: aparecen recortadas en cubos y celdas pequeñas.

## Estilo común

Añade este final a cada prompt para que todas parezcan de la misma serie, sobre papel claro y con la paleta Arcilla, Brasa y Noche:

> editorial fine-art photograph, natural light, warm terracotta (#DD6330) and soft peach (#F29A6B) accents against deep navy (#15152A) shadows, muted paper-like tones, clean composition with negative space, high detail, no text, no logos, no people

En el generador de Freepik usa un modelo fotográfico (Mystic o Flux), estilo «Photo», sin filtros. Para escalar, Magnific con *creativity* baja (0 a 2) para no inventar detalles.

## Ranuras

| Ranura | Formato del original | Dónde aparece | Recortes |
|---|---|---|---|
| `arquitectura` | 1:1 | Celdas del hero y de la Grilla, login con cubos y con grilla, banners, perfiles | 4:3, 1:1, 3:4 |
| `dalia` | 1:1 | Hero, cubos, historia 9:16 de los banners, perfiles | 4:3, 1:1, 3:4 |
| `orbita` | 1:1 | Celdas del hero, demo de la Grilla, banners con cubos | 4:3, 1:1 |
| `oleaje` | 1:1 | Hero con olas (arco), transición (escena 1), cubos | 4:3, 1:1 |
| `linterna` | 1:1 | Sala de componentes, perfiles | 4:3, 1:1, 3:4 |
| `canon` | 1:1 | Hero, cubos, perfiles | 4:3, 1:1, 3:4 |
| `petalos` | 1:1 | Login con grilla, cubos, perfiles | 4:3, 1:1 |
| `helecho` | 1:1 | Login con grilla, cubos, perfiles | 4:3, 1:1 |
| `cumbre` | 1:1 | Portada, login con grilla, transición (escena 3) | 4:3, 1:1 |
| `muelle` | 4:5 | Portada (cómo se usa), pie con olas | 4:5 |
| `noche` | 16:9 | Llamada final de la portada, transición (escena 4) | 16:9 |

### Prompts y búsquedas

**arquitectura** · Fachada que se lee como patrón geométrico.
- Prompt: `low-angle view of a modernist terracotta apartment facade with repeating rounded balconies, rhythmic geometric pattern, pale sky`
- Freepik: «terracotta modernist facade», «fachada geométrica minimalista»

**dalia** · La flor que más destaca sobre fondo oscuro.
- Prompt: `macro of a single dahlia in burnt orange and peach petals, centered, deep navy background, shallow depth of field`
- Freepik: «orange dahlia macro dark background»

**orbita** · Algo técnico y luminoso; sustituye al cohete actual.
- Prompt: `long-exposure orbital light trails curving over a deep navy night sky, warm orange trail, minimal horizon`
- Freepik: «light trails night sky minimal», «abstract orbit long exposure»

**oleaje** · Mar visto desde arriba; aparece junto a las olas del componente.
- Prompt: `aerial top-down view of a wave breaking on a beach at golden hour, foam lines, warm sunlight on wet sand, teal and terracotta tones`
- Freepik: «aerial ocean wave golden hour»

**linterna** · Luz cálida y artesanal.
- Prompt: `paper lantern glowing warm orange at dusk, soft bokeh, navy blue evening, close-up`
- Freepik: «paper lantern glow night bokeh»

**canon** · La foto más afín a la paleta: roca terracota.
- Prompt: `sculpted sandstone canyon walls with flowing layers, warm terracotta light, deep shadow, abstract`
- Freepik: «antelope canyon abstract», «sandstone layers orange»

**petalos** · Textura suave sobre papel.
- Prompt: `scattered peach and coral petals on textured off-white paper, top-down, soft window light, lots of negative space`
- Freepik: «petals on paper flat lay minimal»

**helecho** · El contrapunto verde; mantenlo oscuro para que no compita.
- Prompt: `fern fronds unfurling in low warm light, dark navy background, fine detail, moody botanical`
- Freepik: «fern dark moody macro»

**cumbre** · Montaña con cielo amplio, el texto de la transición va encima.
- Prompt: `granite mountain ridge at first light, warm alpenglow on the peaks, misty valley, wide sky in the upper third`
- Freepik: «alpenglow mountain ridge», «dolomites sunrise»

**muelle** (4:5) · Calma, horizonte bajo.
- Prompt: `long wooden pier into a still lake at sunset, peach and terracotta sky reflected in the water, vertical composition`
- Freepik: «wooden pier sunset lake vertical»

**noche** (16:9) · Fondo de la llamada final: mucho espacio oscuro arriba para el titular.
- Prompt: `snow-capped mountain at blue hour, last warm light on the summit, deep navy sky occupying the top half, cinematic wide`
- Freepik: «snow mountain blue hour wide»

## Licencias

- **Generadas con IA en Freepik:** con plan de pago puedes usarlas comercialmente sin atribución. Anota «Generada con Freepik AI» y la fecha en `CREDITS.md`.
- **Fotos de stock de Freepik:** las gratuitas exigen atribución visible («Imagen de autor en Freepik»); las Premium, no. Guarda el enlace de cada una.
- **Unsplash y Pexels:** no exigen atribución, pero conviene mantenerla en `CREDITS.md`.

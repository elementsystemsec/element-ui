#!/usr/bin/env python3
"""ELEMENT UI · reemplaza las fotografías del sitio a partir de originales grandes.

Pon cada original en assets/photos/src/ con el nombre de su ranura (dalia.jpg, oleaje.png, …).
El script genera los mismos recortes que ya existen para esa ranura, con su tamaño exacto:
  <ranura>.webp     horizontal (o el formato que ya tenga: muelle es 4:5, noche es 16:9)
  <ranura>-sq.webp  cuadrado, para las caras de los cubos
  <ranura>-v.webp   vertical 3:4, para tarjetas y perfiles

Recorte centrado; para mover el centro de interés crea assets/photos/src/focus.json:
  { "dalia": [0.5, 0.4] }      (x e y de 0 a 1)

Uso:  python3 scripts/photos.py            (todas las ranuras con original)
      python3 scripts/photos.py dalia      (solo esa)
Requiere Pillow:  pip install pillow
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'photos'
SRC = ROOT / 'src'
QUALITY = 84


def crop(im, w, h, fx=.5, fy=.5):
    """Recorta al formato w:h alrededor del foco y escala a w×h."""
    W, H = im.size
    target = w / h
    if W / H > target:
        cw, ch = round(H * target), H
    else:
        cw, ch = W, round(W / target)
    x = min(max(round(fx * W - cw / 2), 0), W - cw)
    y = min(max(round(fy * H - ch / 2), 0), H - ch)
    return im.crop((x, y, x + cw, y + ch)).resize((w, h), Image.LANCZOS)


def main(only):
    focus = json.loads((SRC / 'focus.json').read_text()) if (SRC / 'focus.json').exists() else {}
    originals = [p for p in sorted(SRC.glob('*')) if p.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp', '.avif')]
    if not originals:
        sys.exit(f'No hay originales en {SRC}')
    for src in originals:
        name = src.stem.lower()
        if only and name not in only:
            continue
        outs = sorted(ROOT.glob(f'{name}.webp')) + sorted(ROOT.glob(f'{name}-*.webp'))
        if not outs:
            print(f'· {name}: no existe esa ranura en assets/photos (se omite)')
            continue
        im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
        fx, fy = focus.get(name, (.5, .5))
        for out in outs:
            w, h = Image.open(out).size
            if im.width < w or im.height < h:
                print(f'  ! {src.name} ({im.width}×{im.height}) es más pequeño que {out.name} ({w}×{h}): se amplía')
            crop(im, w, h, fx, fy).save(out, 'WEBP', quality=QUALITY, method=6)
            print(f'✔ {out.name}  {w}×{h}  {out.stat().st_size // 1024} kB')


if __name__ == '__main__':
    main(set(a.lower() for a in sys.argv[1:]))

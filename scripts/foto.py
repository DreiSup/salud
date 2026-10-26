#!/usr/bin/env python3
"""
Comprime la foto de una etiqueta y la guarda en fotos/ con el nombre normalizado.

Uso:
  python scripts/foto.py <imagen> <id-alimento> <frontal|tabla|ingredientes> [AAAA-MM-DD]

Requiere Pillow (pip install pillow). Imprime la ruta, lista para la columna `foto` de la fuente.
"""
import sys
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CARAS = {"frontal", "tabla", "ingredientes"}
LADO_MAX = 1600
CALIDAD = 80


def main(argv):
    if len(argv) not in (3, 4) or argv[2] not in CARAS:
        print(__doc__.strip(), file=sys.stderr)
        return 1
    try:
        from PIL import Image, ImageOps
    except ImportError:
        print("ERROR: falta Pillow. Instálalo con: pip install pillow", file=sys.stderr)
        return 1
    origen, aid, cara = Path(argv[0]), argv[1], argv[2]
    fecha = argv[3] if len(argv) == 4 else date.today().isoformat()
    destino = REPO / "fotos" / f"{aid}_{cara}_{fecha}.webp"
    with Image.open(origen) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((LADO_MAX, LADO_MAX))
        im.save(destino, "WEBP", quality=CALIDAD, method=6)
    kb = destino.stat().st_size / 1024
    print(f"fotos/{destino.name}  ({kb:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

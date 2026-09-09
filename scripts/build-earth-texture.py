#!/usr/bin/env python3
"""
Builds the globe's coastline textures from real Natural Earth country
polygons, rather than a hand-approximated coastline.

Source data: datasets/geo-countries (Natural Earth via the Open Data Commons
Public Domain Dedication and License), 258 country polygons.
  https://github.com/datasets/geo-countries

Usage:
    pip install pillow
    python3 scripts/build-earth-texture.py

Regenerates public/textures/earth-color.png and earth-emissive.png.

Coordinate convention: output is a standard equirectangular map (row 0 =
north pole, x = 0 at lng = -180), which lines up with three.js's default
SphereGeometry UVs because TextureLoader textures default to flipY = true.
See src/lib/geo-utils.ts:latLngToVector3 for the corresponding vertex mapping.
"""

import json
import subprocess
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

GEOJSON_URL = (
    "https://raw.githubusercontent.com/datasets/geo-countries/main/data/countries.geojson"
)
OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "textures"
WIDTH, HEIGHT = 2048, 1024

OCEAN_RGB = (10, 15, 29)  # #0A0F1D
LAND_RGB = (30, 41, 59)  # #1E293B
COASTLINE_BLUR_PX = 1.1
LAND_EMISSIVE_STRENGTH = 0.22  # 0-1, faint self-glow so land reads on the dark side


def fetch_geojson(cache_path: Path) -> dict:
    if cache_path.exists():
        return json.loads(cache_path.read_text())
    print(f"Downloading {GEOJSON_URL} ...")
    with urllib.request.urlopen(GEOJSON_URL, timeout=60) as response:
        raw = response.read()
    cache_path.write_bytes(raw)
    return json.loads(raw)


def lonlat_to_xy(lon: float, lat: float) -> tuple[float, float]:
    x = (lon + 180.0) / 360.0 * WIDTH
    y = (90.0 - lat) / 180.0 * HEIGHT
    return (x, y)


def rasterize_land_mask(geojson: dict) -> Image.Image:
    mask = Image.new("L", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(mask)
    drawn = 0

    for feature in geojson["features"]:
        geometry = feature.get("geometry")
        if not geometry:
            continue

        polygons = (
            [geometry["coordinates"]]
            if geometry["type"] == "Polygon"
            else geometry["coordinates"]
            if geometry["type"] == "MultiPolygon"
            else []
        )

        for polygon in polygons:
            # Outer ring only: holes are imperceptible at this raster scale.
            outer_ring = polygon[0]
            points = [lonlat_to_xy(lon, lat) for lon, lat in outer_ring]
            if len(points) >= 3:
                draw.polygon(points, fill=255)
                drawn += 1

    print(f"Rasterized {drawn} polygon rings from {len(geojson['features'])} countries")
    return mask


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = OUT_DIR.parent.parent / ".geo-countries-cache.geojson"

    geojson = fetch_geojson(cache_path)
    mask = rasterize_land_mask(geojson)
    mask = mask.filter(ImageFilter.GaussianBlur(COASTLINE_BLUR_PX))

    color = Image.composite(
        Image.new("RGB", (WIDTH, HEIGHT), LAND_RGB),
        Image.new("RGB", (WIDTH, HEIGHT), OCEAN_RGB),
        mask,
    )
    emissive = mask.point(lambda p: int(p * LAND_EMISSIVE_STRENGTH))

    # Quantizing the (near two-tone) color map compresses far better than RGB.
    color = color.convert("RGB").quantize(colors=64, method=Image.MEDIANCUT)

    color.save(OUT_DIR / "earth-color.png", optimize=True)
    emissive.save(OUT_DIR / "earth-emissive.png", optimize=True)
    print(f"Wrote {OUT_DIR / 'earth-color.png'} and earth-emissive.png")


if __name__ == "__main__":
    sys.exit(main())

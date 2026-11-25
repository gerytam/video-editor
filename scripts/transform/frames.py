"""Build matched 9:16 start/end frames for AI before->after transformations.

    python3 scripts/transform/frames.py jobs/<client>-transform.json

For each pair writes <framesDir>/<id>-start.jpg (the before photo, cropped to
9:16 around beforeCenterX and upscaled) and <id>-end.jpg (the edited after
photo), both 1080x1920, plus <framesDir>/pairs-preview.jpg to eyeball them.
"""
import json
import os
import sys

from PIL import Image, ImageFilter, ImageOps

W, H = 1080, 1920


def trim_bars(im):
    """Drop solid black/white strips at the edges (screenshots of listings)."""
    g = im.convert("L")
    w, h = g.size
    px = g.load()

    def flat(line):
        lo, hi = min(line), max(line)
        return hi - lo < 12 and (hi < 30 or lo > 235)

    top = 0
    while top < h // 8 and flat([px[x, top] for x in range(0, w, 4)]):
        top += 1
    bot = h
    while bot > h - h // 8 and flat([px[x, bot - 1] for x in range(0, w, 4)]):
        bot -= 1
    left = 0
    while left < w // 8 and flat([px[left, y] for y in range(0, h, 4)]):
        left += 1
    right = w
    while right > w - w // 8 and flat([px[right - 1, y] for y in range(0, h, 4)]):
        right -= 1
    return im.crop((left, top, right, bot))


def fit_9x16(im, center_x=0.5):
    im = trim_bars(ImageOps.exif_transpose(im).convert("RGB"))
    aspect = W / H
    if im.width / im.height > aspect:
        cw = round(im.height * aspect)
        x = round(center_x * im.width - cw / 2)
        x = max(0, min(im.width - cw, x))
        im = im.crop((x, 0, x + cw, im.height))
    else:
        ch = round(im.width / aspect)
        y = (im.height - ch) // 2
        im = im.crop((0, y, im.width, y + ch))
    scale = H / im.height
    im = im.resize((W, H), Image.LANCZOS)
    if scale > 1.3:
        # Upscaled listing photos come out soft; a light sharpen helps the
        # video model hold detail on the first frames.
        im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    return im


def main():
    job = json.load(open(sys.argv[1]))
    out = job["framesDir"]
    os.makedirs(out, exist_ok=True)
    thumbs = []
    for p in job["pairs"]:
        start = fit_9x16(Image.open(os.path.join(job["beforeDir"], p["before"])), p.get("beforeCenterX", 0.5))
        end = fit_9x16(Image.open(os.path.join(job["afterDir"], p["after"])))
        start.save(os.path.join(out, f"{p['id']}-start.jpg"), quality=94)
        end.save(os.path.join(out, f"{p['id']}-end.jpg"), quality=94)
        thumbs += [start.resize((270, 480)), end.resize((270, 480))]
        print("ok", p["id"])
    sheet = Image.new("RGB", (len(thumbs) * 280, 480), "white")
    for i, t in enumerate(thumbs):
        sheet.paste(t, (i * 280 + (10 if i % 2 else 0), 0))
    sheet.save(os.path.join(out, "pairs-preview.jpg"), quality=85)


if __name__ == "__main__":
    main()

"""Prepare stills for the Walkthrough composition.

For every image listed in a walkthrough job it writes, into the job's asset
folder under public/:

  <name>.jpg        the photo, upright, resized (long side 2880)
  <name>.depth.png  8-bit depth map (white = near), for the 3D camera move
  <name>.lines.json straight architectural line segments, for the blueprint
                    draw-on, normalized 0..1 and sorted in drawing order

Usage:
  python3 scripts/walkthrough/prep.py jobs/turnkey-walkthrough.json

The depth model is Depth Anything V2 (small, ONNX). It is downloaded once to
~/.cache/walkthrough/ (or point WALKTHROUGH_DEPTH_MODEL at a local .onnx).
Python deps: scripts/walkthrough/requirements.txt
"""
import json
import os
import sys
import urllib.request

import cv2
import numpy as np
from PIL import Image, ImageOps

try:
    import pillow_heif

    pillow_heif.register_heif_opener()
except ImportError:  # HEIC input then needs converting first
    pass

MODEL_URL = "https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx"
LONG_SIDE = 2880
MAX_LINES = 520


def model_path() -> str:
    p = os.environ.get("WALKTHROUGH_DEPTH_MODEL")
    if p:
        return p
    p = os.path.expanduser("~/.cache/walkthrough/depth-anything-v2-small.onnx")
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        print("downloading depth model ->", p)
        urllib.request.urlretrieve(MODEL_URL, p)
    return p


_session = None


def depth_session():
    global _session
    if _session is None:
        import onnxruntime as ort

        _session = ort.InferenceSession(model_path(), providers=["CPUExecutionProvider"])
    return _session


def estimate_depth(rgb: np.ndarray) -> np.ndarray:
    """Relative inverse depth, 0..1, white = near. Same size as input."""
    h, w = rgb.shape[:2]
    # Model wants multiples of 14; keep aspect, ~518 on the short side.
    s = 518 / min(h, w)
    ih, iw = int(round(h * s / 14)) * 14, int(round(w * s / 14)) * 14
    x = cv2.resize(rgb, (iw, ih), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255.0
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    sess = depth_session()
    out = sess.run(None, {sess.get_inputs()[0].name: x})[0]
    d = np.squeeze(out).astype(np.float32)
    lo, hi = np.percentile(d, 1), np.percentile(d, 99.5)
    d = np.clip((d - lo) / max(hi - lo, 1e-6), 0, 1)
    d = cv2.resize(d, (w, h), interpolation=cv2.INTER_CUBIC)
    return np.clip(d, 0, 1)


def soften_depth(d: np.ndarray, rgb: np.ndarray) -> np.ndarray:
    # Grow near objects a few px so their edges stretch the background
    # instead of tearing the object itself, then smooth while keeping edges.
    k = max(3, int(min(d.shape) * 0.006)) | 1
    d = cv2.dilate(d, np.ones((k, k), np.uint8))
    d = cv2.GaussianBlur(d, (0, 0), sigmaX=min(d.shape) * 0.004)
    return np.clip(d, 0, 1)


def detect_lines(rgb: np.ndarray):
    h, w = rgb.shape[:2]
    scale = 1080 / w
    small = cv2.resize(rgb, (1080, int(h * scale)), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY)
    gray = cv2.bilateralFilter(gray, 7, 40, 7)
    lsd = cv2.createLineSegmentDetector(cv2.LSD_REFINE_STD)
    segs = lsd.detect(gray)[0]
    if segs is None:
        return []
    segs = segs.reshape(-1, 4)
    sh, sw = gray.shape
    min_len = 0.035 * sw
    out = []
    for x1, y1, x2, y2 in segs:
        ln = float(np.hypot(x2 - x1, y2 - y1))
        if ln < min_len:
            continue
        out.append((ln, x1 / sw, y1 / sh, x2 / sw, y2 / sh))
    out.sort(key=lambda s: -s[0])
    out = out[:MAX_LINES]
    # Drawing order: long structural lines first, details after; within a
    # length band sweep top-to-bottom so it reads like a plotter.
    longest = out[0][0] if out else 1
    def order(s):
        band = 0 if s[0] > longest * 0.45 else (1 if s[0] > longest * 0.2 else 2)
        return (band, min(s[2], s[4]))
    out.sort(key=order)
    return [[round(float(v), 4) for v in s[1:]] + [round(float(s[0]) / sw, 4)] for s in out]


def load_upright(path: str) -> Image.Image:
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    return im.convert("RGB")


def prep_image(src: str, out_dir: str, name: str, force=False):
    jpg = os.path.join(out_dir, name + ".jpg")
    dep = os.path.join(out_dir, name + ".depth.png")
    lin = os.path.join(out_dir, name + ".lines.json")
    if not force and all(os.path.exists(p) for p in (jpg, dep, lin)):
        print("skip", name)
        return
    im = load_upright(src)
    s = min(1.0, LONG_SIDE / max(im.size))
    if s < 1:
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    im.save(jpg, quality=90)
    rgb = np.asarray(im)
    work = cv2.resize(rgb, (rgb.shape[1] // 2, rgb.shape[0] // 2), interpolation=cv2.INTER_AREA)
    d = soften_depth(estimate_depth(work), work)
    cv2.imwrite(dep, (d * 255).astype(np.uint8))
    lines = detect_lines(rgb)
    with open(lin, "w") as f:
        json.dump({"w": im.width, "h": im.height, "lines": lines}, f)
    print(f"ok {name}: {im.width}x{im.height}, {len(lines)} lines")


def main():
    job_path = sys.argv[1]
    force = "--force" in sys.argv
    job = json.load(open(job_path))
    src_dir = job["sourceDir"]
    out_dir = os.path.join("public", job["assetDir"])
    os.makedirs(out_dir, exist_ok=True)
    names = set()
    for shot in job["shots"]:
        for key in ("photo", "before"):
            if shot.get(key):
                names.add(shot[key])
    for n in sorted(names):
        src = os.path.join(src_dir, n)
        stem = os.path.splitext(n)[0]
        prep_image(src, out_dir, stem, force)


if __name__ == "__main__":
    main()

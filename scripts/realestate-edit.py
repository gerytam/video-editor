"""Real-estate edit for phone photos: straight verticals + bright, clean grade.

    python3 scripts/realestate-edit.py <in-dir-or-files...> --out <dir> [--compare]

1. Vertical correction (2-point perspective). Finds the room's vertical lines
   (door frames, cabinet edges, window mullions), solves for the camera tilt
   and roll that bent them, and re-renders the photo as if the phone had been
   held level, then crops to the largest clean rectangle at the original
   aspect. Uses the lens focal length from EXIF, so ultrawide shots (0.5x)
   correct properly.
2. Grade. Neutral white balance taken from the bright walls and ceiling,
   brighter exposure, shadows lifted and windows held back with local tone
   mapping, a touch of vibrance and sharpening.

--compare also writes <name>.compare.jpg (original | edited) for review.
Deps: scripts/walkthrough/requirements.txt
"""
import argparse
import glob
import math
import os

import cv2
import numpy as np
from PIL import Image, ImageOps

try:
    import pillow_heif

    pillow_heif.register_heif_opener()
except ImportError:
    pass

MAX_CORRECTION_DEG = 25.0


# --------------------------------------------------------------------------
# loading


def load(path):
    im = Image.open(path)
    exif = im.getexif()
    f35 = exif.get_ifd(0x8769).get(41989) if exif else None
    im = ImageOps.exif_transpose(im).convert("RGB")
    return np.asarray(im), (float(f35) if f35 else None), exif


# --------------------------------------------------------------------------
# verticals


def intrinsics(w, h, f35):
    # 35mm-equivalent focal length is defined on the diagonal (43.27mm).
    f = (f35 or 26.0) / 43.27 * math.hypot(w, h)
    return np.array([[f, 0, w / 2], [0, f, h / 2], [0, 0, 1]], dtype=np.float64)


def vertical_segments(rgb):
    h, w = rgb.shape[:2]
    s = 1600 / max(w, h)
    small = cv2.resize(rgb, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY)
    segs = cv2.createLineSegmentDetector(cv2.LSD_REFINE_STD).detect(gray)[0]
    if segs is None:
        return np.zeros((0, 4))
    segs = segs.reshape(-1, 4) / s
    dx = segs[:, 2] - segs[:, 0]
    dy = segs[:, 3] - segs[:, 1]
    length = np.hypot(dx, dy)
    ang = np.degrees(np.arctan2(np.abs(dx), np.abs(dy)))  # 0 = vertical
    keep = (ang < 30) & (length > 0.04 * max(w, h))
    return segs[keep]


def vertical_direction(segs, K):
    """Camera-space direction of world vertical, or None."""
    if len(segs) < 4:
        return None
    Ki = np.linalg.inv(K)
    p1 = np.c_[segs[:, :2], np.ones(len(segs))] @ Ki.T
    p2 = np.c_[segs[:, 2:], np.ones(len(segs))] @ Ki.T
    n = np.cross(p1, p2)
    n /= np.linalg.norm(n, axis=1, keepdims=True)
    wts = np.hypot(segs[:, 2] - segs[:, 0], segs[:, 3] - segs[:, 1])
    rng = np.random.default_rng(0)
    tol = math.sin(math.radians(0.8))
    best, best_score = None, 0.0
    for _ in range(600):
        i, j = rng.choice(len(n), 2, replace=False)
        v = np.cross(n[i], n[j])
        nv = np.linalg.norm(v)
        if nv < 1e-6:
            continue
        v /= nv
        if abs(v[1]) < 0.8:  # must be roughly the image's up-down axis
            continue
        inl = np.abs(n @ v) < tol
        score = wts[inl].sum()
        if score > best_score:
            best, best_score = inl, score
    if best is None or best.sum() < 4:
        return None
    A = n[best] * wts[best, None]
    v = np.linalg.svd(A)[2][-1]
    return v if v[1] > 0 else -v


def rotation_between(a, b):
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    axis = np.cross(a, b)
    s = np.linalg.norm(axis)
    c = float(np.dot(a, b))
    if s < 1e-9:
        return np.eye(3), 0.0
    axis /= s
    angle = math.atan2(s, c)
    R, _ = cv2.Rodrigues(axis * angle)
    return R, math.degrees(angle)


def inside(quad, pts):
    # quad: 4x2 convex, counter/clockwise consistent
    ok = np.ones(len(pts), bool)
    sign = None
    for k in range(4):
        a, b = quad[k], quad[(k + 1) % 4]
        cr = (b[0] - a[0]) * (pts[:, 1] - a[1]) - (b[1] - a[1]) * (pts[:, 0] - a[0])
        if sign is None:
            sign = np.sign(cr.sum()) or 1
        ok &= cr * sign >= 0
    return ok


def best_crop(quad, w, h, aspect, box, center):
    """Largest rectangle of the given aspect inside the warped outline,
    centered near where the original frame's center landed - so the crop
    keeps the photographer's subject instead of chasing the widest area."""
    best = (0, center[0], center[1])
    for cx in center[0] + np.linspace(-0.06, 0.06, 7) * w:
        for cy in center[1] + np.linspace(-0.06, 0.06, 7) * h:
            lo, hi = 0.0, h / 2
            for _ in range(30):
                a = (lo + hi) / 2
                corners = np.array(
                    [[cx - a * aspect, cy - a], [cx + a * aspect, cy - a], [cx + a * aspect, cy + a], [cx - a * aspect, cy + a]]
                )
                if inside(quad, corners).all() and inside(box, corners).all():
                    lo = a
                else:
                    hi = a
            if lo > best[0]:
                best = (lo, cx, cy)
    a, cx, cy = best
    return int(cx - a * aspect), int(cy - a), int(2 * a * aspect), int(2 * a)


def crop(warped, quad, center, aspect):
    h, w = warped.shape[:2]
    # The canvas may be clipped, so the usable area is the outline AND the canvas.
    box = np.array([[0, 0], [w, 0], [w, h], [0, h]], float)
    x, y, cw, ch = best_crop(quad, w, h, aspect, box, center)
    return warped[max(0, y) : y + ch, max(0, x) : x + cw]


def straighten(rgb, f35):
    """-> (warped image, valid-area outline, original center in it, degrees)"""
    h, w = rgb.shape[:2]
    full = np.array([[0, 0], [w, 0], [w, h], [0, h]], float)
    mid = (w / 2, h / 2)
    K = intrinsics(w, h, f35)
    v = vertical_direction(vertical_segments(rgb), K)
    if v is None:
        return rgb, full, mid, 0.0
    R, deg = rotation_between(v, np.array([0.0, 1.0, 0.0]))
    if deg > MAX_CORRECTION_DEG or deg < 0.3:
        # Over the cap it was probably fooled by a strong diagonal; under it
        # there's nothing worth resampling for.
        return rgb, full, mid, 0.0
    H = K @ R @ np.linalg.inv(K)
    c = H @ np.array([w / 2, h / 2, 1.0])
    c = c[:2] / c[2]
    T = np.array([[1, 0, w / 2 - c[0]], [0, 1, h / 2 - c[1]], [0, 0, 1]])
    H = T @ H
    corners = np.array([[0, 0, 1], [w, 0, 1], [w, h, 1], [0, h, 1]], float) @ H.T
    quad = corners[:, :2] / corners[:, 2:3]
    # Render onto a canvas that holds the whole corrected image (bounded, in
    # case a corner shoots off far), so the crop can use all of it.
    x0, y0 = np.maximum(quad.min(0), [-0.3 * w, -0.3 * h])
    x1, y1 = np.minimum(quad.max(0), [1.3 * w, 1.3 * h])
    S = np.array([[1, 0, -x0], [0, 1, -y0], [0, 0, 1]])
    H = S @ H
    quad = quad - [x0, y0]
    cw, ch = int(math.ceil(x1 - x0)), int(math.ceil(y1 - y0))
    warped = cv2.warpPerspective(rgb, H, (cw, ch), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT)
    return warped, quad, (w / 2 - x0, h / 2 - y0), deg


# --------------------------------------------------------------------------
# grade


def to_lin(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def to_srgb(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def grade(rgb):
    x = to_lin(rgb.astype(np.float32) / 255.0)
    L = x @ np.array([0.2126, 0.7152, 0.0722], np.float32)

    # White balance from bright, low-saturation pixels (walls, ceilings, trim).
    mx, mn = x.max(2), x.min(2)
    sat = (mx - mn) / (mx + 1e-4)
    m = (L > np.percentile(L, 55)) & (mx < 0.92) & (sat < 0.3)
    if m.sum() > 500:
        mean = x[m].mean(0)
        gains = mean[1] / np.maximum(mean, 1e-4)
        gains = 1 + 0.85 * (gains - 1)  # leave a little warmth
        gains = np.clip(gains, 0.75, 1.35)
        x = x * gains
        L = x @ np.array([0.2126, 0.7152, 0.0722], np.float32)

    # Local tone mapping on log luminance (base/detail split).
    logL = np.log(L + 1e-4)
    h, w = L.shape
    s = 800 / max(h, w)
    small = cv2.resize(logL, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA)
    base = cv2.bilateralFilter(small, d=0, sigmaColor=0.45, sigmaSpace=max(small.shape) * 0.02)
    base = cv2.resize(base, (w, h), interpolation=cv2.INTER_LINEAR)
    detail = logL - base
    anchor = np.percentile(base, 50)
    mid0 = math.exp(anchor)
    # Bright, airy middle grey - but a dim evening shot only gets ~+1.8 EV,
    # past that it turns into a noisy fake-HDR mess.
    mid = min(0.27, mid0 * 3.5)
    lift_ev = math.log2(mid / mid0)
    dark = lift_ev > 1.0
    new_log = (base - anchor) * 0.62 + math.log(mid) + detail * (1.0 if dark else 1.12)
    newL = np.exp(new_log)
    # White point from the walls and ceiling (ignoring lamps and windows) so
    # white paint reads white.
    wp = np.percentile(newL, 97)
    if wp < 0.8:
        newL = newL * min(1.4, 0.8 / wp)
    # Fit the highlights: soft shoulder that lands the 99.5th percentile at
    # 0.96 instead of clipping counters and windows flat.
    knee = 0.6
    p = float(np.percentile(newL, 99.5))
    if p > 0.96:
        d, e = p - knee, 0.96 - knee
        k = d / (d / e - 1)
        over = np.maximum(newL - knee, 0)
        newL = np.where(newL > knee, knee + over / (1 + over / k), newL)
    ratio = newL / (L + 1e-4)
    y = x * ratio[..., None]

    # Pull over-range colors toward white rather than clipping per channel.
    peak = np.maximum(y.max(2, keepdims=True), 1e-6)
    y = np.where(peak > 1, y / peak + (1 - 1 / peak) * 0.9, y)

    out = to_srgb(y)
    # Vibrance: lift muted colors more than saturated ones.
    g = out.mean(2, keepdims=True)
    satn = (out.max(2, keepdims=True) - out.min(2, keepdims=True))
    out = g + (out - g) * (1 + 0.18 * (1 - np.clip(satn * 2, 0, 1)))
    out = np.clip(out * 255, 0, 255).astype(np.uint8)

    # Sharpen luminance only; on lifted dark shots sharpen less and calm the
    # color noise instead.
    lab = cv2.cvtColor(out, cv2.COLOR_RGB2LAB)
    l = lab[..., 0].astype(np.float32)
    blur = cv2.GaussianBlur(l, (0, 0), 1.4)
    lab[..., 0] = np.clip(l + (0.2 if dark else 0.45) * (l - blur), 0, 255).astype(np.uint8)
    if dark:
        for c in (1, 2):
            lab[..., c] = cv2.GaussianBlur(lab[..., c], (0, 0), 2.5)
    return cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)


# --------------------------------------------------------------------------


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inputs", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--compare", action="store_true")
    ap.add_argument("--no-grade", action="store_true")
    ap.add_argument("--video-out", help="also write 9:16 crops here, for vertical video")
    args = ap.parse_args()
    files = []
    for p in args.inputs:
        files += sorted(glob.glob(os.path.join(p, "*"))) if os.path.isdir(p) else [p]
    files = [f for f in files if f.lower().endswith((".heic", ".jpg", ".jpeg", ".png")) and "_med" not in f]
    os.makedirs(args.out, exist_ok=True)
    if args.video_out:
        os.makedirs(args.video_out, exist_ok=True)
    for f in files:
        rgb, f35, _ = load(f)
        warped, quad, center, deg = straighten(rgb, f35)
        if not args.no_grade:
            warped = grade(warped)
        name = os.path.splitext(os.path.basename(f))[0]
        fixed = crop(warped, quad, center, rgb.shape[1] / rgb.shape[0])
        Image.fromarray(fixed).save(os.path.join(args.out, name + ".jpg"), quality=93, subsampling=0)
        msg = f"{name}: verticals corrected {deg:4.1f} deg, still {fixed.shape[1]}x{fixed.shape[0]}"
        if args.video_out:
            vid = crop(warped, quad, center, 9 / 16)
            Image.fromarray(vid).save(os.path.join(args.video_out, name + ".jpg"), quality=93, subsampling=0)
            msg += f", 9:16 {vid.shape[1]}x{vid.shape[0]}"
        print(msg)
        if args.compare:
            hh = 1200
            a = cv2.resize(rgb, (round(rgb.shape[1] * hh / rgb.shape[0]), hh), interpolation=cv2.INTER_AREA)
            b = cv2.resize(fixed, (round(fixed.shape[1] * hh / fixed.shape[0]), hh), interpolation=cv2.INTER_AREA)
            Image.fromarray(np.hstack([a, np.full((hh, 16, 3), 255, np.uint8), b])).save(
                os.path.join(args.out, name + ".compare.jpg"), quality=85
            )


if __name__ == "__main__":
    main()

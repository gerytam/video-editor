// Virtual camera for a still photo with a depth map.
//
// The forward model (shared by the WebGL shader and the wireframe overlay):
//
//   q = c + (p - c) * (1 + dolly * (d - focus)) + shift * (d - focus)
//   screen = 0.5 + (q - c) * zoom / cover
//
// p is a point in image uv (0..1), d its depth (1 = near). `dolly` scales near
// things faster than far things, which is what reads as walking forward.
// `shift` slides near and far in opposite directions: a sideways move.

export type Cam = {
  zoom: number;
  panX: number;
  panY: number;
  shiftX: number;
  shiftY: number;
  dolly: number;
  focus: number;
};

export const MOVES = [
  "push",
  "push-left",
  "push-right",
  "truck-left",
  "truck-right",
  "rise",
] as const;
export type MoveName = (typeof MOVES)[number];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 2.2);
const easeIn = (t: number) => t * t * t;

/** Camera at normalized shot time u (0..1, exit excluded). */
export const camAt = (move: MoveName, u: number): Cam => {
  const t = easeOut(Math.min(1, Math.max(0, u)));
  const base: Cam = {
    zoom: lerp(1.07, 1.17, t),
    panX: 0,
    panY: 0,
    shiftX: 0,
    shiftY: 0,
    dolly: lerp(0, 0.16, t),
    focus: 0.15,
  };
  switch (move) {
    case "push":
      return base;
    case "push-left":
      return { ...base, shiftX: lerp(0.014, -0.014, t), focus: 0.3 };
    case "push-right":
      return { ...base, shiftX: lerp(-0.014, 0.014, t), focus: 0.3 };
    case "truck-left":
      return {
        ...base,
        zoom: lerp(1.12, 1.15, t),
        dolly: lerp(0, 0.05, t),
        shiftX: lerp(0.032, -0.032, t),
        focus: 0.45,
      };
    case "truck-right":
      return {
        ...base,
        zoom: lerp(1.12, 1.15, t),
        dolly: lerp(0, 0.05, t),
        shiftX: lerp(-0.032, 0.032, t),
        focus: 0.45,
      };
    case "rise":
      return {
        ...base,
        zoom: lerp(1.1, 1.16, t),
        dolly: lerp(0, 0.07, t),
        shiftY: lerp(0.022, -0.022, t),
        focus: 0.35,
      };
  }
};

/** Push-through on the way out: the camera keeps going into the room. */
export const withExit = (cam: Cam, e: number): Cam => {
  const k = easeIn(Math.min(1, Math.max(0, e)));
  return { ...cam, zoom: cam.zoom * (1 + 0.45 * k), dolly: cam.dolly + 0.25 * k };
};

/** Fraction of the image visible on screen at zoom 1 (cover fit). */
export const coverFor = (imgAspect: number, screenAspect: number) =>
  imgAspect > screenAspect
    ? { x: screenAspect / imgAspect, y: 1 }
    : { x: 1, y: imgAspect / screenAspect };

/** Image uv + depth -> screen px. Mirrors the shader exactly. */
export const project = (
  px: number,
  py: number,
  d: number,
  cam: Cam,
  cover: { x: number; y: number },
  W: number,
  H: number,
): [number, number] => {
  const cx = 0.5 + cam.panX;
  const cy = 0.5 + cam.panY;
  const dd = d - cam.focus;
  const s = 1 + cam.dolly * dd;
  const qx = cx + (px - cx) * s + cam.shiftX * dd;
  const qy = cy + (py - cy) * s + cam.shiftY * dd;
  return [
    (0.5 + ((qx - cx) * cam.zoom) / cover.x) * W,
    (0.5 + ((qy - cy) * cam.zoom) / cover.y) * H,
  ];
};

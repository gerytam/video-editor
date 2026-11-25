import { useVideoConfig } from "remotion";
import { Line } from "./assets";

// Blueprint line work. Each segment draws on in turn (long structural lines
// first, see prep.py), with a small drafting overshoot past each end.

const OVERSHOOT = 0.05;
const SPAN = 0.3; // fraction of the draw phase one line takes

type Proj = (x: number, y: number) => [number, number];

const partial = (
  l: Line,
  draw: number,
  retract: number,
  i: number,
  n: number,
  proj: Proj,
): string | null => {
  const start = (i / Math.max(1, n)) * (1 - SPAN);
  const p = 1 - Math.pow(1 - Math.min(1, Math.max(0, (draw - start) / SPAN)), 3);
  // Retract in the same order, from the start point toward the end.
  const r = Math.min(1, Math.max(0, (retract - start) / SPAN));
  if (p <= 0 || r >= 1) return null;
  const [x1, y1, x2, y2] = l;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const ax = x1 - dx * OVERSHOOT;
  const ay = y1 - dy * OVERSHOOT;
  const k = 1 + 2 * OVERSHOOT;
  const a = proj(ax + dx * k * r, ay + dy * k * r);
  const b = proj(ax + dx * k * p, ay + dy * k * p);
  return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
};

export const Wireframe: React.FC<{
  lines: Line[];
  proj: Proj;
  draw: number;
  retract?: number;
  opacity?: number;
  color?: string;
  glow?: number;
  id: string;
}> = ({ lines, proj, draw, retract = 0, opacity = 1, color = "#E6F1FF", glow = 0.55, id }) => {
  const { width, height } = useVideoConfig();
  if (opacity <= 0.001 || draw <= 0) return null;
  const n = lines.length;
  let major = "";
  let minor = "";
  lines.forEach((l, i) => {
    const d = partial(l, draw, retract, i, n, proj);
    if (!d) return;
    if (l[4] > 0.22) major += d;
    else minor += d;
  });
  const filter = `wf-glow-${id}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", inset: 0, opacity }}
    >
      <defs>
        <filter id={filter} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      {glow > 0 ? (
        <g filter={`url(#${filter})`} opacity={glow}>
          <path d={major} stroke="#9FD4FF" strokeWidth={6} fill="none" strokeLinecap="round" />
          <path d={minor} stroke="#9FD4FF" strokeWidth={4} fill="none" strokeLinecap="round" />
        </g>
      ) : null}
      <path d={major} stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <path d={minor} stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.85} />
    </svg>
  );
};

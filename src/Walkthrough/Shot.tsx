import { AbsoluteFill, Easing, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useShotAssets } from "./assets";
import { camAt, coverFor, project, withExit } from "./camera";
import { DepthPhoto } from "./DepthPhoto";
import { MONO } from "./fonts";
import { ShotPlan, ShotSpec } from "./timeline";
import { Status, TitleBlock } from "./TitleBlock";
import { Wireframe } from "./Wireframe";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

// The old photo, shown as a print laid on the drawing table.
const CARD_W = 940;

const BeforeCard: React.FC<{
  src: string;
  aspect: number;
  t: number;
  fade: number;
}> = ({ src, aspect, t, fade }) => {
  const { width } = useVideoConfig();
  const h = CARD_W / aspect;
  const inP = interpolate(t, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return (
    <div
      style={{
        position: "absolute",
        left: (width - CARD_W) / 2,
        top: 960 - h / 2,
        width: CARD_W,
        height: h,
        transform: `rotate(${-2.2 * (1 - fade)}deg) scale(${0.94 + 0.06 * inP})`,
        opacity: inP,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -14,
          background: "#F4F1EA",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
          opacity: 1 - fade,
        }}
      />
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${1 + 0.0009 * t})`,
            opacity: 1 - fade,
            filter: `saturate(${1 - 0.5 * fade})`,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: -64,
          left: -14,
          fontFamily: MONO,
          fontWeight: 600,
          fontSize: 24,
          letterSpacing: 6,
          color: "#E6F1FF",
          opacity: 0.85 * (1 - fade),
        }}
      >
        ORIGINAL CONDITION
      </div>
    </div>
  );
};

export const Shot: React.FC<{
  spec: ShotSpec;
  plan: ShotPlan;
  assetDir: string;
  brandShort: string;
  statusWords: { drawn: string; built: string; before: string };
  index: number;
}> = ({ spec, plan, assetDir, brandShort, statusWords, index }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const a = useShotAssets(assetDir, spec.photo);
  const b = useShotAssets(assetDir, spec.before);
  if (!a || (spec.before && !b)) return null;

  // --- camera -------------------------------------------------------------
  const camSpan = plan.exitStart - plan.drawStart;
  const u = clamp01((f - plan.drawStart) / camSpan);
  const exitP = clamp01((f - plan.exitStart) / plan.exit);
  const cam = withExit(camAt(plan.move, u), exitP);
  const aspect = a.w / a.h;
  const cover = coverFor(aspect, W / H);
  const proj = (x: number, y: number) => project(x, y, a.depthAt(x, y), cam, cover, W, H);

  // --- phases -------------------------------------------------------------
  const draw = clamp01((f - plan.drawStart) / plan.draw);
  const scan = easeInOut(clamp01((f - plan.revealStart) / plan.reveal));
  const linesOut = clamp01((f - plan.revealStart - plan.reveal * 0.4) / (plan.reveal + 14));
  const photoOn = f >= plan.revealStart - 1;
  const photoOpacity = 1 - Math.pow(exitP, 1.6);
  const scanY = scan * H;

  // --- before card (before/after mode) -------------------------------------
  let beforeLayer: React.ReactNode = null;
  if (b && spec.before) {
    const morphT = clamp01((f - plan.before) / plan.morph);
    const fade = easeInOut(clamp01(morphT / 0.45));
    const bAspect = b.w / b.h;
    const cardH = CARD_W / bAspect;
    const left = (W - CARD_W) / 2;
    const top = 960 - cardH / 2;
    const bProj = (x: number, y: number): [number, number] => [left + x * CARD_W, top + y * cardH];
    const bDraw = easeInOut(clamp01((f - plan.before + 10) / (plan.morph * 0.55)));
    const bRetract = easeInOut(clamp01((morphT - 0.5) / 0.45));
    beforeLayer = (
      <>
        {f < plan.revealStart ? <BeforeCard src={b.photo} aspect={bAspect} t={index === 0 ? f + 10 : f} fade={fade} /> : null}
        <Wireframe id={`b${index}`} lines={b.lines} proj={bProj} draw={bDraw} retract={bRetract} opacity={0.9} glow={0.35} />
      </>
    );
  }

  // --- title block status ---------------------------------------------------
  const flipAt = plan.revealStart + Math.round(plan.reveal / 2);
  let status: Status;
  let statusSince: number;
  if (spec.before && f < plan.drawStart) {
    status = { text: statusWords.before, filled: false };
    statusSince = 0;
  } else if (f < flipAt) {
    status = { text: statusWords.drawn, filled: false };
    statusSince = spec.before ? plan.drawStart : 0;
  } else {
    status = { text: statusWords.built, filled: true };
    statusSince = flipAt;
  }

  return (
    <AbsoluteFill>
      {beforeLayer}
      {photoOn ? (
        <DepthPhoto
          src={a.photo}
          depthSrc={a.depth}
          aspect={aspect}
          cam={cam}
          style={{
            clipPath: scan < 1 ? `inset(0 0 ${(1 - scan) * 100}% 0)` : undefined,
            opacity: photoOpacity,
          }}
        />
      ) : null}
      <Wireframe
        id={`a${index}`}
        lines={a.lines}
        proj={proj}
        draw={draw}
        opacity={1 - linesOut}
        glow={0.55 + 0.4 * (scan > 0 && scan < 1 ? 1 : 0)}
      />
      {scan > 0 && scan < 1 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: scanY - 2,
            height: 4,
            background: "#F2F8FF",
            boxShadow: "0 0 24px 6px rgba(140,200,255,0.9), 0 0 80px 20px rgba(90,160,255,0.45)",
          }}
        />
      ) : null}
      <TitleBlock
        sheet={spec.sheet}
        label={spec.label}
        brand={brandShort}
        status={status}
        t={f - (spec.before ? 4 : 6)}
        statusT={f - statusSince}
        out={clamp01((f - plan.exitStart + 2) / 8)}
      />
    </AbsoluteFill>
  );
};

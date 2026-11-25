import { AbsoluteFill, Easing, Img, interpolate, staticFile } from "remotion";
import { MONO, SANS } from "./fonts";

export type Brand = {
  name: string;
  logo?: string;
  tagline: string;
  services?: string;
  area?: string;
  phone?: string;
  site?: string;
  cta?: string;
  paper: string;
};

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const ramp = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

export const EndCard: React.FC<{ brand: Brand; t: number }> = ({ brand, t }) => {
  const logo = ramp(t, 4, 22);
  const tag = ramp(t, 14, 32);
  const rule = ramp(t, 24, 44);
  const info = ramp(t, 30, 48);
  const cta = ramp(t, 40, 58);
  const tagWords = brand.tagline.split(/\s+/);
  return (
    <AbsoluteFill style={{ alignItems: "center", color: "white", textAlign: "center" }}>
      {/* Frame lines drawn around the sheet, like a drawing border. */}
      <div
        style={{
          position: "absolute",
          left: 48,
          right: 48,
          top: 200,
          bottom: 360,
          border: "2px solid rgba(230,241,255,0.55)",
          clipPath: `inset(0 ${(1 - ramp(t, 0, 26)) * 100}% 0 0)`,
        }}
      />
      <div style={{ position: "absolute", top: 330, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {brand.logo ? (
          <Img
            src={staticFile(brand.logo)}
            style={{
              width: 560,
              opacity: logo,
              transform: `scale(${0.92 + 0.08 * logo})`,
              filter: "drop-shadow(0 6px 30px rgba(0,0,0,0.35))",
            }}
          />
        ) : (
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 80, opacity: logo }}>{brand.name}</div>
        )}
        <div
          style={{
            marginTop: 70,
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 84,
            lineHeight: 1.04,
            letterSpacing: -2,
            maxWidth: 820,
          }}
        >
          {tagWords.map((w, i) => {
            const p = ramp(t, 14 + i * 3, 30 + i * 3);
            return (
              <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", margin: "0 12px" }}>
                <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, opacity: tag > 0 ? 1 : 0 }}>{w}</span>
              </span>
            );
          })}
        </div>
        <div style={{ marginTop: 50, width: 640 * rule, height: 2, background: "#E6F1FF", opacity: 0.8 }} />
        {brand.services ? (
          <div style={{ marginTop: 36, fontFamily: MONO, fontWeight: 600, fontSize: 25, letterSpacing: 4, opacity: 0.85 * info }}>
            {brand.services.toUpperCase()}
          </div>
        ) : null}
        {brand.area ? (
          <div style={{ marginTop: 14, fontFamily: MONO, fontWeight: 400, fontSize: 25, letterSpacing: 4, opacity: 0.7 * info }}>
            {brand.area.toUpperCase()}
          </div>
        ) : null}
        <div style={{ marginTop: 56, opacity: cta, transform: `translateY(${(1 - cta) * 24}px)` }}>
          {brand.phone ? (
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 70, letterSpacing: 1 }}>{brand.phone}</div>
          ) : null}
          {brand.site ? (
            <div style={{ marginTop: 6, fontFamily: SANS, fontWeight: 500, fontSize: 40, opacity: 0.85 }}>{brand.site}</div>
          ) : null}
          {brand.cta ? (
            <div
              style={{
                display: "inline-block",
                marginTop: 34,
                padding: "16px 34px",
                background: "#E6F1FF",
                color: "#04284C",
                fontFamily: MONO,
                fontWeight: 600,
                fontSize: 27,
                letterSpacing: 4,
              }}
            >
              {brand.cta.toUpperCase()}
            </div>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};

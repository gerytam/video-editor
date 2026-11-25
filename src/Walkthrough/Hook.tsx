import { Easing, interpolate } from "remotion";
import { MONO, SANS } from "./fonts";

// Opening line, top third, word by word over the first drawing.

export const Hook: React.FC<{ text: string; kicker: string; t: number; out: number }> = ({
  text,
  kicker,
  t,
  out,
}) => {
  const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
  const words = text.split(/\s+/);
  const gone = interpolate(out, [0, 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const k = interpolate(t, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 300,
        opacity: gone,
        transform: `translateY(${(1 - gone) * -40}px)`,
        color: "white",
        textShadow: "0 4px 30px rgba(2,20,40,0.85)",
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontWeight: 600,
          fontSize: 24,
          letterSpacing: 6,
          opacity: 0.85 * k,
          marginBottom: 22,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ width: 60 * k, height: 2, background: "#E6F1FF", display: "inline-block" }} />
        {kicker}
      </div>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 96,
          lineHeight: 1.02,
          letterSpacing: -2,
        }}
      >
        {words.map((w, i) => {
          const p = interpolate(t, [6 + i * 4, 20 + i * 4], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          });
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", marginRight: 22 }}>
              <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)` }}>{w}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

import { interpolate, Easing } from "remotion";
import { MONO, SANS } from "./fonts";

// The drawing's title block, bottom-left. The status pill is the story in one
// word: DRAWN flips to BUILT when the photo lands.

export type Status = { text: string; filled: boolean };

export const TitleBlock: React.FC<{
  sheet: string;
  label: string;
  brand: string;
  status: Status;
  /** frames since this block started appearing */
  t: number;
  /** 0..1 exit progress */
  out: number;
  /** frames since the status last changed */
  statusT: number;
}> = ({ sheet, label, brand, status, t, out, statusT }) => {
  const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
  const frame = interpolate(t, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const text = interpolate(t, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const pill = interpolate(statusT, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const gone = interpolate(out, [0, 1], [1, 0]);
  const W = 590;
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        top: 1290,
        width: W,
        opacity: gone,
        transform: `translateY(${(1 - gone) * -30}px)`,
        color: "white",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(3,30,58,0.78)",
          border: "2px solid rgba(230,241,255,0.9)",
          clipPath: `inset(0 ${(1 - frame) * 100}% 0 0)`,
        }}
      />
      <div style={{ position: "relative", padding: "18px 26px 24px", overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: MONO,
            fontWeight: 600,
            fontSize: 22,
            letterSpacing: 4,
            opacity: 0.8 * text,
            paddingBottom: 12,
            borderBottom: "1.5px solid rgba(230,241,255,0.45)",
          }}
        >
          <span>SHEET {sheet}</span>
          <span>{brand}</span>
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 68,
            lineHeight: 1,
            letterSpacing: -1,
            textTransform: "uppercase",
            marginTop: 16,
            transform: `translateY(${(1 - text) * 60}px)`,
            opacity: text,
          }}
        >
          {label}
        </div>
        <div style={{ marginTop: 18, height: 46, opacity: text }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 18px",
              fontFamily: MONO,
              fontWeight: 600,
              fontSize: 24,
              letterSpacing: 5,
              border: "2px solid #E6F1FF",
              background: status.filled ? "#E6F1FF" : "transparent",
              color: status.filled ? "#04284C" : "#E6F1FF",
              transform: `scale(${0.85 + 0.15 * pill})`,
              transformOrigin: "left center",
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                background: status.filled ? "#04284C" : "#E6F1FF",
                borderRadius: status.filled ? 0 : 6,
              }}
            />
            {status.text}
          </span>
        </div>
      </div>
    </div>
  );
};

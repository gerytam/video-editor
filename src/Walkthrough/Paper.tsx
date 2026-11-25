import { AbsoluteFill, useCurrentFrame } from "remotion";

// Blueprint paper: brand navy with a drafting grid. It sits under every shot,
// so the cuts between rooms always land on the same sheet.

export const Paper: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const drift = (frame * 0.35) % 180;
  const minor = "rgba(190,220,255,0.07)";
  const major = "rgba(190,220,255,0.15)";
  return (
    <AbsoluteFill style={{ backgroundColor: color }}>
      <AbsoluteFill
        style={{
          backgroundImage: [
            `linear-gradient(${major} 2px, transparent 2px)`,
            `linear-gradient(90deg, ${major} 2px, transparent 2px)`,
            `linear-gradient(${minor} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${minor} 1px, transparent 1px)`,
          ].join(","),
          backgroundSize: "180px 180px, 180px 180px, 36px 36px, 36px 36px",
          backgroundPosition: `0 ${drift}px, 0 ${drift}px, 0 ${drift}px, 0 ${drift}px`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(40,110,190,0.28) 0%, rgba(0,0,0,0) 55%, rgba(0,8,20,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

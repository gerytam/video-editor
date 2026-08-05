import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { activeStepIndex, STEPS } from "./steps";

const YELLOW = "#FFE800";

// A row of 9 pips across the very top that fill as the playbook advances —
// a lightweight "chapter progress" indicator so viewers feel momentum.
export const ProgressPips: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;
  const idx = activeStepIndex(timeMs);

  return (
    <div
      style={{
        position: "absolute",
        top: 70,
        left: 0,
        right: 0,
        display: "flex",
        gap: 10,
        padding: "0 40px",
      }}
    >
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div
            key={s.n}
            style={{
              flex: 1,
              height: 12,
              borderRadius: 8,
              border: "3px solid rgba(0,0,0,0.55)",
              background: active
                ? YELLOW
                : done
                  ? "white"
                  : "rgba(255,255,255,0.25)",
              boxShadow: active ? `0 0 16px ${YELLOW}` : "none",
            }}
          />
        );
      })}
    </div>
  );
};

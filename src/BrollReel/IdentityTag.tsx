import React from "react";
import { getStaticFiles, Img, staticFile } from "remotion";
import { Baloo2ExtraBold } from "./font";
import { SAFE_ZONE } from "./beats";

const fileExists = (f: string) =>
  Boolean(getStaticFiles().find((x) => x.src === f));

// Small circular profile photo + @handle, persistent in the top-left corner
// across the whole reel — same position as the static posts. Falls back to
// an initial badge if no avatar file is set for the client, so a render
// never breaks just because the photo hasn't been added yet.
export const IdentityTag: React.FC<{
  readonly handle: string;
  readonly avatar?: string;
}> = ({ handle, avatar }) => {
  const avatarSrc = avatar ? staticFile(avatar) : null;
  const avatarReady = avatarSrc ? fileExists(avatarSrc) : false;

  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_ZONE.topMargin,
        left: SAFE_ZONE.leftMargin,
        display: "flex",
        alignItems: "center",
        gap: 14,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          border: "3px solid rgba(255,255,255,0.85)",
          boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
          background: "#333",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {avatarReady && avatarSrc ? (
          <Img
            src={avatarSrc}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              fontFamily: Baloo2ExtraBold,
              fontSize: 26,
              color: "#fff",
            }}
          >
            {handle.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <span
        style={{
          fontFamily: Baloo2ExtraBold,
          fontSize: 30,
          color: "#fff",
          textShadow: "0 3px 10px rgba(0,0,0,0.55)",
        }}
      >
        @{handle}
      </span>
    </div>
  );
};

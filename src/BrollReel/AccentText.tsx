import React from "react";

// Renders a beat's text with its accent_phrase substring recolored. Falls
// back to plain text if there's no accent phrase, or it isn't actually found
// in the text (a typo in the content plan shouldn't crash the render).
export const AccentText: React.FC<{
  readonly text: string;
  readonly accentPhrase?: string | null;
  readonly accentColor: string;
}> = ({ text, accentPhrase, accentColor }) => {
  const idx = accentPhrase ? text.indexOf(accentPhrase) : -1;
  if (!accentPhrase || idx === -1) return <>{text}</>;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + accentPhrase.length);
  const after = text.slice(idx + accentPhrase.length);

  return (
    <>
      {before}
      <span style={{ color: accentColor }}>{match}</span>
      {after}
    </>
  );
};

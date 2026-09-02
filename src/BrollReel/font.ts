import { continueRender, delayRender, staticFile } from "remotion";

// Baloo 2, per the style guide — weight 700/800 only, the two weights the
// overlay actually uses. Static woff2 lives in public/fonts/ (pulled from
// @fontsource/baloo-2; see public/fonts/Baloo2-OFL-LICENSE.txt).
export const Baloo2Bold = "Baloo2-Bold";
export const Baloo2ExtraBold = "Baloo2-ExtraBold";

let loaded: Promise<void> | null = null;

export const loadBaloo2 = (): Promise<void> => {
  if (loaded) return loaded;

  const handle = delayRender("Loading Baloo 2");

  loaded = Promise.all([
    new FontFace(
      Baloo2Bold,
      `url('${staticFile("fonts/Baloo2-Bold.woff2")}') format('woff2')`,
      { weight: "700" },
    ).load(),
    new FontFace(
      Baloo2ExtraBold,
      `url('${staticFile("fonts/Baloo2-ExtraBold.woff2")}') format('woff2')`,
      { weight: "800" },
    ).load(),
  ]).then(([bold, extraBold]) => {
    document.fonts.add(bold);
    document.fonts.add(extraBold);
    continueRender(handle);
  });

  return loaded;
};

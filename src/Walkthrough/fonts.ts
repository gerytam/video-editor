import { cancelRender, continueRender, delayRender } from "remotion";
import mono400 from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2";
import mono600 from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2";
import sans500 from "@fontsource/montserrat/files/montserrat-latin-500-normal.woff2";
import sans700 from "@fontsource/montserrat/files/montserrat-latin-700-normal.woff2";
import sans800 from "@fontsource/montserrat/files/montserrat-latin-800-normal.woff2";

export const SANS = "WT Montserrat";
export const MONO = "WT Plex Mono";

const faces: [string, string, string][] = [
  [SANS, sans500, "500"],
  [SANS, sans700, "700"],
  [SANS, sans800, "800"],
  [MONO, mono400, "400"],
  [MONO, mono600, "600"],
];

let started = false;

export const loadWalkthroughFonts = () => {
  if (started) return;
  started = true;
  const handle = delayRender("walkthrough fonts");
  Promise.all(
    faces.map(([family, url, weight]) =>
      new FontFace(family, `url(${url}) format('woff2')`, { weight })
        .load()
        .then((f) => {
          document.fonts.add(f);
        }),
    ),
  )
    .then(() => continueRender(handle))
    .catch((e) => cancelRender(e));
};

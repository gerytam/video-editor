// Per-client branding. The edit style is the same Azureye house look for
// everyone — only these values change per client.
//
// To add a client: copy a block, change the values. `id` is what you reference
// from a job in jobs/jobs.json.

export type Client = {
  id: string;
  /** Display name, used on the end card if no logo is set. */
  name: string;
  /** Instagram handle WITHOUT the @ — appears in the CTA end card. */
  handle: string;
  /** Primary brand color. Drives the active-word caption highlight,
   *  the keyword chip and the CTA accents. Use a bright, saturated color —
   *  it has to pop against footage. */
  brandColor: string;
  /** Text color used on top of brandColor (usually black or white). */
  onBrandColor: string;
  /** Optional file in public/ for the end card, e.g. "logos/acme.png". */
  logo?: string;
  /** Optional circular profile photo in public/ for the BrollReel identity
   *  tag, e.g. "avatars/acme.jpg". Falls back to an initial badge if unset. */
  avatar?: string;
};

export const CLIENTS: Client[] = [
  {
    id: "azureye",
    name: "Azureye Media",
    handle: "azureyemedia",
    brandColor: "#FFE800",
    onBrandColor: "#000000",
  },
  // --- add clients below -------------------------------------------------
  {
    id: "example-client",
    name: "Example Client",
    handle: "exampleclient",
    brandColor: "#00E5FF",
    onBrandColor: "#000000",
  },
  {
    id: "philiprunsads",
    name: "Philip Runs Ads",
    handle: "philiprunsads",
    brandColor: "#48AD6E",
    onBrandColor: "#0B140F",
    avatar: "avatars/philiprunsads.jpg",
  },
];

export const DEFAULT_CLIENT_ID = "azureye";

export const getClient = (id: string | undefined): Client => {
  const found = CLIENTS.find((c) => c.id === id);
  if (found) return found;
  const fallback = CLIENTS.find((c) => c.id === DEFAULT_CLIENT_ID);
  if (!fallback) {
    throw new Error(
      `No client "${id}" and no default client "${DEFAULT_CLIENT_ID}" in src/config/clients.ts`,
    );
  }
  return fallback;
};

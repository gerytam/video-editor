import React from "react";

// Small hand-drawn icon set for beats with an obvious concrete noun (a
// phone, a car, a calendar). Most beats are abstract statements and skip
// this entirely — see BeatIcon's usage in TextBeatCard. Stroke-based,
// currentColor, so one badge style (see BeatIcon) works for all of them.

const stroke: React.SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const ICONS = {
  phone: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...stroke} {...props}>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  ),
  camera: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...stroke} {...props}>
      <path d="M4 8h3l2-2h6l2 2h3v11H4z" />
      <circle cx="12" cy="13" r="3.3" />
    </svg>
  ),
  megaphone: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...stroke} {...props}>
      <path d="M3 10v4h3l7 4V6l-7 4H3z" />
      <path d="M15 9a4 4 0 0 1 0 6" />
    </svg>
  ),
  calendar: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...stroke} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </svg>
  ),
  car: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...stroke} {...props}>
      <path d="M4 16v-3l2-5h12l2 5v3" />
      <rect x="3" y="16" width="18" height="3" rx="1" />
      <circle cx="7.5" cy="19" r="1.5" />
      <circle cx="16.5" cy="19" r="1.5" />
    </svg>
  ),
  signpost: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...stroke} {...props}>
      <line x1="6" y1="21" x2="6" y2="4" />
      <path d="M6 6h11l-2 3 2 3H6z" />
    </svg>
  ),
  chart: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...stroke} {...props}>
      <line x1="4" y1="21" x2="4" y2="10" />
      <line x1="10" y1="21" x2="10" y2="6" />
      <line x1="16" y1="21" x2="16" y2="13" />
      <line x1="21" y1="21" x2="3" y2="21" />
    </svg>
  ),
  vault: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...stroke} {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <circle cx="12" cy="12.5" r="3" />
      <line x1="12" y1="10.5" x2="12" y2="12.5" />
      <line x1="12" y1="12.5" x2="13.3" y2="13.3" />
    </svg>
  ),
  photo: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...stroke} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.7" />
      <path d="M21 16l-5.5-5.5L9 17" />
    </svg>
  ),
  pin: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...stroke} {...props}>
      <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  ),
  clock: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...stroke} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  ),
  spark: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...stroke} {...props}>
      <path d="M12 2v6M12 16v6M2 12h6M16 12h6M4.9 4.9l4.2 4.2M14.9 14.9l4.2 4.2M19.1 4.9l-4.2 4.2M9.1 14.9l-4.2 4.2" />
    </svg>
  ),
} as const;

export type IconName = keyof typeof ICONS;

export const isIconName = (name: string): name is IconName =>
  Object.prototype.hasOwnProperty.call(ICONS, name);

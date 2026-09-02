// Color grade presets applied to the b-roll as a CSS filter. Every reel gets
// graded — flat phone footage next to designed text bubbles looks unfinished
// otherwise. Picking a grade per reel (instead of always the same one) is
// also part of what keeps reels from looking like one template reused.
export const GRADES = {
  neutral: "contrast(1.08) saturate(1.12) brightness(1.02)",
  warm: "contrast(1.1) saturate(1.15) brightness(1.03) sepia(0.12) hue-rotate(-6deg)",
  cool: "contrast(1.1) saturate(1.08) brightness(1.0) hue-rotate(6deg)",
  moody: "contrast(1.2) saturate(0.82) brightness(0.93)",
} as const;

export type GradeName = keyof typeof GRADES;

export const filterForGrade = (grade: string): string =>
  GRADES[grade as GradeName] ?? GRADES.neutral;

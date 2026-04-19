/**
 * Guitar color helpers.
 *
 * All colors are derived from the single CHROMATIC_PALETTE defined in
 * color_palette.ts. NOTE_COLORS and INTERVAL_COLORS are kept for backward
 * compatibility with existing consumers.
 */

import {
  CHROMATIC_PALETTE,
  NOTE_PALETTE_INDEX,
  INTERVAL_PALETTE_INDEX,
  PALETTE_DEFAULT,
  getNoteColor,
  getIntervalColor,
} from "./color_palette";

export {
  CHROMATIC_PALETTE,
  getNoteColor,
  getIntervalColor,
} from "./color_palette";

// --- Note Colors (derived from palette) ---
export const NOTE_COLORS: { [noteName: string]: string } = {
  ...Object.fromEntries(
    Object.entries(NOTE_PALETTE_INDEX).map(([name, idx]) => [
      name,
      CHROMATIC_PALETTE[idx],
    ])
  ),
  DEFAULT: PALETTE_DEFAULT,
};

// --- Interval Colors (derived from palette) ---
export const INTERVAL_COLORS: { [intervalLabel: string]: string } = {
  ...Object.fromEntries(
    Object.entries(INTERVAL_PALETTE_INDEX).map(([label, idx]) => [
      label,
      CHROMATIC_PALETTE[idx],
    ])
  ),
  DEFAULT: PALETTE_DEFAULT,
};

// --- Color Scheme Type ---
export type FretboardColorScheme = "simplified" | "note" | "interval";

/**
 * Returns the appropriate color for a note based on the active scheme.
 */
export function getColor(
  scheme: FretboardColorScheme,
  noteName: string,
  intervalLabel: string
): string {
  switch (scheme) {
    case "note":
      return getNoteColor(noteName);
    case "simplified":
      return intervalLabel === "R" ? getIntervalColor("R") : PALETTE_DEFAULT;
    case "interval":
    default:
      return getIntervalColor(intervalLabel);
  }
}

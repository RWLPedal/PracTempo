/**
 * Analogous blue palette for the chromatic scale — Academic theme.
 *
 * Four functional tiers, all derived from the same blue family:
 *   Root (R):                    Deep Navy     #001F5B
 *   Major / Perfect consonances (3, 5):  Medium Slate Blue  #6A5ACD
 *   Minor / Flattened intervals (b2, b3, d5, b6, b7):
 *                                Light Steel Blue #B0C4DE  or  Soft Sky Blue #87CEEB
 *   Dissonances / Extensions (2, 4, 6, 7):  Muted Teal  #8FD1D1
 *
 * The grouping creates a visual sequence without stark contrast.
 * Both note colors and interval colors are derived from this single palette.
 */

// ---------------------------------------------------------------------------
// Core palette (index = semitones above A)
// ---------------------------------------------------------------------------

export const CHROMATIC_PALETTE: readonly string[] = [
  "#001F5B",  //  0  A  / Root  – deep navy
  "#B0C4DE",  //  1  A# / b2   – light steel blue
  "#8FD1D1",  //  2  B  / 2    – muted teal
  "#87CEEB",  //  3  C  / b3   – soft sky blue
  "#6A5ACD",  //  4  C# / 3    – medium slate blue
  "#8FD1D1",  //  5  D  / 4    – muted teal
  "#B0C4DE",  //  6  D# / d5   – light steel blue
  "#6A5ACD",  //  7  E  / 5    – medium slate blue
  "#87CEEB",  //  8  F  / b6   – soft sky blue
  "#8FD1D1",  //  9  F# / 6    – muted teal
  "#B0C4DE",  // 10  G  / b7   – light steel blue
  "#8FD1D1",  // 11  G# / 7    – muted teal
] as const;

/** Fallback color for unknown notes or intervals. */
export const PALETTE_DEFAULT = "#9AABB8";

// ---------------------------------------------------------------------------
// Note → palette index
// ---------------------------------------------------------------------------

/** Maps every chromatic note name (sharp and flat) to a palette index. */
export const NOTE_PALETTE_INDEX: Readonly<Record<string, number>> = {
  A:    0,
  "A#": 1,
  Bb:   1,
  B:    2,
  C:    3,
  "C#": 4,
  Db:   4,
  D:    5,
  "D#": 6,
  Eb:   6,
  E:    7,
  F:    8,
  "F#": 9,
  Gb:   9,
  G:    10,
  "G#": 11,
  Ab:   11,
};

// ---------------------------------------------------------------------------
// Interval → palette index
// ---------------------------------------------------------------------------

/**
 * Maps every interval label to a palette index.
 * Enharmonic intervals (d5 / #4, b6 / #5) share one palette slot.
 */
export const INTERVAL_PALETTE_INDEX: Readonly<Record<string, number>> = {
  R:    0,   // Root              → deep navy
  b2:   1,   // Minor 2nd        → light steel blue
  "2":  2,   // Major 2nd        → muted teal
  b3:   3,   // Minor 3rd        → soft sky blue
  "3":  4,   // Major 3rd        → medium slate blue
  "4":  5,   // Perfect 4th      → muted teal
  d5:   6,   // Dim 5th          → light steel blue
  "#4": 6,   // Aug 4th (alias)  → light steel blue
  "5":  7,   // Perfect 5th      → medium slate blue
  b6:   8,   // Minor 6th        → soft sky blue
  "#5": 8,   // Aug 5th (alias)  → soft sky blue
  "6":  9,   // Major 6th        → muted teal
  b7:   10,  // Minor 7th        → light steel blue
  "7":  11,  // Major 7th        → muted teal
};

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/** Returns the palette colour for a note name, or PALETTE_DEFAULT. */
export function getNoteColor(noteName: string): string {
  const idx = NOTE_PALETTE_INDEX[noteName];
  return idx !== undefined ? CHROMATIC_PALETTE[idx] : PALETTE_DEFAULT;
}

/** Returns the palette colour for an interval label, or PALETTE_DEFAULT. */
export function getIntervalColor(intervalLabel: string): string {
  const idx = INTERVAL_PALETTE_INDEX[intervalLabel];
  return idx !== undefined ? CHROMATIC_PALETTE[idx] : PALETTE_DEFAULT;
}

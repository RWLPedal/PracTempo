/**
 * Defines color constants for guitar-related rendering.
 */

// --- Note Colors ---
// Using a distinct color for each chromatic note.
// Colors chosen for visual distinction, but can be adjusted.
export const NOTE_COLORS: { [noteName: string]: string } = {
  // Using sharps for keys
  A: "#FF6B6B", // Red
  "A#": "#FF9F43", // Orange
  B: "#FFD166", // Yellow
  C: "#90EE90", // Light Green
  "C#": "#1DD1A1", // Teal
  D: "#4ECDC4", // Turquoise
  "D#": "#54A0FF", // Blue
  E: "#9B59B6", // Purple
  F: "#C7A2CB", // Lavender
  "F#": "#FDA7DF", // Pink
  G: "#E67E22", // Dark Orange
  "G#": "#BDC3C7", // Silver/Grey

  // Include flat aliases mapping to the same colors
  Bb: "#FF9F43", // Orange (Same as A#)
  Db: "#1DD1A1", // Teal (Same as C#)
  Eb: "#54A0FF", // Blue (Same as D#)
  Gb: "#FDA7DF", // Pink (Same as F#)
  Ab: "#BDC3C7", // Silver/Grey (Same as G#)
  
  DEFAULT: "#888888", // Default grey for unknown/unspecified
};

// --- Interval Colors ---
// Colors representing the function/quality of the interval relative to a root.
export const INTERVAL_COLORS: { [intervalLabel: string]: string } = {
    "R": "#E74C3C", // Root (Red) - Stable, Foundation
    "b2": "#A0522D", // Minor Second (Sienna Brown) - Dissonant, close to Root
    "2": "#F39C12", // Major Second (Orange) - Common scale tone
    "b3": "#3498DB", // Minor Third (Blue) - Defines Minor quality
    "3": "#2ECC71", // Major Third (Green) - Defines Major quality
    "4": "#9B59B6", // Perfect Fourth (Purple) - Stable Consonance
    "d5": "#7F8C8D", // Diminished Fifth (Slate Grey) - Tritone, Unstable/Dissonant
    "#4": "#7F8C8D", // Augmented Fourth (Slate Grey) - Tritone (alternate label)
    "5": "#F1C40F", // Perfect Fifth (Yellow/Gold) - Strongest Consonance
    "b6": "#6A5ACD", // Minor Sixth (Slate Blue) - Minor feel, related to b3
    "#5": "#FF00FF", // Augmented Fifth (Magenta) - Altered, Tense
    "6": "#1ABC9C", // Major Sixth (Teal/Turquoise) - Major feel, consonant
    "b7": "#483D8B", // Minor Seventh (Dark Slate Blue/Indigo) - Dominant quality, tension
    "7": "#E91E63",  // Major Seventh (Pink) - Bright, close to Octave/Root, slightly dissonant

  DEFAULT: "#555555", // Default dark grey for unspecified intervals
};

// --- Color Scheme Type ---
export type FretboardColorScheme = "simplified" | "note" | "interval"; // Changed 'default' to 'simplified'

/**
 * Gets the appropriate color based on the scheme, note, and interval.
 * @param scheme The active color scheme.
 * @param noteName The name of the note (e.g., "C#").
 * @param intervalLabel The interval label (e.g., "R", "b3", "5").
 * @returns The hex color string.
 */
export function getColor(
  scheme: FretboardColorScheme,
  noteName: string,
  intervalLabel: string
): string {
  switch (scheme) {
    case "note":
      // Use the primary name (e.g., A# over Bb) if available, otherwise the provided name
      const primaryNoteName =
        Object.keys(NOTE_COLORS).find(
          (key) =>
            key === noteName || NOTE_COLORS[key] === NOTE_COLORS[noteName]
        ) || noteName;
      return NOTE_COLORS[primaryNoteName] || NOTE_COLORS.DEFAULT;
    case "simplified": // Renamed from "default"
      // Simple logic: Red for root, dark grey otherwise
      return intervalLabel === "R"
        ? INTERVAL_COLORS["R"]
        : INTERVAL_COLORS.DEFAULT;
    case "interval": // Handle "interval" explicitly, now also default
    default: // Default behavior is now interval coloring
      return INTERVAL_COLORS[intervalLabel] || INTERVAL_COLORS.DEFAULT;
  }
}
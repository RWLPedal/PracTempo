/** Utility functions and constants for guitar features. */

export const MUSIC_NOTES = [
  ["A"],
  ["A#", "Bb"],
  ["B"],
  ["C"],
  ["C#", "Db"],
  ["D"], // Added Db
  ["D#", "Eb"],
  ["E"],
  ["F"],
  ["F#", "Gb"],
  ["G"],
  ["G#", "Ab"],
];
export const NOTE_RADIUS_PX = 13;
export const CANVAS_SUBTITLE_HEIGHT_PX = 70;
export const CANVAS_SUBTITLE_FONT = "31px 'Segoe UI'";
export const OPEN_NOTE_RADIUS_FACTOR = 0.7; // Keep factor, base radius increased
export const RAINBOW_COLORS = {
  // Basic theme for scale notes
  0: { name: "Root", color: "#56ec52" }, // Green for Root
  default: { color: "#444" }, // Dark grey for others
};
export const START_PX = 58;
export const INTERVAL_LABELS: { [key: number]: string } = {
  0: "R", // Root
  1: "b2", // Minor Second
  2: "2", // Major Second
  3: "b3", // Minor Third
  4: "3", // Major Third
  5: "4", // Perfect Fourth
  6: "d5", // Diminished Fifth (#4/b5) - Using d5 for triads
  7: "5", // Perfect Fifth
  8: "#5", // Augmented Fifth (m6) - Using #5 for triads
  9: "6", // Major Sixth (m7)
  10: "b7", // Minor Seventh
  11: "7", // Major Seventh
};

/** Finds the index (0-11) of a given note name (e.g., "C#", "Bb"). Returns -1 if not found. */
export function getKeyIndex(keyName: string): number {
  for (let i = 0; i < MUSIC_NOTES.length; i++) {
    if (MUSIC_NOTES[i].includes(keyName)) {
      return i;
    }
  }
  console.error("Unknown key: " + keyName);
  return -1; // Return -1 to indicate failure
}

/** Parses a string of chord tones (e.g., "C-E-G|G-B-D") into an array of arrays. */
export function getChordTones(
  chordTonesStr: string | undefined
): Array<Array<string>> {
  if (!chordTonesStr) return []; // Return empty array if input is undefined or empty
  return chordTonesStr
    .split("|") // Split into individual chords
    .map(
      (chord) =>
        chord
          .split("-") // Split each chord into notes
          .map((note) => note.trim()) // Trim whitespace from each note
          .filter((note) => note !== "") // Remove empty strings resulting from splitting
    )
    .filter((chordArray) => chordArray.length > 0); // Remove empty chord arrays
}

/** Removes all child elements from a given HTML element. */
export function clearAllChildren(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/** Adds a standard subtitle/header <p> element to a container. */
export function addHeader(element: HTMLElement, text: string): HTMLElement {
  const headerEl = document.createElement("p");
  headerEl.classList.add("subtitle"); // Use Bulma subtitle class
  headerEl.innerText = text;
  element.appendChild(headerEl);
  return headerEl;
}

/** Adds a standard canvas element to a container. */
export function addCanvas(
  element: HTMLElement,
  baseId: string = "featureCanvas"
): HTMLCanvasElement {
  const canvasEl = document.createElement("canvas");
  // Create a more unique ID
  canvasEl.id = `${baseId}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  // Increased default size by ~30%
  canvasEl.width = 780; // Was 600
  canvasEl.height = 780; // Was 600
  element.appendChild(canvasEl);
  return canvasEl;
}

/** Gets the display label for a given interval in semitones. */
export function getIntervalLabel(intervalSemitones: number): string {
  return INTERVAL_LABELS[intervalSemitones] ?? "?";
}

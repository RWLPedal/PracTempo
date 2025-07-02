import { Scale } from "./scales"; // Import Scale type

// Feature configuration constants
export const START_PX = 35;
export const NOTE_RADIUS_PX = 14; // Base radius
export const OPEN_NOTE_RADIUS_FACTOR = 0.7; // Make open note circles smaller
export const CANVAS_WIDTH_PX = 400;
export const CANVAS_HEIGHT_PX = 500;
export const CANVAS_SUBTITLE_HEIGHT_PX = 25;
export const CANVAS_SUBTITLE_FONT = '14px sans-serif';

// Musical constants
export const MUSIC_NOTES = [
    ['A'], ['A#', 'Bb'], ['B'], ['C'], ['C#', 'Db'], ['D'],
    ['D#', 'Eb'], ['E'], ['F'], ['F#', 'Gb'], ['G'], ['G#', 'Ab'],
];

// --- Utility Functions ---

/** Clears all child elements from a given HTML element */
export function clearAllChildren(element: HTMLElement): void {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/** Adds a simple h4 header element to a container */
export function addHeader(container: HTMLElement, text: string): HTMLElement {
    const header = document.createElement('h4');
    header.classList.add('title', 'is-6'); // Example Bulma classes
    header.style.textAlign = 'center';
    header.textContent = text;
    container.appendChild(header);
    return header;
}

/** Adds a canvas element to a container */
export function addCanvas(container: HTMLElement, idSuffix: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    // Ensure unique ID, especially if multiple diagrams are rendered
    canvas.id = `canvas-${idSuffix}-${Math.random().toString(36).substring(2, 9)}`;
    canvas.width = CANVAS_WIDTH_PX;
    canvas.height = CANVAS_HEIGHT_PX;
    container.appendChild(canvas);
    return canvas;
}


/** Finds the primary index (0-11) for a given note name (e.g., C, Db, F#) */
export function getKeyIndex(noteName: string): number {
    if (!noteName) return -1;
    // Normalize input slightly (e.g., lowercase, trim) - optional
    const normalizedNote = noteName.trim(); //.toUpperCase(); - keep case for now
    return MUSIC_NOTES.findIndex(group => group.includes(normalizedNote));
}

/** Gets chord tones for highlighting (simple implementation) */
export function getChordTones(chordTonesStr: string | undefined): Array<Array<string>> {
    if (!chordTonesStr) return [];
    return chordTonesStr.split('|').map(group => group.split('-').map(n => n.trim()).filter(n => n));
}

/**
 * Gets a standard interval label (e.g., 'R', 'b3', '5', '7') from a semitone offset.
 * @param offset - Semitones relative to the root (0-11).
 * @returns The interval label string.
 */
export function getIntervalLabel(offset: number): string {
  const labels: { [key: number]: string } = {
    0: "R",  // Root
    1: "b2", // Minor Second
    2: "2",  // Major Second
    3: "b3", // Minor Third
    4: "3",  // Major Third
    5: "4",  // Perfect Fourth
    6: "d5", // Diminished Fifth (Tritone) - can also be #4
    7: "5",  // Perfect Fifth
    8: "b6", // Minor Sixth (or #5)
    9: "6",  // Major Sixth
    10: "b7", // Minor Seventh
    11: "7", // Major Seventh (often denoted M7, but using 7 for brevity)
  };
  return labels[offset % 12] ?? "?"; // Use modulo 12 and handle unexpected offsets
}

/**
 * Gets the names of the notes in a given scale and root.
 * @param scale - The Scale object.
 * @param rootNoteIndex - The index (0-11) of the root note.
 * @returns An array of note name strings (e.g., ["C", "D", "E", "F", "G", "A", "B"]).
 */
export function getNotesInScale(scale: Scale, rootNoteIndex: number): string[] {
    if (rootNoteIndex < 0 || rootNoteIndex > 11) return [];
    return scale.degrees.map(degree => {
        const noteIndex = (rootNoteIndex + degree) % 12;
        // Return the primary name (first element) from the MUSIC_NOTES group
        return MUSIC_NOTES[noteIndex]?.[0] ?? "?";
    });
}
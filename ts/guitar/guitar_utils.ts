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
    canvas.id = `canvas-${idSuffix}-${Date.now()}`; // Add timestamp for uniqueness if needed
    canvas.width = CANVAS_WIDTH_PX;
    canvas.height = CANVAS_HEIGHT_PX;
    container.appendChild(canvas);
    return canvas;
}


/** Finds the primary index (0-11) for a given note name (e.g., C, Db, F#) */
export function getKeyIndex(noteName: string): number {
    if (!noteName) return -1;
    return MUSIC_NOTES.findIndex(group => group.includes(noteName));
}

/**
 * Parses a duration string (like "MM:SS" or "SS") into total seconds.
 * @param durationStr - The duration string.
 * @returns Total duration in seconds (integer).
 * @throws {Error} if the format is invalid.
 */
export function parseDurationString(durationStr: string): number {
    if (!durationStr || typeof durationStr !== 'string') {
        throw new Error("Invalid duration input: Must be a non-empty string.");
    }

    const parts = durationStr.trim().split(':');
    let minutes = 0;
    let seconds = 0;

    if (parts.length === 1) {
        // Only seconds provided (e.g., "120")
        seconds = parseInt(parts[0], 10);
    } else if (parts.length === 2) {
        // Minutes and seconds provided (e.g., "3:45")
        minutes = parseInt(parts[0], 10);
        seconds = parseInt(parts[1], 10);
    } else {
        throw new Error(`Invalid duration format: "${durationStr}". Use MM:SS or SS.`);
    }

    // Validate parsed numbers
    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
         throw new Error(`Invalid time values in duration: "${durationStr}". Minutes/seconds must be non-negative, seconds < 60.`);
    }

    return minutes * 60 + seconds;
}

/** Formats total seconds into a MM:SS string */
export function formatDuration(totalSeconds: number): string {
    if (isNaN(totalSeconds) || totalSeconds < 0) {
        return "0:00";
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${minutes}:${paddedSeconds}`;
}


/** Gets chord tones for highlighting (simple implementation) */
export function getChordTones(chordTonesStr: string | undefined): Array<Array<string>> {
    if (!chordTonesStr) return [];
    return chordTonesStr.split('|').map(group => group.split('-').map(n => n.trim()).filter(n => n));
}

/**
 * Gets a standard interval label (e.g., 'R', 'b3', '5', 'M7') from a semitone offset.
 * @param offset - Semitones relative to the root (0-11).
 * @returns The interval label string.
 */
export function getIntervalLabel(offset: number): string {
  const labels: { [key: number]: string } = {
    0: "R", // Root
    1: "b2", // Minor Second
    2: "2", // Major Second
    3: "b3", // Minor Third
    4: "3", // Major Third
    5: "4", // Perfect Fourth
    6: "d5", // Diminished Fifth (Tritone) - can also be #4
    7: "5", // Perfect Fifth
    8: "b6", // Minor Sixth (or #5)
    9: "6", // Major Sixth
    10: "b7", // Minor Seventh
    11: "7", // Major Seventh
  };
  return labels[offset] ?? "?"; // Return label or '?' if offset is unexpected
}
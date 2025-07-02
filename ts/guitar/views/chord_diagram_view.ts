import { View } from "../../view";
import { Chord } from "../chords";
// Import Fretboard class and necessary types/enum from fretboard.ts
import {
  Fretboard,
  FretboardConfig,
  NoteRenderData,
  LineData,
  NoteIcon,
} from "../fretboard";
import {
  START_PX,
  OPEN_NOTE_RADIUS_FACTOR,
  MUSIC_NOTES,
  getKeyIndex,
  getIntervalLabel,
  addHeader, // Use for external title
  addCanvas,
} from "../guitar_utils";

/**
 * Helper to get the notes in a chord.
 * @param chord - The Chord object.
 * @param config - FretboardConfig for tuning info.
 * @returns Sorted array of note names in the chord.
 */
function getChordNotes(chord: Chord, config: FretboardConfig): string[] {
  const notes = new Set<string>();
  const tuning = config.tuning.tuning;
  for (let i = 0; i < chord.strings.length; i++) {
    const fret = chord.strings[i];
    if (fret >= 0 && i < tuning.length) {
      // Check fret >= 0 and valid string index
      const noteIndex = (tuning[i] + fret) % 12;
      notes.add(MUSIC_NOTES[noteIndex]?.[0] ?? "?");
    }
  }
  // Define a canonical note order for sorting
  const canonicalOrder = MUSIC_NOTES.map((n) => n[0]);
  return Array.from(notes).sort(
    (a, b) => canonicalOrder.indexOf(a) - canonicalOrder.indexOf(b)
  );
}

/**
 * A View responsible for rendering a single chord diagram by configuring
 * and delegating to an internal Fretboard instance.
 */
export class ChordDiagramView implements View {
  private chord: Chord;
  private title: string;
  private fretboardConfig: FretboardConfig;
  private fretboard: Fretboard; // Internal Fretboard logic/drawing instance
  private wrapperDiv: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Store calculated dimensions
  private requiredWidth: number = 0;
  private requiredHeight: number = 0;
  private readonly fretCount: number = 5; // Standard for chord diagrams

  constructor(chord: Chord, title: string, fretboardConfig: FretboardConfig) {
    this.chord = chord;
    this.title = title;
    this.fretboardConfig = fretboardConfig;

    // Calculate dimensions needed for canvas
    this.calculateDimensions();

    // Instantiate the Fretboard logic class
    // The Fretboard class uses START_PX internally for drawing padding
    const scaledStartPx = START_PX * this.fretboardConfig.scaleFactor;
    this.fretboard = new Fretboard(
      this.fretboardConfig,
      scaledStartPx, // Pass scaled start X for drawing origin within canvas
      scaledStartPx, // Pass scaled start Y for drawing origin within canvas
      this.fretCount
    );

    // Prepare note data immediately and pass it to the Fretboard instance
    this.prepareAndSetChordData();
  }

  /** Calculates the required canvas dimensions. */
  private calculateDimensions(): void {
    const config = this.fretboardConfig;
    const scaleFactor = config.scaleFactor;
    const scaledNoteRadius = config.noteRadiusPx;
    const scaledStartPx = START_PX * scaleFactor;
    // Clearance needed above the nut line for potential open notes/muted markers
    const openNoteClearance = scaledNoteRadius * 1.5 + 5 * scaleFactor;
    // Height of the fretted area
    const fretboardLinesHeight = this.fretCount * config.fretLengthPx;
    // Clearance needed below the last fret line
    const bottomClearance = scaledNoteRadius + 5 * scaleFactor;

    this.requiredWidth =
      scaledStartPx + config.stringSpacingPx * 5 + scaledStartPx; // LeftPad + Strings + RightPad
    // Height includes space *within the canvas* for grid, clearances, and padding
    this.requiredHeight =
      scaledStartPx +
      openNoteClearance +
      fretboardLinesHeight +
      bottomClearance +
      scaledStartPx;
  }

  /** Calculates NoteRenderData for the chord and passes it to the Fretboard instance. */
  private prepareAndSetChordData(): void {
    const notesData: NoteRenderData[] = [];
    const config = this.fretboardConfig;

    // Determine starting fret for the diagram display range
    let minFret = this.fretCount + 1;
    let maxFret = 0;
    this.chord.strings.forEach((fret) => {
      if (fret > 0) {
        minFret = Math.min(minFret, fret);
        maxFret = Math.max(maxFret, fret);
      }
    });
    let startFret = 0; // Fret number the diagram starts AT (0 means show nut)
    // If the lowest fretted note is too high OR the total range exceeds the display count
    if (minFret > this.fretCount || maxFret - minFret >= this.fretCount) {
      startFret = minFret - 1; // Start diagram just below lowest fretted note
    }
    // Pass startFret to Fretboard instance
    this.fretboard.setStartFret(startFret); // Call the new method

    const chordRootName = this.getChordRootNote();
    const chordRootIndex = chordRootName ? getKeyIndex(chordRootName) : -1;

    for (
      let stringIndex = 0;
      stringIndex < this.chord.strings.length;
      stringIndex++
    ) {
      if (stringIndex >= config.tuning.tuning.length) continue;

      const fret = this.chord.strings[stringIndex]; // Actual fret (-1, 0, or >0)
      const finger = this.chord.fingers[stringIndex];
      const displayFretForNote = fret - startFret; // Fret relative to diagram start

      // Include note if it's muted, open, or within the displayed fret range
      if (
        fret === -1 ||
        (displayFretForNote >= 0 && displayFretForNote <= this.fretCount)
      ) {
        const isMuted = fret === -1;
        const isOpen = fret === 0;
        let noteName = "?";
        let intervalLabel = "?";
        let displayLabel = finger > 0 ? `${finger}` : ""; // Prioritize finger number

        if (!isMuted) {
          const noteOffsetFromA =
            (config.tuning.tuning[stringIndex] + fret) % 12;
          noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
          if (chordRootIndex !== -1) {
            const noteRelativeToKey =
              (noteOffsetFromA - chordRootIndex + 12) % 12;
            intervalLabel = getIntervalLabel(noteRelativeToKey);
          }
          // Fallback display label if no finger number
          if (displayLabel === "") {
            // Use interval label for root, note name otherwise
            if (intervalLabel === "R") displayLabel = "R";
            else displayLabel = noteName;
          }
        }

        notesData.push({
          fret: fret, // Pass the ACTUAL fret to Fretboard drawing logic
          stringIndex: stringIndex,
          noteName: noteName,
          intervalLabel: intervalLabel,
          displayLabel: displayLabel,
          colorSchemeOverride: config.colorScheme, // Use diagram's configured scheme
          radiusOverride: isOpen
            ? config.noteRadiusPx * OPEN_NOTE_RADIUS_FACTOR
            : undefined,
        });
      }
    }

    // Set notes (and clear lines for single chord diagram)
    this.fretboard.setNotes(notesData);
    this.fretboard.setLines([]); // Explicitly clear lines
  }

  /** Creates the wrapper div, title, canvas and triggers the render via the Fretboard instance. */
  render(container: HTMLElement): void {
    if (!this.wrapperDiv) {
      this.createElements(container);
    } else {
      if (!this.wrapperDiv.parentNode) {
        container.appendChild(this.wrapperDiv); // Re-attach if detached
      }
    }

    if (this.ctx) {
      // Delegate all drawing to the Fretboard instance
      this.fretboard.render(this.ctx);
    } else {
      console.error(
        "Canvas context not available for ChordDiagramView render:",
        this.title
      );
    }
  }

  /** Creates the wrapper, title, and canvas elements. */
  private createElements(container: HTMLElement): void {
    // --- Create Wrapper Div ---
    this.wrapperDiv = document.createElement("div");
    this.wrapperDiv.classList.add("chord-diagram-view");
    this.wrapperDiv.style.display = "inline-block";
    this.wrapperDiv.style.verticalAlign = "top";
    this.wrapperDiv.style.padding = "5px";
    this.wrapperDiv.style.minWidth = `${this.requiredWidth}px`; // Use calculated width

    // --- Add Title (External to Canvas) ---
    const titleEl = addHeader(this.wrapperDiv, this.title);
    titleEl.classList.replace("is-6", "is-6"); // Adjusted size (e.g., is-6 instead of is-7)
    titleEl.style.marginBottom = `4px`; // Adjust spacing if needed

    // --- Add Notes List ---
    const notesList = getChordNotes(this.chord, this.fretboardConfig); // Call helper
    const notesEl = document.createElement("div");
    notesEl.classList.add("chord-notes-list"); // Add class for styling
    notesEl.textContent = notesList.join(", ");
    notesEl.style.fontSize = "0.75rem"; // Smaller font size for notes
    notesEl.style.textAlign = "center";
    notesEl.style.color = "var(--clr-text-subtle)"; // Use a subtle color
    notesEl.style.marginBottom = "8px"; // Space below notes, before canvas
    this.wrapperDiv.appendChild(notesEl); // Append notes below title

    // --- Create Canvas ---
    const canvasIdSuffix = `chord-${this.title.replace(/[^a-zA-Z0-9-]/g, "_")}`;
    this.canvas = addCanvas(this.wrapperDiv, canvasIdSuffix); // Add canvas to wrapper
    this.canvas.width = Math.max(150, this.requiredWidth);
    this.canvas.height = Math.max(200, this.requiredHeight);

    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) {
      console.error("Failed to get 2D context for chord diagram:", this.title);
      this.canvas = null;
      return;
    }

    // Append the wrapper to the main container
    container.appendChild(this.wrapperDiv);
  }

  /** Helper to get chord root note - needed for interval calculation */
  private getChordRootNote(): string | null {
    if (!this.chord || !this.chord.name) return null;
    const chordName = this.chord.name;
    // Match common root note patterns (A, A#, Ab, G# etc.)
    const match = chordName.match(/^([A-G])([#b]?)/);
    if (match) {
      const rootName = `${match[1]}${match[2] || ""}`;
      // Validate against known notes
      if (MUSIC_NOTES.flat().includes(rootName)) return rootName;
    }
    // Fallback might be needed if chord_library keys differ significantly from names
    console.warn(`Could not determine root note for chord name: ${chordName}`);
    return null;
  }

  // --- View Lifecycle Methods ---
  start(): void {} // No active processes

  stop(): void {} // No active processes

  destroy(): void {
    if (this.wrapperDiv && this.wrapperDiv.parentNode) {
      this.wrapperDiv.parentNode.removeChild(this.wrapperDiv);
    }
    this.wrapperDiv = null;
    this.canvas = null;
    this.ctx = null;
    this.fretboard?.clearMarkings(); // Clear data in underlying fretboard
  }
}

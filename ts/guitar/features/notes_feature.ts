/* ts/guitar/features/notes_feature.ts */

import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Fretboard } from "../fretboard";
import { AppSettings } from "../../settings";
import { AudioController } from "../../audio_controller";
import {
  MUSIC_NOTES,
  START_PX,
  getKeyIndex,
  getIntervalLabel,
} from "../guitar_utils"; // Removed unused radius/font imports
import { FretboardColorScheme } from "../colors"; // Import color scheme type only

/** A guitar feature for displaying all notes on the fretboard with specific coloring logic. */
export class NotesFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Notes";
  static readonly displayName = "Fretboard Notes";
  static readonly description =
    "Displays all notes on the fretboard. Select 'None' for note-based colors, or a root note for interval-based colors (overrides global color scheme for this feature).";
  readonly typeName = NotesFeature.typeName;
  private readonly rootNoteName: string | null; // Store optional root note

  constructor(
    config: ReadonlyArray<string>,
    settings: AppSettings,
    rootNoteName: string | null, // Accept optional root note
    metronomeBpmOverride?: number,
    audioController?: AudioController,
    maxCanvasHeight?: number // Add maxCanvasHeight
  ) {
    // --- Log Entry ---
    console.log(
      `[NotesFeature.constructor] Called. RootNote: ${rootNoteName}, maxCanvasHeight: ${maxCanvasHeight}`
    );
    // --- End Log ---

    // Pass maxCanvasHeight to the base constructor
    super(
      config,
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
    this.rootNoteName = rootNoteName;
    // this.fretboardConfig is now set in the base constructor
  }

  static getConfigurationSchema(): ConfigurationSchema {
    // Add "None" to the list of keys for the dropdown
    const availableKeys = ["None", ...MUSIC_NOTES.flat()];
    return {
      description: `Config: ${this.typeName}[,RootNote][,GuitarSettings]`,
      args: [
        {
          name: "RootNote",
          type: "enum",
          required: false, // Optional, defaults to "None" behavior if omitted
          enum: availableKeys, // Include "None"
          description:
            "Select 'None' (default) to color by note name, or a root note to color by interval.",
        },
        {
          name: "Guitar Settings",
          type: "ellipsis",
          uiComponentType: "ellipsis",
          description:
            "Configure interval-specific guitar settings (e.g., Metronome).",
          nestedSchema: [
            {
              name: "metronomeBpm",
              type: "number",
              description: "Metronome BPM (0=off)",
            },
            // Global color scheme is ignored by this feature's rendering logic
          ],
        },
      ],
    };
  }

  static createFeature(
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    maxCanvasHeight?: number // Add maxCanvasHeight
  ): Feature {
    // --- Log Entry ---
    console.log(
      `[NotesFeature.createFeature] Called with config: [${config.join(
        ", "
      )}], maxCanvasHeight: ${maxCanvasHeight}`
    );
    // --- End Log ---

    let rootNoteName: string | null = null;
    let processedConfig = config;

    // ... (rest of the existing createFeature logic) ...
    if (config.length > 0 && config[0]) {
      const potentialRoot = config[0];
      if (potentialRoot.toLowerCase() === "none") {
        rootNoteName = null;
        console.log(`[NotesFeature.createFeature] Using note-based coloring.`);
        processedConfig = config.slice(1);
      } else if (getKeyIndex(potentialRoot) !== -1) {
        rootNoteName = potentialRoot;
        console.log(
          `[NotesFeature.createFeature] Using interval-based coloring relative to ${rootNoteName}.`
        );
        processedConfig = config.slice(1);
      } else {
        console.warn(
          `[NotesFeature.createFeature] Invalid config value "${potentialRoot}", defaulting to note-based coloring.`
        );
        rootNoteName = null;
      }
    } else {
      rootNoteName = null;
      console.log(
        `[NotesFeature.createFeature] No RootNote specified, using note-based coloring.`
      );
      processedConfig = config;
    }

    // Pass the potentially null rootNoteName, adjusted config, and maxCanvasHeight
    return new NotesFeature(
      processedConfig,
      settings,
      rootNoteName,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight // Pass height to constructor
    );
  }

  render(container: HTMLElement): void {
    const headerText = this.rootNoteName
      ? `Notes (Interval Colors Relative to ${this.rootNoteName})`
      : "Notes (Note Name Colors)";
    const { canvas, ctx } = this.clearAndAddCanvas(container, headerText);

    const fretCount = 18;
    const config = this.fretboardConfig; // Alias
    const scaleFactor = config.scaleFactor;
    const scaledNoteRadius = config.noteRadiusPx;
    const scaledFretLength = config.fretLengthPx;

    // --- Height & Position Calculation ---
    const topPadding = START_PX * scaleFactor; // Basic padding from canvas top edge
    // Clearance needed above the nut line for open notes/muted markers
    const openNoteClearance = scaledNoteRadius * 1.5 + (5 * scaleFactor);
    // Height of the fretted area
    const fretboardLinesHeight = fretCount * scaledFretLength;
    // Clearance needed below the last fret line for notes/markers
    const bottomClearance = scaledNoteRadius + (5 * scaleFactor);
    // Padding below the diagram elements
    const bottomPadding = 65 * scaleFactor;

    // Total height needed is padding + clearance + fret height + clearance + padding
    const requiredHeight = topPadding + openNoteClearance + fretboardLinesHeight + bottomClearance + bottomPadding;

    // --- Width Calculation ---
    const requiredWidth =
        START_PX * scaleFactor + 5 * config.stringSpacingPx + START_PX * scaleFactor;
    canvas.width = Math.max(300, requiredWidth);
    canvas.height = requiredHeight;

    // --- Rendering ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.resetTransform();
    ctx.translate(0.5, 0.5);

    // Fretboard constructor now receives the absolute top padding (top edge of drawing area)
    const scaledStartPxX = START_PX * scaleFactor;
    const fretboard = new Fretboard(
      config,
      scaledStartPxX, // X starting point
      topPadding,     // Y starting point (absolute top of diagram area)
      fretCount
    );
    // Fretboard.render will internally calculate nutLineY based on topPadding + openNoteClearance
    fretboard.render(ctx);

    // --- Note Drawing Logic ---
    // (No changes needed in the loop itself, renderFingering handles new Y calc)
    const rootNoteIndex = this.rootNoteName ? getKeyIndex(this.rootNoteName) : -1;
    const schemeOverride: FretboardColorScheme = this.rootNoteName ? "interval" : "note";
    const fontSize = 16 * scaleFactor;
    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      for (let fretIndex = 0; fretIndex <= fretboard.fretCount; fretIndex++) {
         const noteOffsetFromA = (config.tuning.tuning[stringIndex] + fretIndex) % 12;
         const noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
         let intervalLabel = "?";
         if (rootNoteIndex !== -1) {
           const noteRelativeToKey = (noteOffsetFromA - rootNoteIndex + 12) % 12;
           intervalLabel = getIntervalLabel(noteRelativeToKey);
         }
         const displayLabel = noteName;
         fretboard.renderFingering(
           ctx, fretIndex, stringIndex, noteName, intervalLabel, displayLabel,
           scaledNoteRadius, fontSize, false,
           "black", 1, undefined, schemeOverride
         );
      }
    }
  }
}

/* ts/guitar/features/notes_feature.ts */

import {
  Feature,
  // FeatureCategoryName removed
  ConfigurationSchema,
  ConfigurationSchemaArg,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { AppSettings } from "../../settings";
import { AudioController } from "../../audio_controller";
// Import generic and specific interval settings types
import { IntervalSettings } from "../../schedule/editor/interval/types";
import { GuitarIntervalSettings } from "../guitar_interval_settings";
import { NoteRenderData, FretboardConfig } from "../fretboard"; // Import FretboardConfig
import {
  MUSIC_NOTES,
  getKeyIndex,
  getIntervalLabel,
  OPEN_NOTE_RADIUS_FACTOR,
  addHeader,
  clearAllChildren,
} from "../guitar_utils";
import { FretboardColorScheme } from "../colors";
import { FretboardView } from "../views/fretboard_view";

/** A guitar feature for displaying all notes on the fretboard using FretboardView. */
export class NotesFeature extends GuitarFeature {
  // Static properties (category removed, others unchanged)
  // static readonly category = FeatureCategoryName.Guitar; // Removed
  static readonly typeName = "Notes";
  static readonly displayName = "Fretboard Notes";
  static readonly description =
    "Displays all notes on the fretboard. Select 'None' for note-based colors, or a root note for interval-based colors.";

  readonly typeName = NotesFeature.typeName;
  private readonly rootNoteName: string | null;
  private fretboardViewInstance: FretboardView;

  constructor(
    config: ReadonlyArray<string>, // Should be empty now for NotesFeature specific args
    settings: AppSettings,
    rootNoteName: string | null, // Pass the parsed rootNoteName
    intervalSettings: GuitarIntervalSettings, // Constructor expects specific type
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    super(config, settings, intervalSettings, audioController, maxCanvasHeight); // Pass specific type
    this.rootNoteName = rootNoteName;
    const fretCount = 18;

    // Create FretboardView instance (Metronome is handled by base class)
    this.fretboardViewInstance = new FretboardView(
      this.fretboardConfig,
      fretCount
    );
    this._views.push(this.fretboardViewInstance);

    this.calculateAndSetNotes(fretCount);
  }

  // --- Static Methods ---
  static getConfigurationSchema(): ConfigurationSchema {
    // Unchanged
    const availableKeys = ["None", ...MUSIC_NOTES.flat()];
    const specificArgs: ConfigurationSchemaArg[] = [
      {
        name: "RootNote",
        type: "enum",
        required: false, // Optional argument
        enum: availableKeys,
        description:
          "Select 'None' (default) to color by note name, or a root note to color by interval.",
      },
    ];
    return {
      description: `Config: ${this.typeName}[,RootNote][,GuitarSettings]`,
      args: [...specificArgs, GuitarFeature.BASE_GUITAR_SETTINGS_CONFIG_ARG], // Merge with base
    };
  }

  // **** UPDATED createFeature Signature ****
  static createFeature(
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings,
    intervalSettings: IntervalSettings, // <<< CHANGED: Accept generic base type
    maxCanvasHeight: number | undefined,
    categoryName: string // <<< ADDED: Accept category name string
  ): Feature {
    let rootNoteName: string | null = null;
    let featureSpecificConfig: ReadonlyArray<string> = []; // NotesFeature has no specific args to pass down

    // Notes feature has only one optional specific argument: RootNote
    if (config.length > 0 && config[0]) {
      const potentialRoot = config[0];
      if (potentialRoot.toLowerCase() === "none") {
        rootNoteName = null;
        // featureSpecificConfig remains empty
      } else if (getKeyIndex(potentialRoot) !== -1) {
        rootNoteName = potentialRoot;
        // featureSpecificConfig remains empty
      } else {
        console.warn(
          `[${this.typeName}] Invalid RootNote value "${potentialRoot}", using note-based coloring.`
        );
        rootNoteName = null;
        // featureSpecificConfig remains empty
      }
    } else {
      // No argument provided, default to note-based coloring
      rootNoteName = null;
    }

    // --- Type Assertion for Constructor ---
    const guitarIntervalSettings = intervalSettings as GuitarIntervalSettings;
    // --- End Type Assertion ---

    return new NotesFeature(
      featureSpecificConfig, // Pass empty array
      settings,
      rootNoteName, // Pass parsed root note
      guitarIntervalSettings, // Pass asserted specific type
      audioController,
      maxCanvasHeight
    );
  }

  /** Calculates all note data and passes it to the FretboardView instance. */
  private calculateAndSetNotes(fretCount: number): void {
    // Unchanged
    // ... (Implementation from previous response) ...
    const notesData: NoteRenderData[] = [];
    const rootNoteIndex = this.rootNoteName
      ? getKeyIndex(this.rootNoteName)
      : -1;
    const schemeOverride: FretboardColorScheme = this.rootNoteName
      ? "interval"
      : "note";
    const config = this.fretboardConfig;
    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      if (stringIndex >= config.tuning.tuning.length) continue;
      const stringTuning = config.tuning.tuning[stringIndex];
      for (let fretIndex = 0; fretIndex <= fretCount; fretIndex++) {
        const noteOffsetFromA = (stringTuning + fretIndex) % 12;
        const noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
        let intervalLabel = "?";
        if (rootNoteIndex !== -1) {
          const noteRelativeToKey = (noteOffsetFromA - rootNoteIndex + 12) % 12;
          intervalLabel = getIntervalLabel(noteRelativeToKey);
        }
        notesData.push({
          fret: fretIndex,
          stringIndex: stringIndex,
          noteName: noteName,
          intervalLabel: intervalLabel,
          displayLabel: noteName,
          colorSchemeOverride: schemeOverride,
          radiusOverride:
            fretIndex === 0
              ? config.noteRadiusPx * OPEN_NOTE_RADIUS_FACTOR
              : undefined,
        });
      }
    }
    requestAnimationFrame(() => {
      if (this.fretboardViewInstance) {
        this.fretboardViewInstance.setNotes(notesData);
        this.fretboardViewInstance.setLines([]);
      }
    });
  }

  render(container: HTMLElement): void {
    // Unchanged
    clearAllChildren(container);
    const headerText = this.rootNoteName
      ? `Notes (Interval Colors Relative to ${this.rootNoteName})`
      : "Notes (Note Name Colors)";
    addHeader(container, headerText);
  }
}

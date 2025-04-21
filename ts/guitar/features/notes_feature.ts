/* ts/guitar/features/notes_feature.ts */

import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
  ConfigurationSchemaArg,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { AppSettings } from "../../settings";
import { AudioController } from "../../audio_controller";
import { GuitarIntervalSettings } from "../guitar_interval_settings";
import {
  MUSIC_NOTES,
  getKeyIndex,
  getIntervalLabel,
  START_PX,
  OPEN_NOTE_RADIUS_FACTOR, // Ensure this is imported if used
  addHeader,
  clearAllChildren,
} from "../guitar_utils";
import { FretboardColorScheme } from "../colors";
import { FretboardView, NoteRenderData } from "../views/fretboard_view";
import { View } from "../../view";

/** A guitar feature for displaying all notes on the fretboard using FretboardView. */
export class NotesFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Notes";
  static readonly displayName = "Fretboard Notes";
  static readonly description =
    "Displays all notes on the fretboard. Select 'None' for note-based colors, or a root note for interval-based colors.";
  readonly typeName = NotesFeature.typeName;
  private readonly rootNoteName: string | null;
  private fretboardViewInstance: FretboardView; // Hold the instance

  constructor(
    config: ReadonlyArray<string>, // Specific args (currently none expected)
    settings: AppSettings,
    rootNoteName: string | null,
    intervalSettings: GuitarIntervalSettings,
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    super(config, settings, intervalSettings, audioController, maxCanvasHeight);
    this.rootNoteName = rootNoteName;

    const fretCount = 18;

    const views: View[] = [];

    // 1. Create FretboardView
    this.fretboardViewInstance = new FretboardView(
      this.fretboardConfig,
      fretCount
    );
    // Base class constructor handles MetronomeView creation and adds to _views
    // We add our specific views to _views array from the base class
    this._views.push(this.fretboardViewInstance);

    this.calculateAndSetNotes(fretCount);
  }

  // Static methods
  static getConfigurationSchema(): ConfigurationSchema {
    const availableKeys = ["None", ...MUSIC_NOTES.flat()];
    const specificArgs: ConfigurationSchemaArg[] = [
      {
        name: "RootNote",
        type: "enum",
        required: false,
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

  static createFeature(
    config: ReadonlyArray<string>, // Raw config list [OptionalRootNote, ...]
    audioController: AudioController,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings,
    maxCanvasHeight?: number
  ): Feature {
    let rootNoteName: string | null = null;
    // <<< FIX: Declare as ReadonlyArray to match potential assignment from config >>>
    let featureSpecificConfig: ReadonlyArray<string> = [];

    if (config.length > 0 && config[0]) {
      const potentialRoot = config[0];
      if (potentialRoot.toLowerCase() === "none") {
        rootNoteName = null;
        featureSpecificConfig = config.slice(1); // slice() returns mutable, assignable to readonly
      } else if (getKeyIndex(potentialRoot) !== -1) {
        rootNoteName = potentialRoot;
        featureSpecificConfig = config.slice(1); // slice() returns mutable, assignable to readonly
      } else {
        console.warn(
          `[NotesFeature.createFeature] Invalid or ambiguous RootNote value "${potentialRoot}", defaulting to note-based coloring.`
        );
        rootNoteName = null;
        featureSpecificConfig = config; // Assigning readonly to readonly is OK
      }
    } else {
      rootNoteName = null;
      featureSpecificConfig = config; // Assigning readonly to readonly is OK
    }

    return new NotesFeature(
      featureSpecificConfig, // Pass readonly array
      settings,
      rootNoteName,
      intervalSettings,
      audioController,
      maxCanvasHeight
    );
  }

  /** Calculates all note data and passes it to the FretboardView instance. */
  private calculateAndSetNotes(fretCount: number): void {
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
      for (let fretIndex = 0; fretIndex <= fretCount; fretIndex++) {
        const noteOffsetFromA =
          (config.tuning.tuning[stringIndex] + fretIndex) % 12;
        const noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
        let intervalLabel = "?";
        if (rootNoteIndex !== -1) {
          const noteRelativeToKey = (noteOffsetFromA - rootNoteIndex + 12) % 12;
          intervalLabel = getIntervalLabel(noteRelativeToKey);
        }
        const displayLabel = noteName;

        notesData.push({
          fret: fretIndex,
          stringIndex: stringIndex,
          noteName: noteName,
          intervalLabel: intervalLabel,
          displayLabel: displayLabel,
          colorSchemeOverride: schemeOverride,
          radiusOverride:
            fretIndex === 0
              ? config.noteRadiusPx * OPEN_NOTE_RADIUS_FACTOR
              : undefined,
        });
      }
    }
    // Use requestAnimationFrame for smoother UI updates when setting notes
    requestAnimationFrame(() => {
      if (this.fretboardViewInstance) {
        // Ensure view still exists
        this.fretboardViewInstance.setNotes(notesData);
      }
    });
  }

  /** Render method now just adds the header. Views are rendered by DisplayController. */
  render(container: HTMLElement): void {
    clearAllChildren(container);
    const headerText = this.rootNoteName
      ? `Notes (Interval Colors Relative to ${this.rootNoteName})`
      : "Notes (Note Name Colors)";
    addHeader(container, headerText);
  }
}

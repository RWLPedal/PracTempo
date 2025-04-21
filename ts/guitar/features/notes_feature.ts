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
import { NoteRenderData } from "../fretboard";
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
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Notes";
  static readonly displayName = "Fretboard Notes";
  static readonly description =
    "Displays all notes on the fretboard. Select 'None' for note-based colors, or a root note for interval-based colors.";
  readonly typeName = NotesFeature.typeName;
  private readonly rootNoteName: string | null;
  private fretboardViewInstance: FretboardView; // Hold the instance

  constructor(
    config: ReadonlyArray<string>,
    settings: AppSettings,
    rootNoteName: string | null,
    intervalSettings: GuitarIntervalSettings,
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    super(config, settings, intervalSettings, audioController, maxCanvasHeight);
    this.rootNoteName = rootNoteName;
    const fretCount = 18;

    // Create FretboardView instance (Metronome is handled by base class)
    this.fretboardViewInstance = new FretboardView(
      this.fretboardConfig,
      fretCount
    );
    this._views.push(this.fretboardViewInstance); // Add to views managed by base class

    this.calculateAndSetNotes(fretCount);
  }

  // Static methods (getConfigurationSchema, createFeature) remain unchanged from previous version

  // --- Static Methods ---
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
    intervalSettings: GuitarIntervalSettings, // <<< Use interval settings
    maxCanvasHeight?: number
  ): Feature {
    let rootNoteName: string | null = null;
    let featureSpecificConfig: ReadonlyArray<string> = [];

    if (config.length > 0 && config[0]) {
      const potentialRoot = config[0];
      if (potentialRoot.toLowerCase() === "none") {
        rootNoteName = null;
        featureSpecificConfig = config.slice(1);
      } else if (getKeyIndex(potentialRoot) !== -1) {
        rootNoteName = potentialRoot;
        featureSpecificConfig = config.slice(1);
      } else {
        console.warn(
          `[NotesFeature.createFeature] Invalid RootNote value "${potentialRoot}", using note-based coloring.`
        );
        rootNoteName = null;
        featureSpecificConfig = config;
      }
    } else {
      rootNoteName = null;
      featureSpecificConfig = config;
    }

    return new NotesFeature(
      featureSpecificConfig,
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

        notesData.push({
          fret: fretIndex,
          stringIndex: stringIndex,
          noteName: noteName,
          intervalLabel: intervalLabel,
          displayLabel: noteName, // Display note name for this feature
          // icon: NoteIcon.None, // Default is no icon
          colorSchemeOverride: schemeOverride,
          // strokeWidth: 1, // Use default stroke width
          radiusOverride:
            fretIndex === 0
              ? config.noteRadiusPx * OPEN_NOTE_RADIUS_FACTOR
              : undefined,
          // fillColor: undefined, // Use scheme color
          // strokeColor: undefined // Use default stroke
        });
      }
    }
    // Use rAF for smoother updates
    requestAnimationFrame(() => {
      if (this.fretboardViewInstance) {
        this.fretboardViewInstance.setNotes(notesData);
        this.fretboardViewInstance.setLines([]); // Ensure no lines are drawn
      }
    });
  }

  render(container: HTMLElement): void {
    clearAllChildren(container);
    const headerText = this.rootNoteName
      ? `Notes (Interval Colors Relative to ${this.rootNoteName})`
      : "Notes (Note Name Colors)";
    addHeader(container, headerText);
    // DisplayController renders the FretboardView added in constructor
  }
}

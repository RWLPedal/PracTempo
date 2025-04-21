// ts/guitar/features/chord_progression_feature.ts
import {
  Feature,
  // FeatureCategoryName removed
  ConfigurationSchema,
  ConfigurationSchemaArg,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Chord, chord_library } from "../chords";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
// Import generic and specific interval settings types
import { IntervalSettings } from "../../schedule/editor/interval/types";
import { GuitarIntervalSettings } from "../guitar_interval_settings";
import {
  MUSIC_NOTES,
  getKeyIndex,
  addHeader,
  clearAllChildren,
} from "../guitar_utils";
import { getChordInKey } from "../progressions";
import { ChordDiagramView } from "../views/chord_diagram_view";

/** Displays chord diagrams for a Roman numeral progression in a given key. */
export class ChordProgressionFeature extends GuitarFeature {
  // Static properties (category removed, others unchanged)
  // static readonly category = FeatureCategoryName.Guitar; // Removed
  static readonly typeName = "Chord Progression";
  static readonly displayName = "Chord Progression";
  static readonly description =
    "Displays chord diagrams for a Roman numeral progression (e.g., I-IV-V) in a specified key.";

  readonly typeName = ChordProgressionFeature.typeName;
  private readonly rootNoteName: string;
  private readonly progression: string[]; // Array of Roman numerals specific to this feature
  private readonly headerText: string;

  constructor(
    config: ReadonlyArray<string>, // Should contain only progression numerals now
    rootNoteName: string,
    progression: string[],
    headerText: string,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings, // Constructor expects specific type
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    super(
      config, // Pass specific config
      settings,
      intervalSettings, // Pass specific type
      audioController,
      maxCanvasHeight
    );
    this.rootNoteName = rootNoteName;
    this.progression = progression;
    this.headerText = headerText;

    // Create ChordDiagramViews (metronome view is handled by base constructor)
    const rootNoteIndex = getKeyIndex(this.rootNoteName);
    if (rootNoteIndex !== -1) {
      this.progression.forEach((numeral) => {
        const chordDetails = getChordInKey(rootNoteIndex, numeral);
        const chordData = chordDetails.chordKey
          ? chord_library[chordDetails.chordKey]
          : null;
        if (chordData) {
          const title = `${chordDetails.chordName} (${numeral})`;
          // Add view to the mutable _views array from base class
          this._views.push(
            new ChordDiagramView(chordData, title, this.fretboardConfig)
          );
        } else {
          console.warn(
            `[${this.typeName}] Chord data not found for ${chordDetails.chordName} (${numeral}) in key ${this.rootNoteName}`
          );
        }
      });
    } else {
      console.error(
        `[${this.typeName}] Invalid root note provided: ${this.rootNoteName}`
      );
    }
  }

  // --- Static Methods ---
  static getConfigurationSchema(): ConfigurationSchema {
    // Unchanged
    const availableKeys = MUSIC_NOTES.flat();
    // Corrected progression labels based on actual schema definition in progressions.ts
    const progressionButtonLabels = [
      "I",
      "ii",
      "iii",
      "IV",
      "V",
      "vi",
      "vii°",
      "Imaj7",
      "ii7",
      "iii7",
      "IVmaj7",
      "V7",
      "vi7",
      "viiø7",
    ];

    const specificArgs: ConfigurationSchemaArg[] = [
      {
        name: "RootNote",
        type: "enum",
        required: true,
        enum: availableKeys,
        description: "Root note (key) of the progression.",
      },
      {
        name: "Progression",
        type: "string",
        required: true, // Underlying type is string (joined later if needed)
        uiComponentType: "toggle_button_selector", // Use toggle buttons
        uiComponentData: { buttonLabels: progressionButtonLabels }, // Provide labels
        isVariadic: true, // Allow multiple selections
        description:
          "Build the progression sequence using the Roman numeral buttons.",
      },
    ];
    return {
      description: `Config: ${this.typeName},RootNote,ProgressionSequence...[,GuitarSettings]`,
      args: [...specificArgs, GuitarFeature.BASE_GUITAR_SETTINGS_CONFIG_ARG],
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
    // --- Parse Config Args ---
    // Assume RootNote is first, Progression numerals follow.
    if (config.length < 2) {
      // Need at least RootNote and one Numeral
      throw new Error(
        `[${
          this.typeName
        }] Invalid config. Expected [RootNote, Numeral1, ...], received: [${config.join(
          ", "
        )}]`
      );
    }
    const rootNoteName = config[0];
    const progressionNumerals = config.slice(1); // Rest are numerals

    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1)
      throw new Error(`[${this.typeName}] Unknown key: "${rootNoteName}"`);
    const validRootName = MUSIC_NOTES[keyIndex]?.[0] ?? rootNoteName;

    if (progressionNumerals.length === 0) {
      throw new Error(`[${this.typeName}] Progression cannot be empty.`);
    }
    // Basic validation of numerals? Maybe not here. getChordInKey will handle unknown ones.

    const headerText = `${progressionNumerals.join(
      "-"
    )} Progression in ${validRootName}`;

    // --- Type Assertion for Constructor ---
    const guitarIntervalSettings = intervalSettings as GuitarIntervalSettings;
    // --- End Type Assertion ---

    // Pass only the progression numerals as the feature-specific config to the constructor
    return new ChordProgressionFeature(
      progressionNumerals, // Feature specific args
      validRootName,
      progressionNumerals,
      headerText,
      settings,
      guitarIntervalSettings, // Pass asserted specific type
      audioController,
      maxCanvasHeight
    );
  }

  /** Render method now just adds the header. Views are rendered by DisplayController. */
  render(container: HTMLElement): void {
    // Unchanged
    clearAllChildren(container);
    addHeader(container, this.headerText);
    // DisplayController renders the views (_views) added in the constructor
  }
}

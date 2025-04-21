import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
  ConfigurationSchemaArg,
} from "../../feature";
import { GuitarFeature } from "../guitar_base"; // Import base class
import { Chord, chord_library } from "../chords";
// Removed Fretboard import
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import { GuitarIntervalSettings } from "../guitar_interval_settings"; // Import interval settings type
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
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Chord Progression";
  static readonly displayName = "Chord Progression";
  static readonly description =
    "Displays chord diagrams for a Roman numeral progression (e.g., I-IV-V) in a specified key.";

  readonly typeName = ChordProgressionFeature.typeName;
  private readonly rootNoteName: string;
  private readonly progression: string[]; // Array of Roman numerals specific to this feature
  private readonly headerText: string;

  constructor(
    config: ReadonlyArray<string>,
    rootNoteName: string,
    progression: string[],
    headerText: string,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings,
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    super(
      config,
      settings,
      intervalSettings,
      audioController,
      maxCanvasHeight
    );
    this.rootNoteName = rootNoteName;
    this.progression = progression;
    this.headerText = headerText;

    // Create ChordDiagramViews (metronome view is handled by base constructor)
    const rootNoteIndex = getKeyIndex(this.rootNoteName);
    if (rootNoteIndex !== -1) {
        this.progression.forEach(numeral => {
            const chordDetails = getChordInKey(rootNoteIndex, numeral);
            const chordData = chordDetails.chordKey ? chord_library[chordDetails.chordKey] : null;
            if (chordData) {
                const title = `${chordDetails.chordName} (${numeral})`;
                // Add view to the mutable _views array from base class
                this._views.push(new ChordDiagramView(chordData, title, this.fretboardConfig));
            } else {
                 console.warn(`Chord data not found for ${chordDetails.chordName} (${numeral}) in key ${this.rootNoteName}`);
            }
        });
    } else {
        console.error(`Invalid root note provided to ChordProgressionFeature: ${this.rootNoteName}`);
    }
  }

  // --- Static Methods ---
  static getConfigurationSchema(): ConfigurationSchema {
    const availableKeys = MUSIC_NOTES.flat();
    const progressionButtonLabels = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

    // Define arguments specific to ChordProgressionFeature
    const specificArgs: ConfigurationSchemaArg[] = [
       {
        name: "RootNote", type: "enum", required: true, enum: availableKeys,
        description: "Root note (key) of the progression.",
      },
      {
        name: "Progression", type: "string", required: true,
        uiComponentType: "toggle_button_selector",
        uiComponentData: { buttonLabels: progressionButtonLabels, },
        isVariadic: true, example: "I-vi-IV-V",
        description: "Build the progression sequence using the Roman numeral buttons.",
      }
    ];

    // Combine specific args with the base Guitar Settings arg
    return {
      description: `Config: ${this.typeName},RootNote,ProgressionSequence...[,GuitarSettings]`,
      args: [...specificArgs, GuitarFeature.BASE_GUITAR_SETTINGS_CONFIG_ARG],
    };
  }

  static createFeature(
    config: ReadonlyArray<string>, // Raw config list from editor row
    audioController: AudioController,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings, // <<< CHANGED: Receive full object
    maxCanvasHeight?: number
  ): Feature {

     // --- Parse Config Args ---
     // We need to separate RootNote and Progression numerals from potential GuitarSettings args
     // This requires knowledge of the schema or a more robust parsing mechanism.
     // For now, assume RootNote is first, Progression numerals follow, and settings are last if present.
     if (config.length < 2) { // Need at least RootNote and one Numeral
       throw new Error(`Invalid config for ${this.typeName}. Expected [RootNote, Numeral1, ...], received: [${config.join(", ")}]`);
     }
     const rootNoteName = config[0];
     // Assume remaining args before the potential settings object are numerals
     // This is fragile if the schema order changes or optional args are added before the ellipsis.
     const progressionNumerals = config.slice(1); // Simplistic assumption for now

     const keyIndex = getKeyIndex(rootNoteName);
     if (keyIndex === -1) throw new Error(`Unknown key: "${rootNoteName}"`);
     const validRootName = MUSIC_NOTES[keyIndex]?.[0] ?? rootNoteName;

     if (progressionNumerals.length === 0) {
       throw new Error(`Progression cannot be empty.`);
     }

     const headerText = `${progressionNumerals.join("-")} Progression in ${validRootName}`;

    // Pass only the progression numerals as the feature-specific config to the constructor
    return new ChordProgressionFeature(
      progressionNumerals, 
      validRootName,
      progressionNumerals,
      headerText,
      settings,
      intervalSettings,
      audioController,
      maxCanvasHeight
    );
  }

  /** Render method now just adds the header. Views are rendered by DisplayController. */
  render(container: HTMLElement): void {
    clearAllChildren(container);
    addHeader(container, this.headerText);
    // DisplayController renders the views (_views) added in the constructor
  }
}

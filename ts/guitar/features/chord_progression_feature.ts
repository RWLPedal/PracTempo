// ts/guitar/features/chord_progression_feature.ts
import {
  Feature,
  // FeatureCategoryName removed
  ConfigurationSchema,
  ConfigurationSchemaArg,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Chord, chord_library, getChordLibraryForInstrument } from "../chords";
import { AppSettings, getCategorySettings } from "../../settings";
import { GuitarSettings, GUITAR_SETTINGS_KEY, DEFAULT_GUITAR_SETTINGS } from "../guitar_settings";
import { AudioController } from "../../audio_controller";
// Import generic and specific interval settings types
import { IntervalSettings } from "../../schedule/editor/interval/types";
import { GuitarIntervalSettings } from "../guitar_interval_settings";
import {
  MUSIC_NOTES,
  getKeyIndex,
  addHeader,
  clearAllChildren,
} from "../guitar_utils";
import { KeyType, getChordInKey } from "../progressions";
import { ChordDiagramView } from "../views/chord_diagram_view";
import { getEasiestMoveableGuitarShape } from "../moveable_shapes";

/** Displays chord diagrams for a Roman numeral progression in a given key. */
export class ChordProgressionFeature extends GuitarFeature {
  // Static properties (category removed, others unchanged)
  // static readonly category = FeatureCategoryName.Guitar; // Removed
  static readonly typeName = "Chord Progression";
  static readonly displayName = "Chord Progression";
  static readonly requiredInstruments = ["Guitar", "Mandolin", "Mandola"] as const;
  static readonly description =
    "Displays chord diagrams for a Roman numeral progression (e.g., I-IV-V) in a specified key.";

  readonly typeName = ChordProgressionFeature.typeName;
  private readonly rootNoteName: string;
  private readonly progression: string[]; // Array of Roman numerals specific to this feature
  private readonly headerText: string;
  private readonly keyType: KeyType;

  constructor(
    config: ReadonlyArray<string>, // Should contain only progression numerals now
    rootNoteName: string,
    progression: string[],
    headerText: string,
    keyType: KeyType,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings, // Constructor expects specific type
    audioController?: AudioController,
    maxCanvasHeight?: number,
    chordLibrary: Record<string, Chord> = chord_library
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
    this.keyType = keyType;

    // Create ChordDiagramViews (metronome view is handled by base constructor)
    const rootNoteIndex = getKeyIndex(this.rootNoteName);
    const guitarSettings = getCategorySettings<GuitarSettings>(settings, GUITAR_SETTINGS_KEY) ?? DEFAULT_GUITAR_SETTINGS;
    const isGuitar = guitarSettings.instrument === "Guitar";

    if (rootNoteIndex !== -1) {
      this.progression.forEach((numeral) => {
        const chordDetails = getChordInKey(rootNoteIndex, numeral, this.keyType, chordLibrary);
        const chordData = chordDetails.chordKey
          ? chordLibrary[chordDetails.chordKey]
          : null;
        if (chordData) {
          // For guitar, substitute the easiest moveable barre chord shape.
          if (isGuitar) {
            const easiest = getEasiestMoveableGuitarShape(chordData.name, this.fretboardConfig.tuning);
            if (easiest) {
              const title = `${chordDetails.chordName} [${easiest.shapeName}] (${numeral})`;
              this._views.push(new ChordDiagramView(easiest.chord, title, this.fretboardConfig));
              return;
            }
          }
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
    const availableKeys = MUSIC_NOTES.flat();

    const majorBasic    = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
    const majorAdvanced = ["Imaj7", "ii7", "iii7", "IVmaj7", "V7", "vi7", "viiø7"];
    const minorBasic    = ["i", "ii°", "III", "iv", "v", "VI", "VII"];
    const minorAdvanced = ["im7", "iiø7", "IIImaj7", "iv7", "v7", "VImaj7", "VII7"];

    const specificArgs: ConfigurationSchemaArg[] = [
      {
        name: "Root Note",
        type: "enum",
        required: true,
        enum: availableKeys,
        description: "Root note (key) of the progression.",
      },
      {
        name: "Key Type",
        type: "enum",
        required: true,
        enum: ["Major", "Minor"],
        description: "Major or natural minor key.",
        controlsArgName: "Prog",
      },
      {
        name: "Advanced",
        type: "boolean",
        uiComponentType: "checkbox",
        description: "Show 7th chord options.",
        controlsArgName: "Prog",
      },
      {
        name: "Prog",
        type: "string",
        required: true,
        uiComponentType: "toggle_button_selector",
        uiComponentData: {
          buttonLabels: majorBasic,
          advancedButtonLabels: majorAdvanced,
          minorButtonLabels: minorBasic,
          minorAdvancedButtonLabels: minorAdvanced,
        },
        isVariadic: true,
        description: "Build the progression sequence using Roman numeral buttons.",
      },
    ];
    return {
      description: `Config: ${this.typeName},Root,Key,ProgNumerals...[,GuitarSettings]`,
      args: [...specificArgs, GuitarFeature.BASE_GUITAR_SETTINGS_CONFIG_ARG],
    };
  }

  static createFeature(
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings,
    intervalSettings: IntervalSettings,
    maxCanvasHeight: number | undefined,
    _categoryName: string
  ): Feature {
    // Config layout: [Root, Key, Numeral1, Numeral2, ...]
    if (config.length < 3) {
      throw new Error(
        `[${this.typeName}] Invalid config. Expected [Root, Key, Numeral1, ...], received: [${config.join(", ")}]`
      );
    }
    const rootNoteName = config[0];
    const keyType = config[1] as KeyType;
    if (keyType !== "Major" && keyType !== "Minor") {
      throw new Error(`[${this.typeName}] Invalid key type: "${keyType}". Expected "Major" or "Minor".`);
    }
    const progressionNumerals = config.slice(2);

    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1)
      throw new Error(`[${this.typeName}] Unknown root note: "${rootNoteName}"`);
    const validRootName = MUSIC_NOTES[keyIndex]?.[0] ?? rootNoteName;

    if (progressionNumerals.length === 0) {
      throw new Error(`[${this.typeName}] Progression cannot be empty.`);
    }

    const headerText = `${progressionNumerals.join("-")} in ${validRootName} ${keyType}`;
    const guitarIntervalSettings = intervalSettings as GuitarIntervalSettings;
    const guitarSettings = getCategorySettings<GuitarSettings>(settings, GUITAR_SETTINGS_KEY) ?? DEFAULT_GUITAR_SETTINGS;
    const chordLibrary = getChordLibraryForInstrument(guitarSettings.instrument);

    return new ChordProgressionFeature(
      progressionNumerals,
      validRootName,
      progressionNumerals,
      headerText,
      keyType,
      settings,
      guitarIntervalSettings,
      audioController,
      maxCanvasHeight,
      chordLibrary
    );
  }

  /** Render method now just adds the header. Views are rendered by DisplayController. */
  render(container: HTMLElement): void {
    clearAllChildren(container);
    const header = addHeader(container, this.headerText);
    header.classList.add('feature-main-title');
    // DisplayController renders the views (_views) added in the constructor
  }
}

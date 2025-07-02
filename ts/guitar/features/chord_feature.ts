// ts/guitar/features/chord_feature.ts
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
import { ChordDiagramView } from "../views/chord_diagram_view";
import {
  addHeader,
  clearAllChildren,
  MUSIC_NOTES,
  getKeyIndex,
} from "../guitar_utils";
// Import generic and specific interval settings types
import { IntervalSettings } from "../../schedule/editor/interval/types";
import { GuitarIntervalSettings } from "../guitar_interval_settings";

/** A feature for displaying mulitple chord diagrams and a metronome. */
export class ChordFeature extends GuitarFeature {
  // Static properties (category removed, others unchanged)
  // static readonly category = FeatureCategoryName.Guitar; // Removed
  static readonly typeName = "Chord";
  static readonly displayName = "Chord Diagram";
  static readonly description = "Displays one or more chord diagrams.";
  readonly typeName = ChordFeature.typeName;

  constructor(
    config: ReadonlyArray<string>, // Chord keys specific to this feature
    chords: ReadonlyArray<Chord>,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings, // Constructor still expects specific type from base class
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    // Pass intervalSettings up to the base constructor
    super(
      config,
      settings,
      intervalSettings, // Pass specific type here
      audioController,
      maxCanvasHeight
    );

    // Create ChordDiagramViews (metronome view is handled by base constructor)
    chords.forEach((chord) => {
      // Use the chord's name property for the diagram title
      this._views.push(
        new ChordDiagramView(chord, chord.name, this.fretboardConfig)
      );
    });
  }

  // --- Static Methods ---
  static getConfigurationSchema(): ConfigurationSchema {
    const availableChordNames = Object.keys(chord_library);
    const specificArgs: ConfigurationSchemaArg[] = [
      {
        name: "Chord", // Changed from "ChordNames"
        type: "enum",
        required: true,
        enum: availableChordNames,
        description: "Select one or more chords.",
        isVariadic: true,
      },
    ];
    return {
      description: `Config: ${this.typeName},ChordName1[,ChordName2,...][,GuitarSettings]`,
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
    // Separate feature-specific args from potential nested settings args
    // This simplistic approach assumes chord names are all args before any potential settings object.
    // A more robust config parser might be needed eventually.
    const chordKeys = config;

    if (chordKeys.length < 1) {
      throw new Error(
        `Invalid config for ${this.typeName}. Expected at least one ChordName.`
      );
    }
    const chords: Chord[] = [];
    chordKeys.forEach((chordKey) => {
      const chord = chord_library[chordKey];
      if (chord) {
        chords.push(chord);
      } else {
        console.warn(
          `[${this.typeName}] Unknown chord key: "${chordKey}". Skipping.`
        );
      }
    });
    if (chords.length === 0) {
      throw new Error(
        `[${this.typeName}] No valid chords found in config: ${config.join(
          ","
        )}`
      );
    }

    // --- Type Assertion for Constructor ---
    // We assert that the intervalSettings object passed in is actually
    // GuitarIntervalSettings because the ScheduleBuilder should have used the
    // correct parser registered by the GuitarCategory.
    const guitarIntervalSettings = intervalSettings as GuitarIntervalSettings;
    // --- End Type Assertion ---

    return new ChordFeature(
      chordKeys, // Pass only the chord keys as the specific config
      chords,
      settings,
      guitarIntervalSettings, // Pass the asserted specific type
      audioController,
      maxCanvasHeight
    );
  }

  /** Render method now just adds the header. Views are rendered by DisplayController. */
  render(container: HTMLElement): void {
    clearAllChildren(container);
    const chordViews = this._views.filter(
      (v) => v instanceof ChordDiagramView
    ) as ChordDiagramView[];
    const uniqueChordNames = [
      ...new Set(chordViews.map((v) => (v as any).chord.name)), // Use cast if needed
    ];
    let headerText = "Chord Diagram";
    if (uniqueChordNames.length === 1) {
      headerText = `${uniqueChordNames[0]} Chord`;
    } else if (uniqueChordNames.length > 1) {
      headerText = uniqueChordNames.slice(0, 3).join(" / ") + " Chords";
    }
    addHeader(container, headerText);
  }
}

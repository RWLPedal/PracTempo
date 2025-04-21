import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
  ConfigurationSchemaArg, // Import if needed for merging
} from "../../feature";
import { GuitarFeature } from "../guitar_base"; // Import base class
import { Chord, chord_library } from "../chords";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import { ChordDiagramView } from "../views/chord_diagram_view";
import { addHeader, clearAllChildren, MUSIC_NOTES } from "../guitar_utils";
import { GuitarIntervalSettings } from "../guitar_interval_settings";

/** A feature for displaying mulitple chord diagrams and a metronome. */
export class ChordFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Chord";
  static readonly displayName = "Chord Diagram";
  static readonly description = "Displays one or more chord diagrams.";
  readonly typeName = ChordFeature.typeName;

  constructor(
    config: ReadonlyArray<string>, // Chord keys specific to this feature
    chords: ReadonlyArray<Chord>,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings, // <<< CHANGED: Accept full object
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    // Pass intervalSettings up to the base constructor
    super(
      config,
      settings,
      intervalSettings,
      audioController,
      maxCanvasHeight
    );

    // Create ChordDiagramViews (metronome view is handled by base constructor)
    chords.forEach((chord) => {
      this._views.push(
        new ChordDiagramView(chord, chord.name, this.fretboardConfig)
      );
    });
  }

  // --- Static Methods ---
  static getConfigurationSchema(): ConfigurationSchema {
    const availableChordNames = Object.keys(chord_library);
    // Define arguments specific to ChordFeature
    const specificArgs: ConfigurationSchemaArg[] = [
      {
        name: "ChordNames",
        type: "enum",
        required: true,
        enum: availableChordNames,
        description: "One or more chord names.",
        isVariadic: true,
      },
    ];
    // Combine specific args with the base Guitar Settings arg
    return {
      description: `Config: ${this.typeName},ChordName1[,ChordName2,...][,GuitarSettings]`,
      args: [...specificArgs, GuitarFeature.BASE_GUITAR_SETTINGS_CONFIG_ARG],
    };
  }

  static createFeature(
    config: ReadonlyArray<string>, // Raw config list from editor row
    audioController: AudioController,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings,
    maxCanvasHeight?: number
  ): Feature {
    // Separate feature-specific args from potential nested settings args
    // NOTE: This assumes the ellipsis arg is always last. A more robust parser
    // might be needed if the order could change. For now, assume all non-object
    // args before the potential settings object are chord keys.
    const chordKeys = config; // Assume config only contains chord keys for now
    // A more robust implementation would parse config based on the schema

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
        console.warn(`Unknown chord key: "${chordKey}". Skipping.`);
      }
    });
    if (chords.length === 0) {
      throw new Error(`No valid chords found in config: ${config.join(",")}`);
    }

    return new ChordFeature(
      chordKeys, // Pass only the chord keys as the specific config
      chords,
      settings,
      intervalSettings,
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
      ...new Set(chordViews.map((v) => (v as any).chord.name)),
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

/* ts/guitar/features/chord_feature.ts */

import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
} from "../../feature";
// Import the NEW base class
import {
  BaseChordDiagramFeature,
  ChordAndTitle,
} from "./base_chord_diagram_feature";
import { Chord, chord_library } from "../chords";
// Removed Fretboard import as it's handled by base
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
// Removed utils imports handled by base
import { MUSIC_NOTES } from "../guitar_utils";

/** A feature for displaying mulitple chord diagrams and a metronome. */
// Extend the new base class
export class ChordFeature extends BaseChordDiagramFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Chord";
  static readonly displayName = "Chord Diagram";
  static readonly description = "Displays one or more chord diagrams.";
  readonly typeName = ChordFeature.typeName;
  private readonly chords: ReadonlyArray<Chord>;
  // Removed headerText property, it's generated in base class

  constructor(
    config: ReadonlyArray<string>,
    chords: ReadonlyArray<Chord>,
    // Removed headerText parameter
    settings: AppSettings,
    metronomeBpmOverride?: number,
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    // Pass relevant parameters up to base class constructor
    super(
      config,
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
    this.chords = chords;
    // Don't store headerText here anymore
  }

  // Static methods remain the same
  static getConfigurationSchema(): ConfigurationSchema {
    const availableChordNames = Object.keys(chord_library);
    return {
      description: `Config: ${this.typeName},ChordName1[,ChordName2,...][,GuitarSettings]`,
      args: [
        {
          name: "ChordNames",
          type: "enum", // Data type is enum
          required: true,
          enum: availableChordNames,
          description: "One or more chord names.",
          isVariadic: true, // Allows multiple inputs
          // Default UI (text input for each) will be used unless uiComponentType specified
        },
        {
          name: "Guitar Settings",
          type: "ellipsis",
          uiComponentType: "ellipsis",
          description: "Configure interval-specific guitar settings.",
          nestedSchema: [
            {
              name: "metronomeBpm",
              type: "number",
              description: "Metronome BPM (0=off)",
            },
          ],
        },
      ],
    };
  }

  static createFeature(
    config: ReadonlyArray<string>, // Expects [ChordKey1, ChordKey2, ...]
    audioController: AudioController,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    maxCanvasHeight?: number
  ): Feature {
    if (config.length < 1) {
      throw new Error(
        `Invalid config for ${
          this.typeName
        }. Expected at least one ChordName, received: [${config.join(", ")}]`
      );
    }

    const chordKeys = config;
    const chords: Chord[] = [];
    const validChordNames: string[] = []; // Keep track for potential header generation if needed

    chordKeys.forEach((chordKey) => {
      const chord = chord_library[chordKey];
      if (chord) {
        chords.push(chord);
        validChordNames.push(chord.name);
      } else {
        console.warn(`Unknown chord key: "${chordKey}". Skipping.`);
      }
    });

    if (chords.length === 0) {
      throw new Error(`No valid chords found in config: ${config.join(",")}`);
    }

    // Header text generation is moved to base class, so no need here
    // Pass maxCanvasHeight to constructor
    return new ChordFeature(
      config,
      chords,
      // No headerText needed here
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
  }

  /** Implement the abstract method from the base class. */
  protected getChordsAndTitles(): ChordAndTitle[] {
    return this.chords.map((chord) => ({
      chord: chord,
      title: chord.name, // Simple title for ChordFeature
    }));
  }
}

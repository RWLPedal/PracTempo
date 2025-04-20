/* ts/guitar/features/chord_progression_feature.ts */

import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
  ConfigurationSchemaArg,
} from "../../feature";
// Import the NEW base class
import {
  BaseChordDiagramFeature,
  ChordAndTitle,
} from "./base_chord_diagram_feature";
import { Chord, chord_library } from "../chords";
// Removed Fretboard import
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
// Removed utils imports handled by base
import { MUSIC_NOTES, getKeyIndex } from "../guitar_utils";
import { getChordInKey } from "../progressions";
// Removed MetronomeView import (handled by base)

/** Displays chord diagrams for a Roman numeral progression in a given key. */
// Extend the new base class
export class ChordProgressionFeature extends BaseChordDiagramFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Chord Progression";
  static readonly displayName = "Chord Progression";
  static readonly description =
    "Displays chord diagrams for a Roman numeral progression (e.g., I-IV-V) in a specified key.";

  readonly typeName = ChordProgressionFeature.typeName;
  private readonly rootNoteName: string;
  private readonly progression: string[]; // Array of Roman numerals
  // Removed headerText property

  constructor(
    config: ReadonlyArray<string>, // Config now contains [RootNote, Numeral1, Numeral2,...]
    rootNoteName: string,
    progression: string[],
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
    this.rootNoteName = rootNoteName;
    this.progression = progression;
  }

  // Static methods remain the same
  static getConfigurationSchema(): ConfigurationSchema {
    const availableKeys = MUSIC_NOTES.flat();
    // Define the button labels for the custom UI component
    const progressionButtonLabels = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

    const schemaArgs: ConfigurationSchemaArg[] = [
      {
        name: "RootNote",
        type: "enum", // Data type
        required: true,
        enum: availableKeys,
        description: "Root note (key) of the progression.",
        // Default UI component (select dropdown) will be used based on 'enum' type
      },
      {
        name: "Progression",
        type: "string", // Underlying data is string (parsed/generated as hyphenated)
        required: true,
        // Specify the custom UI component and provide necessary data
        uiComponentType: "toggle_button_selector",
        uiComponentData: {
          buttonLabels: progressionButtonLabels,
        },
        isVariadic: true,
        example: "I-vi-IV-V",
        description:
          "Build the progression sequence using the Roman numeral buttons.",
      },
      {
        name: "Guitar Settings",
        type: "ellipsis",
        uiComponentType: "ellipsis", // Explicitly state UI type
        description: "Configure interval-specific guitar settings.",
        nestedSchema: [
          {
            name: "metronomeBpm",
            type: "number",
            description: "Metronome BPM (0=off)",
          },
        ],
      },
    ];

    return {
      description: `Config: ${this.typeName},RootNote,ProgressionSequence...[,GuitarSettings]`,
      args: schemaArgs,
    };
  }

  static createFeature(
    config: ReadonlyArray<string>, // Expects [RootNote, Numeral1, Numeral2, ...]
    audioController: AudioController,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    maxCanvasHeight?: number
  ): Feature {
    if (config.length < 2) {
      throw new Error(
        `Invalid config for ${
          this.typeName
        }. Expected [RootNote, Numeral1, ...], received: [${config.join(", ")}]`
      );
    }

    const rootNoteName = config[0];
    const progressionNumerals = config.slice(1);

    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1) throw new Error(`Unknown key: "${rootNoteName}"`);
    const validRootName = MUSIC_NOTES[keyIndex]?.[0] ?? rootNoteName;

    if (progressionNumerals.length === 0) {
      throw new Error(`Progression cannot be empty.`);
    }

    // Header text generation moved to base class
    return new ChordProgressionFeature(
      config,
      validRootName,
      progressionNumerals,
      // No headerText needed here
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
  }

  /** Implement the abstract method to provide chords and titles for the progression. */
  protected getChordsAndTitles(): ChordAndTitle[] {
    const rootNoteIndex = getKeyIndex(this.rootNoteName);
    if (rootNoteIndex === -1) {
      console.error(
        `Invalid root note in getChordsAndTitles: ${this.rootNoteName}`
      );
      return []; // Return empty if root note is invalid
    }

    return this.progression
      .map((numeral) => {
        const chordDetails = getChordInKey(rootNoteIndex, numeral);
        const chordData = chordDetails.chordKey
          ? chord_library[chordDetails.chordKey]
          : null;
        if (chordData) {
          return {
            chord: chordData,
            title: `${chordDetails.chordName} (${numeral})`, // Specific title format
          };
        } else {
          console.warn(
            `Chord data not found for ${chordDetails.chordName} (numeral ${numeral}) in key ${this.rootNoteName}`
          );
          return null; // Return null if chord data not found
        }
      })
      .filter((item): item is ChordAndTitle => item !== null); // Filter out nulls and type guard
  }

  // Override getHeaderText for a more specific title for progressions
  protected getHeaderText(chordsAndTitles: ChordAndTitle[]): string {
    // We can reconstruct the numeral string from the titles if needed,
    // or use the stored progression array.
    const numeralString = this.progression.join("-");
    return `${numeralString} Progression in ${this.rootNoteName}`;
  }

  // render, drawSingleChordDiagram, and getChordRootNote are removed - inherited from base.
}

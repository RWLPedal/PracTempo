/* ts/guitar/features/chord_progression_feature.ts */

import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
  ConfigurationSchemaArg,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Chord, chord_library } from "../chords";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import { MUSIC_NOTES, addHeader, clearAllChildren, getKeyIndex } from "../guitar_utils";
import { getChordInKey } from "../progressions";
// Import the new View
import { ChordDiagramView } from "../views/chord_diagram_view";
import { MetronomeView } from "../views/metronome_view";
import { View } from "../../view";

/** Displays chord diagrams for a Roman numeral progression in a given key. */
export class ChordProgressionFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Chord Progression";
  static readonly displayName = "Chord Progression";
  static readonly description =
    "Displays chord diagrams for a Roman numeral progression (e.g., I-IV-V) in a specified key.";

  readonly typeName = ChordProgressionFeature.typeName;
  private readonly rootNoteName: string;
  private readonly progression: string[];
  private readonly headerText: string; // Keep header text for the main title

  constructor(
    config: ReadonlyArray<string>,
    rootNoteName: string,
    progression: string[],
    headerText: string,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    super(
      config,
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
    this.rootNoteName = rootNoteName;
    this.progression = progression;
    this.headerText = headerText; // Store the generated header

    // Create Views
    const views: View[] = [];
    const rootNoteIndex = getKeyIndex(this.rootNoteName);

    if (rootNoteIndex !== -1) {
      this.progression.forEach((numeral) => {
        const chordDetails = getChordInKey(rootNoteIndex, numeral);
        const chordData = chordDetails.chordKey
          ? chord_library[chordDetails.chordKey]
          : null;
        if (chordData) {
          const title = `${chordDetails.chordName} (${numeral})`;
          views.push(
            new ChordDiagramView(chordData, title, this.fretboardConfig)
          );
        } else {
          console.warn(
            `Chord data not found for ${chordDetails.chordName} (${numeral}) in key ${this.rootNoteName}`
          );
        }
      });
    } else {
      console.error(
        `Invalid root note provided to ChordProgressionFeature: ${this.rootNoteName}`
      );
    }

    // Add metronome view if needed
    if (this.metronomeBpm > 0 && this.audioController) {
      const metronomeAudioEl = document.getElementById(
        "metronome-sound"
      ) as HTMLAudioElement;
      if (metronomeAudioEl) {
        views.push(
          new MetronomeView(
            this.metronomeBpm,
            this.audioController,
            metronomeAudioEl
          )
        );
      } else {
        console.error(
          "Metronome audio element not found for ChordProgressionFeature."
        );
      }
    } else if (this.metronomeBpm > 0 && !this.audioController) {
      console.warn(
        "Metronome requested for ChordProgressionFeature, but AudioController missing."
      );
    }

    (this as { views: ReadonlyArray<View> }).views = views; // Assign views
  }

  // Static methods remain the same
  static getConfigurationSchema(): ConfigurationSchema {
    const availableKeys = MUSIC_NOTES.flat();
    const progressionButtonLabels = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

    const schemaArgs: ConfigurationSchemaArg[] = [
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
        required: true,
        uiComponentType: "toggle_button_selector",
        uiComponentData: { buttonLabels: progressionButtonLabels },
        isVariadic: true,
        example: "I-vi-IV-V",
        description:
          "Build the progression sequence using the Roman numeral buttons.",
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
    ];
    return {
      description: `Config: ${this.typeName},RootNote,ProgressionSequence...[,GuitarSettings]`,
      args: schemaArgs,
    };
  }

  static createFeature(
    config: ReadonlyArray<string>,
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
    const headerText = `${progressionNumerals.join(
      "-"
    )} Progression in ${validRootName}`;

    return new ChordProgressionFeature(
      config,
      validRootName,
      progressionNumerals,
      headerText,
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
  }

  /** Render method now just adds the header. Views are rendered by DisplayController. */
  render(container: HTMLElement): void {
    clearAllChildren(container);
    addHeader(container, this.headerText); // Use the header generated during creation
    // Optionally add the layout container div here
    // const viewContainer = document.createElement('div');
    // viewContainer.className = 'diagram-views-container';
    // container.appendChild(viewContainer);
  }
}

import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Chord, chord_library } from "../chords";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
// Import the new View
import { ChordDiagramView } from "../views/chord_diagram_view";
import { addHeader, clearAllChildren, MUSIC_NOTES } from "../guitar_utils";
import { View } from "../../view"; // Import base View type
import { MetronomeView } from "../views/metronome_view";


/** A feature for displaying mulitple chord diagrams and a metronome. */
export class ChordFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Chord";
  static readonly displayName = "Chord Diagram";
  static readonly description = "Displays one or more chord diagrams.";
  readonly typeName = ChordFeature.typeName;
  // No longer need to store chords directly here, they are in the views

  constructor(
    config: ReadonlyArray<string>,
    chords: ReadonlyArray<Chord>, // Still receive chords to create views
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

    // Create Views based on chords and metronome setting
    const views: View[] = [];
    chords.forEach(chord => {
        views.push(new ChordDiagramView(chord, chord.name, this.fretboardConfig));
    });

    // Add metronome view if BPM is set (logic moved from base constructor)
    if (this.metronomeBpm > 0 && this.audioController) {
       const metronomeAudioEl = document.getElementById("metronome-sound") as HTMLAudioElement;
       if (metronomeAudioEl) {
           views.push(new MetronomeView(this.metronomeBpm, this.audioController));
       } else {
            console.error("Metronome audio element not found for ChordFeature.");
       }
    } else if (this.metronomeBpm > 0 && !this.audioController) {
        console.warn("Metronome requested for ChordFeature, but AudioController missing.");
    }

    // Assign the created views to the inherited views property
    (this as { views: ReadonlyArray<View> }).views = views; // Use type assertion to assign
  }

  // Static methods remain mostly the same
  static getConfigurationSchema(): ConfigurationSchema {
    const availableChordNames = Object.keys(chord_library);
    return {
      description: `Config: ${this.typeName},ChordName1[,ChordName2,...][,GuitarSettings]`,
      args: [
        {
          name: "ChordNames",
          type: "enum",
          required: true,
          enum: availableChordNames,
          description: "One or more chord names.",
          isVariadic: true,
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
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    maxCanvasHeight?: number
  ): Feature {
    if (config.length < 1) {
      throw new Error(
        `Invalid config for ${this.typeName}. Expected at least one ChordName.`
      );
    }
    const chordKeys = config;
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
      config,
      chords,
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
  }

  /** Render method now just adds the header. Views are rendered by DisplayController. */
  render(container: HTMLElement): void {
    clearAllChildren(container);
    // Generate header based on the views created
    const chordViews = this.views.filter(v => v instanceof ChordDiagramView) as ChordDiagramView[];
    const uniqueChordNames = [...new Set(chordViews.map(v => (v as any).chord.name))]; // Access chord name via view
    let headerText = "Chord Diagram"; // Default
     if (uniqueChordNames.length === 1) {
        headerText = `${uniqueChordNames[0]} Chord`;
     } else if (uniqueChordNames.length > 1) {
        headerText = uniqueChordNames.slice(0, 3).join(' / ') + " Chords";
     }
    addHeader(container, headerText);
    // Optionally add the layout container div here if needed for CSS styling
    // const viewContainer = document.createElement('div');
    // viewContainer.className = 'diagram-views-container'; // Add class for styling
    // container.appendChild(viewContainer);
    // DisplayController will iterate views and pass the main container to each view's render
  }
}
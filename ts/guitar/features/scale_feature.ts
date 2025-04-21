/* ts/guitar/features/scale_feature.ts */

import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
// Removed Fretboard import
import { Scale, scale_names, scales } from "../scales";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import {
  getKeyIndex,
  getChordTones, // Keep for parsing config if highlighting is re-added later
  MUSIC_NOTES,
  getIntervalLabel,
  OPEN_NOTE_RADIUS_FACTOR,
  clearAllChildren,
  addHeader, // Added for open notes
} from "../guitar_utils";
// Import the FretboardView and its data interface
import { FretboardView, NoteRenderData } from "../views/fretboard_view";
import { MetronomeView } from "../views/metronome_view";
import { View } from "../../view";
import { FretboardColorScheme } from "../colors";

/** Displays scale diagrams on the fretboard using FretboardView. */
export class ScaleFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Scale";
  static readonly displayName = "Scale Diagram";
  static readonly description =
    "Displays a specified scale on the fretboard in a given key, using interval coloring.";

  readonly typeName = ScaleFeature.typeName;
  private readonly scale: Scale;
  private readonly keyIndex: number;
  // Store chord tones if highlighting logic is added later
  // private readonly chordTones: Array<Array<string>>;
  private readonly headerText: string;
  private fretboardViewInstance: FretboardView; // Hold the instance

  constructor(
    config: ReadonlyArray<string>,
    scale: Scale,
    keyIndex: number,
    // chordTones: Array<Array<string>>, // Temporarily removed for simplification
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
    this.scale = scale;
    this.keyIndex = keyIndex;
    // this.chordTones = chordTones; // Store if needed later
    this.headerText = headerText;

    const fretCount = 18; // Standard fret count for scales

    // Create Views
    const views: View[] = [];

    // 1. Create FretboardView
    // Note: FretboardView uses the colorScheme from fretboardConfig by default.
    // We will force 'interval' coloring when setting the notes.
    this.fretboardViewInstance = new FretboardView(
      this.fretboardConfig,
      fretCount
    );
    views.push(this.fretboardViewInstance);

    // 2. Create MetronomeView (if applicable)
    if (this.metronomeBpm > 0 && this.audioController) {
      const metronomeAudioEl = document.getElementById(
        "metronome-sound"
      ) as HTMLAudioElement;
      if (metronomeAudioEl) {
        views.push(
          new MetronomeView(
            this.metronomeBpm,
            this.audioController
          )
        );
      } else {
        console.error("Metronome audio element not found for ScaleFeature.");
      }
    } else if (this.metronomeBpm > 0 && !this.audioController) {
      console.warn(
        "Metronome requested for ScaleFeature, but AudioController missing."
      );
    }

    // Assign views
    (this as { views: ReadonlyArray<View> }).views = views;

    // Calculate and set the scale notes *after* creating the view instance
    this.calculateAndSetScaleNotes(fretCount);
  }

  // Static methods
  static getConfigurationSchema(): ConfigurationSchema {
    const availableScaleNames = [
      ...new Set([...Object.keys(scales), ...Object.keys(scale_names)]),
    ];
    const availableKeys = MUSIC_NOTES.flat();
    return {
      description: `Config: ${this.typeName},ScaleName,Key[,GuitarSettings]`, // Simplified description for now
      args: [
        {
          name: "ScaleName",
          type: "enum",
          required: true,
          enum: availableScaleNames,
          description: "Name of the scale.",
        },
        {
          name: "Key",
          type: "enum",
          required: true,
          enum: availableKeys,
          description: "Root note of the scale.",
        },
        // { // ChordTones highlighting removed for now
        //   name: "ChordTones", type: "string", required: false, example: "C-E-G|G-B-D",
        //   description: "Optional. Chord tones to highlight.",
        // },
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
    if (config.length < 2) {
      throw new Error(
        `Invalid config for ${this.typeName}. Expected at least [ScaleName, Key].`
      );
    }
    const scaleNameOrAlias = config[0];
    const rootNoteName = config[1];
    // const chordTonesStr = config.length > 2 ? config[2] : undefined; // ChordTones parsing removed for now

    const scaleKey = scale_names[scaleNameOrAlias] ?? scaleNameOrAlias;
    const scale = scales[scaleKey];
    if (!scale) throw new Error(`Unknown scale: "${scaleNameOrAlias}"`);

    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1) throw new Error(`Unknown key: "${rootNoteName}"`);

    // const chordTones = getChordTones(chordTonesStr); // Removed for now
    const keyName = MUSIC_NOTES[keyIndex]?.[0] ?? `Note ${keyIndex}`;
    const headerText = `${scale.name} Scale, Key of ${keyName}`;

    // Pass config args relevant to the feature itself (ScaleName, Key)
    const featureConfig = [scaleNameOrAlias, rootNoteName]; // Pass only relevant args

    return new ScaleFeature(
      featureConfig, // Pass only scale/key config
      scale,
      keyIndex,
      // chordTones, // Removed for now
      headerText,
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
  }

  /** Calculates scale notes and passes them to the FretboardView. */
  private calculateAndSetScaleNotes(fretCount: number): void {
    const notesData: NoteRenderData[] = [];
    const config = this.fretboardConfig; // Use instance config

    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      if (stringIndex >= config.tuning.tuning.length) continue;

      for (let fretIndex = 0; fretIndex <= fretCount; fretIndex++) {
        const noteOffsetFromA =
          (config.tuning.tuning[stringIndex] + fretIndex) % 12;
        const noteRelativeToKey = (noteOffsetFromA - this.keyIndex + 12) % 12;

        // Check if the note is part of the scale
        if (this.scale.degrees.includes(noteRelativeToKey)) {
          const noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
          const intervalLabel = getIntervalLabel(noteRelativeToKey);
          // Display note name inside the dot for scales
          const displayLabel = noteName;

          // TODO: Add logic here to check against this.chordTones
          // and modify NoteRenderData (e.g., add drawStar=true) if desired.

          notesData.push({
            fret: fretIndex,
            stringIndex: stringIndex,
            noteName: noteName,
            intervalLabel: intervalLabel,
            displayLabel: displayLabel,
            // Force interval coloring for scales, overriding global setting
            colorSchemeOverride: "interval",
            radiusOverride:
              fretIndex === 0
                ? config.noteRadiusPx * OPEN_NOTE_RADIUS_FACTOR
                : undefined,
          });
        }
      }
    }
    this.fretboardViewInstance.setNotes(notesData);
  }

  /** Render method now just adds the header. Views are rendered by DisplayController. */
  render(container: HTMLElement): void {
    clearAllChildren(container);
    addHeader(container, this.headerText);
    // DisplayController will render the FretboardView (and MetronomeView if present)
  }
}

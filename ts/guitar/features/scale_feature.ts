/* ts/guitar/features/scale_feature.ts */

import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
  ConfigurationSchemaArg, // Import if needed
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Scale, scale_names, scales } from "../scales";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import { GuitarIntervalSettings } from "../guitar_interval_settings"; // Import interval settings type
import {
  getKeyIndex,
  MUSIC_NOTES,
  getIntervalLabel,
  OPEN_NOTE_RADIUS_FACTOR,
  addHeader,
  clearAllChildren,
} from "../guitar_utils";
import { FretboardView, NoteRenderData } from "../views/fretboard_view";

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
  private readonly headerText: string;
  private fretboardViewInstance: FretboardView; // Hold the instance

  constructor(
    config: ReadonlyArray<string>, // Specific args: [ScaleName, Key]
    scale: Scale,
    keyIndex: number,
    headerText: string,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings, // <<< Use interval settings
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    super(config, settings, intervalSettings, audioController, maxCanvasHeight);
    this.scale = scale;
    this.keyIndex = keyIndex;
    this.headerText = headerText;

    const fretCount = 18; // Standard fret count for scales

    // Create Views
    // Base constructor handles MetronomeView based on intervalSettings

    // 1. Create FretboardView
    // Use the fretboardConfig created in the base class constructor
    this.fretboardViewInstance = new FretboardView(
      this.fretboardConfig,
      fretCount
    );
    this._views.push(this.fretboardViewInstance); // Add to views managed by base class

    // Calculate and set the scale notes *after* creating the view instance
    this.calculateAndSetScaleNotes(fretCount);
  }

  // --- Static Methods ---
  static getConfigurationSchema(): ConfigurationSchema {
    const availableScaleNames = [
      ...new Set([...Object.keys(scales), ...Object.keys(scale_names)]),
    ];
    const availableKeys = MUSIC_NOTES.flat();
    // Define arguments specific to ScaleFeature
    const specificArgs: ConfigurationSchemaArg[] = [
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
    ];
    return {
      description: `Config: ${this.typeName},ScaleName,Key[,GuitarSettings]`,
      args: [...specificArgs, GuitarFeature.BASE_GUITAR_SETTINGS_CONFIG_ARG], // Merge with base
    };
  }

  static createFeature(
    config: ReadonlyArray<string>, // Raw config list [ScaleName, Key, ...]
    audioController: AudioController,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings,
    maxCanvasHeight?: number
  ): Feature {
    // Parse feature-specific args
    if (config.length < 2) {
      throw new Error(
        `Invalid config for ${this.typeName}. Expected at least [ScaleName, Key].`
      );
    }
    const scaleNameOrAlias = config[0];
    const rootNoteName = config[1];
    const featureSpecificConfig = [scaleNameOrAlias, rootNoteName];

    const scaleKey = scale_names[scaleNameOrAlias] ?? scaleNameOrAlias;
    const scale = scales[scaleKey];
    if (!scale) throw new Error(`Unknown scale: "${scaleNameOrAlias}"`);

    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1) throw new Error(`Unknown key: "${rootNoteName}"`);

    const keyName = MUSIC_NOTES[keyIndex]?.[0] ?? `Note ${keyIndex}`;
    const headerText = `${scale.name} Scale, Key of ${keyName}`;

    return new ScaleFeature(
      featureSpecificConfig,
      scale,
      keyIndex,
      headerText,
      settings,
      intervalSettings,
      audioController,
      maxCanvasHeight
    );
  }

  /** Calculates scale notes and passes them to the FretboardView. */
  private calculateAndSetScaleNotes(fretCount: number): void {
    const notesData: NoteRenderData[] = [];
    const config = this.fretboardConfig;

    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      if (stringIndex >= config.tuning.tuning.length) continue;

      for (let fretIndex = 0; fretIndex <= fretCount; fretIndex++) {
        const noteOffsetFromA =
          (config.tuning.tuning[stringIndex] + fretIndex) % 12;
        const noteRelativeToKey = (noteOffsetFromA - this.keyIndex + 12) % 12;

        if (this.scale.degrees.includes(noteRelativeToKey)) {
          const noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
          const intervalLabel = getIntervalLabel(noteRelativeToKey);
          const displayLabel = noteName; // Display note name for scales

          notesData.push({
            fret: fretIndex,
            stringIndex: stringIndex,
            noteName: noteName,
            intervalLabel: intervalLabel,
            displayLabel: displayLabel,
            colorSchemeOverride: "interval", // Force interval coloring
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

  /** Render method adds header; DisplayController renders the views. */
  render(container: HTMLElement): void {
    clearAllChildren(container);
    addHeader(container, this.headerText);
    // DisplayController renders FretboardView & MetronomeView from this.views
  }
}

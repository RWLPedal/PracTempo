// ts/guitar/features/scale_feature.ts
import {
  Feature,
  // FeatureCategoryName removed
  ConfigurationSchema,
  ConfigurationSchemaArg,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Scale, scale_names, scales } from "../scales";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
// Import generic and specific interval settings types
import { IntervalSettings } from "../../schedule/editor/interval/types";
import { GuitarIntervalSettings } from "../guitar_interval_settings";
import { NoteIcon, NoteRenderData } from "../fretboard";
import {
  getKeyIndex,
  MUSIC_NOTES,
  getIntervalLabel,
  OPEN_NOTE_RADIUS_FACTOR,
  addHeader,
  clearAllChildren,
} from "../guitar_utils";
import { FretboardView } from "../views/fretboard_view";

/** Displays scale diagrams on the fretboard using FretboardView. */
export class ScaleFeature extends GuitarFeature {
  // Static properties (category removed, others unchanged)
  // static readonly category = FeatureCategoryName.Guitar; // Removed
  static readonly typeName = "Scale";
  static readonly displayName = "Scale Diagram";
  static readonly description =
    "Displays a specified scale on the fretboard in a given key, using interval coloring.";

  readonly typeName = ScaleFeature.typeName;
  private readonly scale: Scale;
  private readonly keyIndex: number;
  private readonly headerText: string;
  private fretboardViewInstance: FretboardView;

  constructor(
    config: ReadonlyArray<string>, // Specific args: [ScaleName, Key]
    scale: Scale,
    keyIndex: number,
    headerText: string,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings, // Constructor expects specific type
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    super(config, settings, intervalSettings, audioController, maxCanvasHeight); // Pass specific type
    this.scale = scale;
    this.keyIndex = keyIndex;
    this.headerText = headerText;
    const fretCount = 18;

    this.fretboardViewInstance = new FretboardView(
      this.fretboardConfig,
      fretCount
    );
    this._views.push(this.fretboardViewInstance);

    this.calculateAndSetScaleNotes(fretCount);
  }

  // --- Static Methods ---
  static getConfigurationSchema(): ConfigurationSchema {
    // Unchanged
    const availableScaleNames = [
      ...new Set([...Object.keys(scales), ...Object.keys(scale_names)]),
    ];
    const availableKeys = MUSIC_NOTES.flat();
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
    if (config.length < 2) {
      throw new Error(
        `[${this.typeName}] Invalid config. Expected [ScaleName, Key].`
      );
    }
    const scaleNameOrAlias = config[0];
    const rootNoteName = config[1];
    const featureSpecificConfig = [scaleNameOrAlias, rootNoteName]; // Keep only feature-specific args

    const scaleKey = scale_names[scaleNameOrAlias] ?? scaleNameOrAlias;
    const scale = scales[scaleKey];
    if (!scale)
      throw new Error(
        `[${this.typeName}] Unknown scale: "${scaleNameOrAlias}"`
      );

    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1)
      throw new Error(`[${this.typeName}] Unknown key: "${rootNoteName}"`);
    const keyName = MUSIC_NOTES[keyIndex]?.[0] ?? `Note ${keyIndex}`;
    const headerText = `${scale.name} Scale, Key of ${keyName}`;

    // --- Type Assertion for Constructor ---
    const guitarIntervalSettings = intervalSettings as GuitarIntervalSettings;
    // --- End Type Assertion ---

    return new ScaleFeature(
      featureSpecificConfig,
      scale,
      keyIndex,
      headerText,
      settings,
      guitarIntervalSettings, // Pass asserted specific type
      audioController,
      maxCanvasHeight
    );
  }

  /** Calculates scale notes and passes them to the FretboardView. */
  private calculateAndSetScaleNotes(fretCount: number): void {
    // Unchanged
    // ... (Implementation from previous response) ...
    const notesData: NoteRenderData[] = [];
    const config = this.fretboardConfig;
    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      if (stringIndex >= config.tuning.tuning.length) continue;
      const stringTuning = config.tuning.tuning[stringIndex];
      for (let fretIndex = 0; fretIndex <= fretCount; fretIndex++) {
        const noteOffsetFromA = (stringTuning + fretIndex) % 12;
        const noteRelativeToKey = (noteOffsetFromA - this.keyIndex + 12) % 12;
        if (this.scale.degrees.includes(noteRelativeToKey)) {
          const noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
          const intervalLabel = getIntervalLabel(noteRelativeToKey);
          notesData.push({
            fret: fretIndex,
            stringIndex: stringIndex,
            noteName: noteName,
            intervalLabel: intervalLabel,
            displayLabel: noteName,
            colorSchemeOverride: "interval",
            radiusOverride:
              fretIndex === 0
                ? config.noteRadiusPx * OPEN_NOTE_RADIUS_FACTOR
                : undefined,
          });
        }
      }
    }
    requestAnimationFrame(() => {
      if (this.fretboardViewInstance) {
        this.fretboardViewInstance.setNotes(notesData);
        this.fretboardViewInstance.setLines([]);
      }
    });
  }

  render(container: HTMLElement): void {
    // Unchanged
    clearAllChildren(container);
    addHeader(container, this.headerText);
  }
}

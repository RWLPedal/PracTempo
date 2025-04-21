import {
  Feature,
  // FeatureCategoryName removed
  ConfigurationSchema,
  ConfigurationSchemaArg,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import {
  FretboardConfig,
  AVAILABLE_TUNINGS,
  STANDARD_TUNING,
} from "../fretboard";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
// Import generic and specific interval settings types
import { IntervalSettings } from "../../schedule/editor/interval/types";
import { GuitarIntervalSettings } from "../guitar_interval_settings";
import {
  MUSIC_NOTES,
  getKeyIndex,
  addHeader,
  clearAllChildren,
} from "../guitar_utils";
import { TriadQuality, getTriadNotesAndLinesForGroup } from "../triads";
import { FretboardView } from "../views/fretboard_view";
import { DEFAULT_GUITAR_SETTINGS, GuitarSettings } from "../guitar_settings";

// String groups and names remain the same...
const STRING_GROUPS: [number, number, number][] = [
  [0, 1, 2],
  [1, 2, 3],
  [2, 3, 4],
  [3, 4, 5],
];
const STRING_GROUP_NAMES: { [key: string]: string } = {
  "0,1,2": "E-A-D",
  "1,2,3": "A-D-G",
  "2,3,4": "D-G-B",
  "3,4,5": "G-B-E",
};

/** Displays triad shapes across four 3-string groups using FretboardView. */
export class TriadFeature extends GuitarFeature {
  // Static properties (category removed, others unchanged)
  // static readonly category = FeatureCategoryName.Guitar; // Removed
  static readonly typeName = "Triad Shapes";
  static readonly displayName = "Triad Shapes (3-String Sets)";
  static readonly description =
    "Displays Major/Minor triad shapes across all positions for each 3-string set (EAD, ADG, DGB, GBE).";

  readonly typeName = TriadFeature.typeName;
  private readonly rootNoteName: string;
  private readonly quality: TriadQuality;
  private readonly mainHeaderText: string;

  constructor(
    config: ReadonlyArray<string>, // Specific args: [RootNote, Quality]
    rootNoteName: string,
    quality: TriadQuality,
    mainHeaderText: string,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings, // Constructor expects specific type
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    // --- Fretboard Config Scaling (remains the same) ---
    // TODO: This logic directly accesses category settings using the old enum key.
    // It should ideally use the string name "Guitar" or access settings passed down.
    // For now, leaving it, but it's inconsistent with the refactor.
    const guitarGlobalSettings =
      (settings.categorySettings["Guitar"] as GuitarSettings | undefined) ??
      DEFAULT_GUITAR_SETTINGS;
    const baseFretboardConfig = new FretboardConfig(
      AVAILABLE_TUNINGS[guitarGlobalSettings.tuning] ?? STANDARD_TUNING,
      guitarGlobalSettings.handedness,
      guitarGlobalSettings.colorScheme,
      undefined,
      undefined,
      undefined,
      maxCanvasHeight
    );
    const featureFretboardConfig = new FretboardConfig(
      baseFretboardConfig.tuning,
      baseFretboardConfig.handedness,
      baseFretboardConfig.colorScheme,
      baseFretboardConfig.markerDots,
      baseFretboardConfig.sideNumbers,
      baseFretboardConfig.stringWidths,
      maxCanvasHeight,
      0.6 // Apply scaling multiplier
    );
    // --- End Fretboard Config ---

    // Call super, passing interval settings
    super(config, settings, intervalSettings, audioController, maxCanvasHeight); // Pass specific type
    // Override config with the scaled-down one
    this.fretboardConfig = featureFretboardConfig;

    this.rootNoteName = rootNoteName;
    this.quality = quality;
    this.mainHeaderText = mainHeaderText;
    const fretCount = 15;

    // Create Views (Base constructor handles MetronomeView)
    let orderedGroups = [...STRING_GROUPS];
    if (this.fretboardConfig.handedness === "left") {
      orderedGroups.reverse();
    }

    orderedGroups.forEach((group) => {
      const fretboardView = new FretboardView(this.fretboardConfig, fretCount);
      this._views.push(fretboardView); // Add to views managed by base

      // Calculate notes/lines using the SCALED config
      const triadData = getTriadNotesAndLinesForGroup(
        this.rootNoteName,
        this.quality,
        group,
        fretCount,
        this.fretboardConfig // Use scaled config
      );

      // Use rAF for setting data
      requestAnimationFrame(() => {
        if (fretboardView) {
          // Check if view still exists
          fretboardView.setNotes(triadData.notes);
          fretboardView.setLines(triadData.lines);
        }
      });
    });
  }

  // --- Static Methods ---
  static getConfigurationSchema(): ConfigurationSchema {
    // Unchanged
    const availableKeys = MUSIC_NOTES.flat();
    const qualities: TriadQuality[] = [
      "Major",
      "Minor",
      "Diminished",
      "Augmented",
    ]; // Include all defined qualities
    const specificArgs: ConfigurationSchemaArg[] = [
      {
        name: "Root Note",
        type: "enum",
        required: true,
        enum: availableKeys,
        description: "Root note of the triad.",
      },
      {
        name: "Quality",
        type: "enum",
        required: true,
        enum: qualities,
        description: "Quality of the triad (Major, Minor, etc.).",
      },
    ];
    return {
      description: `Config: ${this.typeName},RootNote,Quality[,GuitarSettings]`,
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
        `[${this.typeName}] Invalid config. Expected [RootNote, Quality].`
      );
    }
    const rootNoteName = config[0];
    const quality = config[1] as TriadQuality;
    const featureSpecificConfig = [rootNoteName, quality]; // Keep only feature-specific args

    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1)
      throw new Error(`[${this.typeName}] Unknown key: "${rootNoteName}"`);
    const validRootName = MUSIC_NOTES[keyIndex]?.[0] ?? rootNoteName;

    // Validate quality against the enum values defined in triads.ts or globally
    const validQualities: TriadQuality[] = [
      "Major",
      "Minor",
      "Diminished",
      "Augmented",
    ]; // Use TriadQuality type
    if (!validQualities.includes(quality)) {
      throw new Error(`[${this.typeName}] Invalid triad quality: "${quality}"`);
    }

    const mainHeaderText = `${validRootName} ${quality} Triads (3-String Sets)`;

    // --- Type Assertion for Constructor ---
    const guitarIntervalSettings = intervalSettings as GuitarIntervalSettings;
    // --- End Type Assertion ---

    return new TriadFeature(
      featureSpecificConfig,
      validRootName,
      quality,
      mainHeaderText,
      settings,
      guitarIntervalSettings, // Pass asserted specific type
      audioController,
      maxCanvasHeight
    );
  }

  render(container: HTMLElement): void {
    // Unchanged
    clearAllChildren(container);
    addHeader(container, this.mainHeaderText);
    // DisplayController renders the FretboardViews added in constructor
  }
}

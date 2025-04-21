/* ts/guitar/features/triad_feature.ts */

import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
  ConfigurationSchemaArg, // Added
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import {
  FretboardConfig,
  AVAILABLE_TUNINGS,
  STANDARD_TUNING,
} from "../fretboard"; // Import FretboardConfig etc.
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import { GuitarIntervalSettings } from "../guitar_interval_settings"; // Import interval settings type
import {
  MUSIC_NOTES,
  getKeyIndex,
  addHeader,
  clearAllChildren,
} from "../guitar_utils";
import { TriadQuality, getTriadNotesAndLinesForGroup } from "../triads";
import {
  FretboardView,
} from "../views/fretboard_view";

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
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Triad Shapes";
  static readonly displayName = "Triad Shapes (3-String Sets)";
  static readonly description =
    "Displays Major/Minor/Dim/Aug triad shapes across all positions for each 3-string set (EAD, ADG, DGB, GBE).";;

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
    intervalSettings: GuitarIntervalSettings, // <<< Use interval settings
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    // Create scaled-down config *before* calling super()
    const baseFretboardConfig = new FretboardConfig(
      settings.categorySettings[FeatureCategoryName.Guitar]?.tuning
        ? AVAILABLE_TUNINGS[
            settings.categorySettings[FeatureCategoryName.Guitar].tuning
          ]
        : STANDARD_TUNING,
      settings.categorySettings[FeatureCategoryName.Guitar]?.handedness ||
        "right",
      settings.categorySettings[FeatureCategoryName.Guitar]?.colorScheme ||
        "default",
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
      0.75
    );

    // Call super, passing interval settings
    super(config, settings, intervalSettings, audioController, maxCanvasHeight);
    // Override config with the scaled-down one for this feature's views
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
      // Use the SCALED config for the view and calculations
      const fretboardView = new FretboardView(this.fretboardConfig, fretCount);
      this._views.push(fretboardView); // Add to views managed by base

      const triadData = getTriadNotesAndLinesForGroup(
        this.rootNoteName,
        this.quality,
        group,
        fretCount,
        this.fretboardConfig // Use scaled config for calculation
      );

      fretboardView.setNotes(triadData.notes);
      fretboardView.setLines(triadData.lines);
    });
  }

  // --- Static Methods ---
  static getConfigurationSchema(): ConfigurationSchema {
    const availableKeys = MUSIC_NOTES.flat();
    const qualities: TriadQuality[] = ["Major", "Minor"];
    // Define arguments specific to TriadFeature
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
        description: "Quality of the triad (Major, Minor).",
      },
    ];
    return {
      description: `Config: ${this.typeName},RootNote,Quality[,GuitarSettings]`,
      args: [...specificArgs, GuitarFeature.BASE_GUITAR_SETTINGS_CONFIG_ARG], // Merge with base
    };
  }

  static createFeature(
    config: ReadonlyArray<string>, // Raw config [RootNote, Quality, ...]
    audioController: AudioController,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings,
    maxCanvasHeight?: number
  ): Feature {
    // Parse feature-specific args
    if (config.length < 2) {
      throw new Error(
        `Invalid config for ${this.typeName}. Expected [RootNote, Quality].`
      );
    }
    const rootNoteName = config[0];
    const quality = config[1] as TriadQuality;
    const featureSpecificConfig = [rootNoteName, quality]; // Args for this feature

    // Validate
    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1) throw new Error(`Unknown key: "${rootNoteName}"`);
    const validRootName = MUSIC_NOTES[keyIndex]?.[0] ?? rootNoteName;
    const validQualities: TriadQuality[] = ["Major", "Minor"];
    if (!validQualities.includes(quality))
      throw new Error(`Invalid triad quality: "${quality}"`);

    const mainHeaderText = `${validRootName} ${quality} Triads (3-String Sets)`;

    return new TriadFeature(
      featureSpecificConfig,
      validRootName,
      quality,
      mainHeaderText,
      settings,
      intervalSettings,
      audioController,
      maxCanvasHeight
    );
  }

  /** Render method adds header; DisplayController renders the views. */
  render(container: HTMLElement): void {
    clearAllChildren(container);
    addHeader(container, this.mainHeaderText);
    // Optional: Add sub-headers container here if desired
  }
}

/* ts/guitar/features/triad_feature.ts */

import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { AVAILABLE_TUNINGS, FretboardConfig, STANDARD_TUNING } from "../fretboard"; // Import FretboardConfig
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import {
  MUSIC_NOTES,
  getKeyIndex,
  addHeader,
  clearAllChildren,
} from "../guitar_utils";
import {
  TriadQuality,
  // TriadInversion, // Not needed directly by feature anymore
  getTriadNotesAndLinesForGroup,
} from "../triads";
import {
  FretboardView,
  NoteRenderData,
  LineData,
} from "../views/fretboard_view";
import { MetronomeView } from "../views/metronome_view";
import { View } from "../../view";

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
    "Displays Major/Minor/Dim/Aug triad shapes across all positions for each 3-string set (EAD, ADG, DGB, GBE).";

  readonly typeName = TriadFeature.typeName;
  private readonly rootNoteName: string;
  private readonly quality: TriadQuality;
  private readonly mainHeaderText: string;
  // Store views if needed, though maybe not necessary to hold references here
  // private fretboardViews: FretboardView[] = [];

  constructor(
    config: ReadonlyArray<string>,
    rootNoteName: string,
    quality: TriadQuality,
    mainHeaderText: string,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    // Create the scaled-down config *before* calling super()
    // Clone base settings to avoid modifying the original AppSettings object
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
      maxCanvasHeight // Pass height constraint for base calculation
      // Default multiplier is 1.0 here
    );

    // Now create the specific config for this feature with the multiplier
    const featureFretboardConfig = new FretboardConfig(
      baseFretboardConfig.tuning,
      baseFretboardConfig.handedness,
      baseFretboardConfig.colorScheme,
      baseFretboardConfig.markerDots,
      baseFretboardConfig.sideNumbers,
      baseFretboardConfig.stringWidths,
      maxCanvasHeight, // Pass height constraint again
      0.75
    );

    // Call super, but the fretboardConfig created there might be overridden locally
    super(
      config,
      settings, // Pass original settings up
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
    // Override the config created by the base class with our scaled-down one
    this.fretboardConfig = featureFretboardConfig;

    this.rootNoteName = rootNoteName;
    this.quality = quality;
    this.mainHeaderText = mainHeaderText;

    const fretCount = 15;
    const views: View[] = [];

    let orderedGroups = [...STRING_GROUPS];
    let orderedNames = orderedGroups.map(
      (g) => STRING_GROUP_NAMES[g.join(",")]
    );

    if (this.fretboardConfig.handedness === "left") {
      orderedGroups.reverse();
      orderedNames.reverse();
    }

    // Create FretboardViews and calculate data
    orderedGroups.forEach((group) => {
      // Pass the SCALED config to the view
      const fretboardView = new FretboardView(this.fretboardConfig, fretCount);
      // this.fretboardViews.push(fretboardView); // Not strictly needed to store ref here
      views.push(fretboardView);

      // Calculate notes/lines using the SCALED config
      const triadData = getTriadNotesAndLinesForGroup(
        this.rootNoteName,
        this.quality,
        group,
        fretCount,
        this.fretboardConfig // Use the scaled config for calculations
      );

      fretboardView.setNotes(triadData.notes);
      fretboardView.setLines(triadData.lines);
    });

    // Add MetronomeView if applicable
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
        console.error("Metronome audio element not found for TriadFeature.");
      }
    } else if (this.metronomeBpm > 0 && !this.audioController) {
      console.warn(
        "Metronome requested for TriadFeature, but AudioController missing."
      );
    }

    (this as { views: ReadonlyArray<View> }).views = views;
  }

  // Static methods remain the same...
  static getConfigurationSchema(): ConfigurationSchema {
    const availableKeys = MUSIC_NOTES.flat();
    const qualities: TriadQuality[] = ["Major", "Minor", "Diminished", "Augmented"];
    return {
      description: `Config: ${this.typeName},RootNote,Quality[,GuitarSettings]`,
      args: [
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
          description: "Quality of the triad (Major, Minor, etc).",
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
    if (config.length < 2) {
      throw new Error(
        `Invalid config for ${this.typeName}. Expected [RootNote, Quality].`
      );
    }
    const rootNoteName = config[0];
    const quality = config[1] as TriadQuality;
    const remainingConfig = config.slice(2);

    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1) throw new Error(`Unknown key: "${rootNoteName}"`);
    const validRootName = MUSIC_NOTES[keyIndex]?.[0] ?? rootNoteName;
    const validQualities: TriadQuality[] = ["Major", "Minor", "Diminished", "Augmented"];
    if (!validQualities.includes(quality))
      throw new Error(`Invalid triad quality: "${quality}"`);

    const mainHeaderText = `${validRootName} ${quality} Triads (3-String Sets)`;

    return new TriadFeature(
      remainingConfig,
      validRootName,
      quality,
      mainHeaderText,
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
  }

  /** Render method adds header; DisplayController renders the views. */
  render(container: HTMLElement): void {
    clearAllChildren(container);
    addHeader(container, this.mainHeaderText);

    // Optional: Add sub-headers for string groups dynamically if needed
    // This would likely require modifying how DisplayController renders views
    // or making this render method more complex. For now, rely on CSS layout.

    // Example of adding sub-headers (would need CSS to align with views):
    /*
    const subHeaderContainer = document.createElement('div');
    subHeaderContainer.style.display = 'flex';
    subHeaderContainer.style.justifyContent = 'space-around'; // Adjust as needed
    subHeaderContainer.style.width = '100%'; // Adjust as needed
    let orderedNames = STRING_GROUPS.map(g => STRING_GROUP_NAMES[g.join(',')]);
    if (this.fretboardConfig.handedness === 'left') {
        orderedNames.reverse();
    }
    orderedNames.forEach(name => {
        const sh = document.createElement('h6');
        sh.textContent = name;
        sh.style.textAlign = 'center';
        sh.style.flex = '1'; // Example sizing
        subHeaderContainer.appendChild(sh);
    });
    container.appendChild(subHeaderContainer);
    */
  }
} // End TriadFeature Class

import {
  Feature,
  ConfigurationSchema,
  ConfigurationSchemaArg,
} from "../../feature";
import { View } from "../../view";
import { GuitarFeature } from "../guitar_base";
import {
  FretboardConfig,
  AVAILABLE_TUNINGS,
  STANDARD_TUNING,
} from "../fretboard";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
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

const STRING_GROUPS: [number, number, number][] = [
  [0, 1, 2],
  [1, 2, 3],
  [2, 3, 4],
  [3, 4, 5],
];

/**
 * A dedicated View to render a single row for a given triad quality,
 * containing a header and four FretboardViews. This class is self-contained.
 */
class TriadQualityRowView implements View {
  private quality: TriadQuality;
  private rootNoteName: string;
  private fretboardConfig: FretboardConfig;
  private fretboardViews: FretboardView[] = [];
  private rowContainer: HTMLElement | null = null;
  private diagramsContainer: HTMLElement | null = null; // Keep reference to this

  constructor(
    quality: TriadQuality,
    rootNoteName: string,
    fretboardConfig: FretboardConfig
  ) {
    this.quality = quality;
    this.rootNoteName = rootNoteName;
    this.fretboardConfig = fretboardConfig;
    const fretCount = 15;

    let orderedGroups = [...STRING_GROUPS];
    if (this.fretboardConfig.handedness === "left") {
      orderedGroups.reverse();
    }
    orderedGroups.forEach((group) => {
      const triadData = getTriadNotesAndLinesForGroup(
        rootNoteName,
        quality,
        group,
        fretCount,
        fretboardConfig
      );
      const view = new FretboardView(fretboardConfig, fretCount);
      view.setNotes(triadData.notes);
      view.setLines(triadData.lines);
      this.fretboardViews.push(view);
    });
  }

  render(container: HTMLElement): void {
    // Create the DOM elements only on the first render call
    if (!this.rowContainer) {
      this.rowContainer = document.createElement("div");
      this.rowContainer.className = "triad-quality-row";
      this.rowContainer.style.marginBottom = "10px";

      const header = addHeader(this.rowContainer, `${this.quality} Triads`);
      header.style.textAlign = "left";
      header.style.fontSize = "1.1rem";

      this.diagramsContainer = document.createElement("div");
      this.diagramsContainer.style.display = "flex";
      this.diagramsContainer.style.flexWrap = "wrap";
      this.diagramsContainer.style.gap = "4px";
      this.rowContainer.appendChild(this.diagramsContainer);
    }

    // Ensure the main row container is attached to the parent DOM
    if (this.rowContainer && !this.rowContainer.parentNode) {
      container.appendChild(this.rowContainer);
    }

    // Always call render on the child FretboardViews to ensure they redraw themselves.
    // The diagramsContainer, which is the parent for the canvases, will be valid.
    if (this.diagramsContainer) {
      this.fretboardViews.forEach((view) => {
        view.render(this.diagramsContainer!);
      });
    }
  }

  start() {
    /* No-op */
  }
  stop() {
    /* No-op */
  }
  destroy() {
    this.fretboardViews.forEach((view) => view.destroy());
    this.rowContainer?.remove();
  }
}

/** Displays triad shapes across four 3-string groups for multiple qualities. */
export class TriadFeature extends GuitarFeature {
  static readonly typeName = "Triad Shapes";
  static readonly displayName = "Triad Shapes (3-String Sets)";
  static readonly description =
    "Displays triad shapes for selected qualities (Major, Minor, etc.) across all positions for each 3-string set.";

  readonly typeName = TriadFeature.typeName;
  private readonly mainHeaderText: string;

  private readonly rowViews: TriadQualityRowView[] = [];

  constructor(
    config: ReadonlyArray<string>,
    rootNoteName: string,
    qualities: TriadQuality[],
    mainHeaderText: string,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings,
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
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
      qualities.length === 1 ? 0.65 : .5
    );

    super(config, settings, intervalSettings, audioController, maxCanvasHeight);
    this.fretboardConfig = featureFretboardConfig;
    this.mainHeaderText = mainHeaderText;

    // Create and store the row views internally.
    qualities.forEach((quality) => {
      this.rowViews.push(
        new TriadQualityRowView(quality, rootNoteName, this.fretboardConfig)
      );
    });
  }

  static getConfigurationSchema(): ConfigurationSchema {
    const availableKeys = MUSIC_NOTES.flat();
    const qualities: TriadQuality[] = [
      "Major",
      "Minor",
      "Diminished",
      "Augmented",
    ];

    const specificArgs: ConfigurationSchemaArg[] = [
      {
        name: "Root Note",
        type: "enum",
        required: true,
        enum: availableKeys,
        description: "Root note of the triads.",
      },
      {
        name: "Qualities",
        type: "enum",
        required: true,
        isVariadic: true,
        uiComponentType: "toggle_button_selector",
        uiComponentData: { buttonLabels: qualities },
        description: "Select one or more triad qualities to display.",
      },
    ];
    return {
      description: `Config: ${this.typeName},RootNote,Quality1[,Quality2,...][,GuitarSettings]`,
      args: [...specificArgs, GuitarFeature.BASE_GUITAR_SETTINGS_CONFIG_ARG],
    };
  }

  static createFeature(
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings,
    intervalSettings: IntervalSettings,
    maxCanvasHeight: number | undefined,
    categoryName: string
  ): Feature {
    if (config.length < 2) {
      throw new Error(
        `[${this.typeName}] Invalid config. Expected [RootNote, Quality1, ...].`
      );
    }
    const rootNoteName = config[0];
    const qualities = config.slice(1) as TriadQuality[];

    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1)
      throw new Error(`[${this.typeName}] Unknown key: "${rootNoteName}"`);
    const validRootName = MUSIC_NOTES[keyIndex]?.[0] ?? rootNoteName;

    if (qualities.length === 0) {
      throw new Error(
        `[${this.typeName}] At least one triad quality must be selected.`
      );
    }

    const mainHeaderText = `${validRootName} Triad Shapes`;
    const guitarIntervalSettings = intervalSettings as GuitarIntervalSettings;

    return new TriadFeature(
      config,
      validRootName,
      qualities,
      mainHeaderText,
      settings,
      guitarIntervalSettings,
      audioController,
      maxCanvasHeight
    );
  }

  render(container: HTMLElement): void {
    clearAllChildren(container);
    addHeader(container, this.mainHeaderText);

    // Explicitly render our internal row views.
    this.rowViews.forEach((view) => {
      view.render(container);
    });

    // Also render any views managed by the base class (like the metronome).
    this._views.forEach((view) => {
      view.render(container);
    });
  }

  destroy?(): void {
    // Clean up our internal views.
    this.rowViews.forEach((view) => view.destroy());
    // Call the base class's destroy method to clean up its views (the metronome).
    super.destroy?.();
  }
}

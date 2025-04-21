// ts/guitar/guitar_base.ts
import { Feature, FeatureCategoryName } from "../feature";
import { View } from "../view";
import { MetronomeView } from "./views/metronome_view";
import {
  FretboardConfig,
  AVAILABLE_TUNINGS,
  STANDARD_TUNING,
  TuningName, // Import TuningName if needed for casting/validation, though FretboardConfig handles it now
} from "./fretboard";
// Import the new settings structure and helpers
import { AppSettings, getCategorySettings } from "../settings";
import { GuitarSettings, GUITAR_SETTINGS_KEY } from "./guitar_settings"; // Import Guitar specific settings type and key
// Other imports
import { AudioController } from "../audio_controller";
import { clearAllChildren, addHeader, addCanvas } from "./guitar_utils";

/**
 * Base class for all Guitar-related features.
 * Handles common setup like FretboardConfig and conditional MetronomeView creation.
 */
export abstract class GuitarFeature implements Feature {
  readonly category = FeatureCategoryName.Guitar;
  abstract readonly typeName: string;

  readonly config: ReadonlyArray<string>;
  protected settings: AppSettings; // Keep the full AppSettings reference
  protected audioController?: AudioController;
  protected fretboardConfig: FretboardConfig;
  readonly maxCanvasHeight?: number; // Store the max height constraint

  readonly views: ReadonlyArray<View> = [];
  protected metronomeBpm: number = 0;

  /**
   * Base constructor for Guitar features.
   * @param config Raw configuration arguments from the schedule.
   * @param settings Current application settings.
   * @param metronomeBpmOverride Optional BPM override from the schedule editor. If > 0, a MetronomeView will be added.
   * @param audioController Optional AudioController, required if metronomeBpmOverride > 0.
   * @param maxCanvasHeight Optional maximum height for the feature's canvas.
   */
  constructor(
    config: ReadonlyArray<string>,
    settings: AppSettings, // Accept the full AppSettings object
    metronomeBpmOverride?: number,
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    this.config = config;
    this.settings = settings; // Store the full settings
    this.maxCanvasHeight = maxCanvasHeight;
    this.audioController = audioController;

    // Use the helper to get the specific Guitar settings
    const guitarSettings = getCategorySettings<GuitarSettings>(
        settings,
        FeatureCategoryName.Guitar // Use the enum value as the key
    );

    // Validate tuning name just in case
    const tuningName = AVAILABLE_TUNINGS[guitarSettings.tuning]
      ? guitarSettings.tuning
      : "Standard";
    const tuning = AVAILABLE_TUNINGS[tuningName];

    // Create FretboardConfig using the retrieved guitar settings
    this.fretboardConfig = new FretboardConfig(
      tuning,
      guitarSettings.handedness,
      guitarSettings.colorScheme,
      undefined, // markerDots (use default)
      undefined, // sideNumbers (use default)
      undefined, // stringWidths (use default)
      this.maxCanvasHeight // Pass the max height constraint
    );

    // Determine the BPM: Use override if provided and valid, otherwise default to 0 (no metronome).
    this.metronomeBpm =
      metronomeBpmOverride && metronomeBpmOverride > 0
        ? metronomeBpmOverride
        : 0;

    // MetronomeView creation logic remains the same...
    if (this.metronomeBpm > 0) {
      if (!this.audioController) {
        console.warn(
          `Metronome requested (BPM: ${this.metronomeBpm}) but AudioController was not provided to GuitarFeature constructor. MetronomeView will not be created.`
        );
      } else {
        const metronomeAudioEl = document.getElementById(
          "metronome-sound"
        ) as HTMLAudioElement;
        if (!metronomeAudioEl) {
          console.error(
            "Metronome audio element (#metronome-sound) not found in the DOM. MetronomeView will not be created."
          );
        } else {
          const metronomeView = new MetronomeView(
            this.metronomeBpm,
            this.audioController,
            metronomeAudioEl
          );
          this.views = [metronomeView];
          console.log(
            `MetronomeView added to GuitarFeature with BPM: ${this.metronomeBpm}`
          );
        }
      }
    }
  }

  // abstract render and lifecycle methods remain the same
  abstract render(container: HTMLElement): void;

  prepare?(): void {
    this.views?.forEach((view) => {
        if (typeof (view as any).prepare === 'function') {
            (view as any).prepare();
        }
    });
  }

  start?(): void {
    this.views?.forEach((view) => view.start());
  }

  stop?(): void {
    this.views?.forEach((view) => view.stop());
  }

  destroy?(): void {
    this.views?.forEach((view) => view.destroy());
  }

  /** Clears the container, adds a header, adds a canvas, and returns canvas+context. */
  protected clearAndAddCanvas(
    container: HTMLElement,
    headerText: string
  ): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    clearAllChildren(container);
    addHeader(container, headerText);
    // Pass a unique suffix based potentially on typeName and config for better ID generation
    const uniqueSuffix = `${this.typeName}-${this.config.join('-')}`.replace(/[^a-zA-Z0-9-]/g, '_');
    const canvasEl = addCanvas(container, uniqueSuffix);
    const ctx = canvasEl.getContext("2d");
    if (!ctx) {
      throw new Error(
        `Could not get 2D context for canvas in feature ${this.typeName}.`
      );
    }
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.resetTransform();
    ctx.translate(0.5, 0.5);
    return { canvas: canvasEl, ctx: ctx };
  }
}
// ts/guitar/guitar_base.ts
import {
  Feature,
  // --- REMOVED: FeatureCategoryName import ---
  ConfigurationSchemaArg,
} from "../feature"; // Added ConfigurationSchemaArg
import { View } from "../view";
import { MetronomeView } from "./views/metronome_view";
import {
  FretboardConfig,
  AVAILABLE_TUNINGS,
  STANDARD_TUNING,
  TuningName,
} from "./fretboard";
import { AppSettings, getCategorySettings } from "../settings"; // getCategorySettings now takes string
import {
  GuitarSettings,
  GUITAR_SETTINGS_KEY,
  DEFAULT_GUITAR_SETTINGS,
} from "./guitar_settings"; // Import defaults too
import { GuitarIntervalSettings } from "./guitar_interval_settings";
import { AudioController } from "../audio_controller";
import {
  clearAllChildren,
  addHeader,
  addCanvas,
  START_PX,
} from "./guitar_utils";
import { IntervalSettings } from "../schedule/editor/interval/types"; // Import base type

/**
 * Base class for all Guitar-related features.
 * Handles common setup like FretboardConfig and conditional MetronomeView creation based on interval settings.
 */
export abstract class GuitarFeature implements Feature {
  // --- REMOVED: readonly category property ---
  abstract readonly typeName: string;
  readonly config: ReadonlyArray<string>; // Config args specific to the subclass feature type
  protected settings: AppSettings;
  protected audioController?: AudioController;
  protected fretboardConfig: FretboardConfig;
  readonly maxCanvasHeight?: number;

  protected _views: View[] = [];
  get views(): ReadonlyArray<View> {
    return this._views;
  }
  protected metronomeBpm: number = 0;

  // --- Base Configuration for Guitar Settings (remains same) ---
  static readonly BASE_GUITAR_SETTINGS_CONFIG_ARG: ConfigurationSchemaArg = {
    name: "Guitar Settings",
    type: "ellipsis",
    uiComponentType: "ellipsis",
    description: "Configure interval-specific guitar settings (Metronome).",
    nestedSchema: [
      {
        name: "metronomeBpm",
        type: "number",
        description: "Metronome BPM (0=off)",
      },
    ],
  };

  constructor(
    config: ReadonlyArray<string>,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings, // Constructor still receives specific type from createFeature assertion
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    this.config = config;
    this.settings = settings;
    this.maxCanvasHeight = maxCanvasHeight;
    this.audioController = audioController; // Store the passed controller

    // Get global guitar settings using string name
    // Use GUITAR_SETTINGS_KEY which is now "Guitar"
    const guitarGlobalSettings =
      getCategorySettings<GuitarSettings>(settings, GUITAR_SETTINGS_KEY) ??
      DEFAULT_GUITAR_SETTINGS;

    // Validate tuning name before using it
    const tuningName = AVAILABLE_TUNINGS[guitarGlobalSettings.tuning]
      ? guitarGlobalSettings.tuning
      : "Standard";
    const tuning = AVAILABLE_TUNINGS[tuningName]; // Use validated name

    this.fretboardConfig = new FretboardConfig(
      tuning,
      guitarGlobalSettings.handedness,
      guitarGlobalSettings.colorScheme,
      undefined,
      undefined,
      undefined,
      this.maxCanvasHeight
    );

    // --- Metronome Handling (FIXED) ---
    this.metronomeBpm = intervalSettings?.metronomeBpm ?? 0;
    if (this.metronomeBpm > 0) {
      // Check if audioController exists AND has the required audio elements
      if (
        this.audioController &&
        this.audioController.metronomeAudioEl &&
        this.audioController.accentMetronomeAudioEl
      ) {
        // Create the view using the valid audioController
        const metronomeView = new MetronomeView(
          this.metronomeBpm,
          this.audioController
        );
        this._views.push(metronomeView);
        console.log(
          `MetronomeView added by GuitarFeature base with BPM: ${this.metronomeBpm}`
        );
      } else if (this.audioController) {
        // Log error if controller exists but elements are missing *within it*
        console.error(
          "Required metronome audio element(s) missing in AudioController. MetronomeView will not be created."
        );
      } else {
        // Log warning if controller itself is missing
        console.warn(
          `Metronome requested (BPM: ${this.metronomeBpm}) but AudioController was not provided. MetronomeView will not be created.`
        );
      }
    }
  }


  // Abstract render method
  abstract render(container: HTMLElement): void;

  // Common lifecycle methods (remain same)
  prepare?(): void {
    this._views.forEach((view) => {
      if (typeof (view as any).prepare === "function") {
        (view as any).prepare();
      }
    });
  }
  start?(): void {
    this._views.forEach((view) => view.start());
  }
  stop?(): void {
    this._views.forEach((view) => view.stop());
  }
  destroy?(): void {
    this._views.forEach((view) => view.destroy());
  }

  // clearAndAddCanvas helper (remains same)
  protected clearAndAddCanvas(
    container: HTMLElement,
    headerText: string
  ): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    // ... (implementation remains same) ...
    clearAllChildren(container);
    addHeader(container, headerText);
    const uniqueSuffix = `${this.typeName}-${this.config.join("-")}`.replace(
      /[^a-zA-Z0-9-]/g,
      "_"
    );
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
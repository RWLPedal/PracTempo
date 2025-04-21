import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchemaArg,
} from "../feature"; // Added ConfigurationSchemaArg
import { View } from "../view";
import { MetronomeView } from "./views/metronome_view";
import {
  FretboardConfig,
  AVAILABLE_TUNINGS,
  STANDARD_TUNING,
  TuningName, // Import TuningName if needed for casting/validation, though FretboardConfig handles it now
} from "./fretboard";
import { AppSettings, getCategorySettings } from "../settings";
import { GuitarSettings, GUITAR_SETTINGS_KEY } from "./guitar_settings";
import { GuitarIntervalSettings } from "./guitar_interval_settings";
import { AudioController } from "../audio_controller";
import {
  clearAllChildren,
  addHeader,
  addCanvas,
  START_PX,
} from "./guitar_utils";

/**
 * Base class for all Guitar-related features.
 * Handles common setup like FretboardConfig and conditional MetronomeView creation based on interval settings.
 */
export abstract class GuitarFeature implements Feature {
  readonly category = FeatureCategoryName.Guitar;
  abstract readonly typeName: string;
  readonly config: ReadonlyArray<string>; // Config args specific to the subclass feature type
  protected settings: AppSettings;
  protected audioController?: AudioController;
  protected fretboardConfig: FretboardConfig;
  readonly maxCanvasHeight?: number;

  // Define views as a mutable array initially, then make readonly externally
  protected _views: View[] = [];
  get views(): ReadonlyArray<View> {
    return this._views;
  }
  protected metronomeBpm: number = 0;

  // --- Base Configuration for Guitar Settings ---
  static readonly BASE_GUITAR_SETTINGS_CONFIG_ARG: ConfigurationSchemaArg = {
    name: "Guitar Settings", // This name might not be directly shown if using ellipsis UI
    type: "ellipsis", // Underlying type marker
    uiComponentType: "ellipsis", // Specify the UI component
    description: "Configure interval-specific guitar settings (Metronome).",
    nestedSchema: [
      {
        name: "metronomeBpm", // Must match property in GuitarIntervalSettings
        type: "number",
        description: "Metronome BPM (0=off)",
        // Optional: Add min/max/placeholder if desired
      },
      // Add other common interval settings here if they arise
    ],
  };

  /**
   * Base constructor for Guitar features.
   * @param config Raw configuration arguments *specific* to the subclass feature type.
   * @param settings Current application settings.
   * @param intervalSettings Settings specific to this interval (e.g., metronome BPM). << CHANGED
   * @param audioController Optional AudioController, required if metronome is used.
   * @param maxCanvasHeight Optional maximum height for the feature's canvas.
   */
  constructor(
    config: ReadonlyArray<string>,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings, // <<< CHANGED: Accept full interval settings object
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    this.config = config; // Store only the feature-specific args
    this.settings = settings;
    this.maxCanvasHeight = maxCanvasHeight;
    this.audioController = audioController;

    // Get global guitar settings
    const guitarSettings = getCategorySettings<GuitarSettings>(
      settings,
      FeatureCategoryName.Guitar
    );
    const tuningName = AVAILABLE_TUNINGS[guitarSettings.tuning]
      ? guitarSettings.tuning
      : "Standard";
    const tuning = AVAILABLE_TUNINGS[tuningName];

    this.fretboardConfig = new FretboardConfig(
      tuning,
      guitarSettings.handedness,
      guitarSettings.colorScheme,
      undefined, // markerDots (use default)
      undefined, // sideNumbers (use default)
      undefined, // stringWidths (use default)
      this.maxCanvasHeight // Pass the max height constraint
    );

    // --- Metronome Handling ---
    // Extract BPM from the interval settings object
    this.metronomeBpm = intervalSettings?.metronomeBpm ?? 0;

    if (this.metronomeBpm > 0) {
      if (!this.audioController) {
        console.warn(
          `Metronome requested (BPM: ${this.metronomeBpm}) but AudioController was not provided. MetronomeView will not be created.`
        );
      } else {
        const metronomeAudioEl = document.getElementById(
          "metronome-sound"
        ) as HTMLAudioElement | null;
        const accentMetronomeAudioEl = document.getElementById(
          "accent-metronome-sound"
        ) as HTMLAudioElement | null; // Get accent element

        if (!metronomeAudioEl || !accentMetronomeAudioEl) {
          // Check both
          console.error(
            "Required metronome audio element(s) (#metronome-sound, #accent-metronome-sound) not found. MetronomeView will not be created."
          );
        } else {
          // Pass the full audio controller to MetronomeView constructor
          const metronomeView = new MetronomeView(
            this.metronomeBpm,
            this.audioController
          );
          this._views.push(metronomeView); // Add to mutable array
          console.log(
            `MetronomeView added by GuitarFeature base with BPM: ${this.metronomeBpm}`
          );
        }
      }
    }
    // Note: Subclass constructors can add *their own* views to this._views after calling super()
  }

  // Abstract render method - subclasses implement drawing feature specifics
  abstract render(container: HTMLElement): void;

  // Common lifecycle methods - propagate to views
  prepare?(): void {
    this._views.forEach((view) => {
      // Use _views
      if (typeof (view as any).prepare === "function") {
        (view as any).prepare();
      }
    });
  }

  start?(): void {
    this._views.forEach((view) => view.start()); // Use _views
  }

  stop?(): void {
    this._views.forEach((view) => view.stop()); // Use _views
  }

  destroy?(): void {
    this._views.forEach((view) => view.destroy()); // Use _views
  }

  /** Clears the container, adds a header, adds a canvas, and returns canvas+context. */
  protected clearAndAddCanvas(
    container: HTMLElement,
    headerText: string
  ): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
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
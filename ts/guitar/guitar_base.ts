// ts/guitar/guitar_base.ts
import { Feature, ConfigurationSchemaArg } from "../feature";
import { View } from "../view";
import { MetronomeView } from "./views/metronome_view";
import {
  FretboardConfig,
  AVAILABLE_TUNINGS,
  STANDARD_TUNING,
  TuningName,
} from "./fretboard";
import { AppSettings, getCategorySettings } from "../settings";
import {
  GuitarSettings,
  GUITAR_SETTINGS_KEY,
  DEFAULT_GUITAR_SETTINGS,
} from "./guitar_settings";
import { GuitarIntervalSettings } from "./guitar_interval_settings";
import { AudioController } from "../audio_controller";
import {
  clearAllChildren,
  addHeader,
  addCanvas,
  START_PX,
} from "./guitar_utils";
import { IntervalSettings } from "../schedule/editor/interval/types";

/**
 * Base class for all Guitar-related features.
 * Handles common setup like FretboardConfig and conditional MetronomeView creation based on interval settings.
 */
export abstract class GuitarFeature implements Feature {
  abstract readonly typeName: string;
  readonly config: ReadonlyArray<string>;
  protected settings: AppSettings;
  protected audioController?: AudioController;
  protected fretboardConfig: FretboardConfig;
  readonly maxCanvasHeight?: number;

  protected _views: View[] = []; // Mutable array for internal use
  get views(): ReadonlyArray<View> {
    // Expose as readonly externally
    return this._views;
  }
  protected metronomeBpm: number = 0;

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
    intervalSettings: GuitarIntervalSettings,
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    this.config = config;
    this.settings = settings;
    this.maxCanvasHeight = maxCanvasHeight;
    this.audioController = audioController;

    const guitarGlobalSettings =
      getCategorySettings<GuitarSettings>(settings, GUITAR_SETTINGS_KEY) ??
      DEFAULT_GUITAR_SETTINGS;

    const tuningName = AVAILABLE_TUNINGS[guitarGlobalSettings.tuning]
      ? guitarGlobalSettings.tuning
      : "Standard";
    const tuning = AVAILABLE_TUNINGS[tuningName];

    this.fretboardConfig = new FretboardConfig(
      tuning,
      guitarGlobalSettings.handedness,
      guitarGlobalSettings.colorScheme,
      undefined,
      undefined,
      undefined,
      this.maxCanvasHeight
    );

    // --- Metronome Handling ---
    // MetronomeView is potentially added *last* to ensure render order
    let metronomeViewInstance: MetronomeView | null = null;
    this.metronomeBpm = intervalSettings?.metronomeBpm ?? 0;
    if (this.metronomeBpm > 0) {
      if (
        this.audioController &&
        this.audioController.metronomeAudioEl &&
        this.audioController.accentMetronomeAudioEl
      ) {
        metronomeViewInstance = new MetronomeView(
          this.metronomeBpm,
          this.audioController
        );
        console.log(
          `MetronomeView instance created by GuitarFeature base with BPM: ${this.metronomeBpm}`
        );
      } else if (this.audioController) {
        console.error(
          "Required metronome audio element(s) missing in AudioController. MetronomeView will not be created."
        );
      } else {
        console.warn(
          `Metronome requested (BPM: ${this.metronomeBpm}) but AudioController was not provided. MetronomeView will not be created.`
        );
      }
    }

    // Subclasses will add their primary views to this._views in their constructors BEFORE calling super
    // Now, add the metronome view if it was created, ensuring it's last
    if (metronomeViewInstance) {
      this._views.push(metronomeViewInstance);
      console.log(`MetronomeView added LAST to views array.`);
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

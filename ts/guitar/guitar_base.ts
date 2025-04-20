import { Feature, FeatureCategoryName } from "../feature";
import { View } from "../view";
import { MetronomeView } from "./views/metronome_view";
import {
  FretboardConfig,
  AVAILABLE_TUNINGS,
  STANDARD_TUNING,
} from "./fretboard";
import { AppSettings } from "../settings";
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
  protected settings: AppSettings;
  protected audioController?: AudioController;
  protected fretboardConfig: FretboardConfig;
  readonly maxCanvasHeight?: number; // Store the max height constraint

  readonly views: ReadonlyArray<View> = [];
  protected metronomeBpm: number = 0;

  /**
   * Base constructor for Guitar features.
   * @param config Raw configuration arguments from the schedule.
   * @param settings Current application settings.
   * @param metronomeBpmOverride Optional BPM override from the schedule editor.
   * If > 0, a MetronomeView will be added.
   * @param audioController Optional AudioController, required if metronomeBpmOverride > 0.
   */
  constructor(
    config: ReadonlyArray<string>,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    audioController?: AudioController,
    maxCanvasHeight?: number // Add maxCanvasHeight parameter
  ) {
    this.config = config;
    this.settings = settings;
    this.maxCanvasHeight = maxCanvasHeight; // Store the value
    this.audioController = audioController;

    const tuningName = settings.guitarSettings.tuning;
    const tuning = AVAILABLE_TUNINGS[tuningName] ?? STANDARD_TUNING;

    // Pass all relevant guitar settings AND maxCanvasHeight to FretboardConfig constructor
    this.fretboardConfig = new FretboardConfig(
      tuning,
      settings.guitarSettings.handedness,
      settings.guitarSettings.colorScheme, // Pass color scheme
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

  abstract render(container: HTMLElement): void;

  // Base prepare method, primarily for preparing associated views.
  // Subclasses can override this and call super.prepare() if needed.
  prepare?(): void {
    this.views?.forEach((view) => {
        // Check if view has a prepare method before calling
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
    const canvasEl = addCanvas(container, this.typeName);
    const ctx = canvasEl.getContext("2d");
    if (!ctx) {
      throw new Error(
        `Could not get 2D context for canvas in feature ${this.typeName}.`
      );
    }
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.resetTransform();
    ctx.translate(0.5, 0.5); // Prevent anti-aliasing blur for lines
    return { canvas: canvasEl, ctx: ctx };
  }
}

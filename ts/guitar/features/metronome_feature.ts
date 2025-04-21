import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
  ConfigurationSchemaArg, // Import if needed
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import { GuitarIntervalSettings } from "../guitar_interval_settings"; // Import interval settings type
import { addHeader, clearAllChildren } from "../guitar_utils";
import { View } from "../../view";

/** A simple feature that only displays a MetronomeView (if BPM > 0). */
export class MetronomeFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Metronome";
  static readonly displayName = "Metronome Only";
  static readonly description =
    "Displays only a metronome control/visualizer. BPM is set via Guitar Settings.";
  readonly typeName = MetronomeFeature.typeName;

  // --- Static Methods ---
  static getConfigurationSchema(): ConfigurationSchema {
    // This feature has no specific args, only the base guitar settings
    return {
      description: `Config: ${this.typeName}[,GuitarSettings]\nDisplays a metronome. BPM set via Guitar Settings.`,
      args: [GuitarFeature.BASE_GUITAR_SETTINGS_CONFIG_ARG], // <<< Use base config arg directly
    };
  }

  static createFeature(
    config: ReadonlyArray<string>, // Config now only contains potential Guitar Settings args
    audioController: AudioController,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings,
    maxCanvasHeight?: number
  ): Feature {
    // Pass intervalSettings object to constructor
    return new MetronomeFeature(
      config, // Pass specific args (empty for this feature)
      settings,
      intervalSettings,
      audioController,
      maxCanvasHeight
    );
  }

  // Constructor calls super, which handles metronome view creation
  constructor(
    config: ReadonlyArray<string>,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings,
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    // Pass intervalSettings up to the base constructor
    // The base constructor will extract BPM and create MetronomeView if needed
    super(config, settings, intervalSettings, audioController, maxCanvasHeight);
    // No feature-specific views to add here
  }

  /** Render just adds a header; DisplayController handles the MetronomeView. */
  render(container: HTMLElement): void {
    clearAllChildren(container);
    const headerText =
      this.metronomeBpm > 0
        ? `Metronome @ ${this.metronomeBpm} BPM`
        : "Metronome (Off)";
    addHeader(container, headerText);
    // DisplayController renders the view(s) added by the base constructor
    if (this.views.length === 0 && this.metronomeBpm > 0) {
      // Optional: Display a message if view creation failed (e.g., missing audio element)
      const errorMsg = document.createElement("p");
      errorMsg.textContent =
        "Metronome view could not be created (check console for errors).";
      errorMsg.style.padding = "10px";
      errorMsg.style.color = "var(--clr-danger)";
      container.appendChild(errorMsg);
    } else if (this.views.length === 0 && this.metronomeBpm <= 0) {
      const offMsg = document.createElement("p");
      offMsg.textContent = "Metronome BPM is set to 0.";
      offMsg.style.padding = "10px";
      offMsg.style.color = "var(--clr-text-subtle)";
      container.appendChild(offMsg);
    }
  }
}

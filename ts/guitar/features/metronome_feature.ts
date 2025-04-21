/* ts/guitar/features/metronome_feature.ts */

import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import { addHeader, clearAllChildren } from "../guitar_utils";
// Import the potentially updated MetronomeView
import { MetronomeView } from "../views/metronome_view";
import { View } from "../../view";

/** A simple feature that only displays a MetronomeView. */
export class MetronomeFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Metronome";
  static readonly displayName = "Metronome Only";
  static readonly description = "Displays only a metronome control/visualizer.";

  static getConfigurationSchema(): ConfigurationSchema {
    return {
      description: `Config: ${this.typeName}[,GuitarSettings]\nDisplays a metronome. BPM set via Guitar Settings.`,
      args: [
          {
              name: "Guitar Settings", type: "ellipsis", uiComponentType: "ellipsis",
              description: "Configure interval-specific guitar settings (Metronome BPM).",
              nestedSchema: [ { name: "metronomeBpm", type: "number", description: "Metronome BPM (e.g., 80, 0=off)", }, ],
          },
      ],
    };
  }

  static createFeature(
    config: ReadonlyArray<string>, // Config from editor (Guitar Settings)
    audioController: AudioController,
    settings: AppSettings,
    metronomeBpmOverride?: number, // BPM comes from Guitar Settings via editor
    maxCanvasHeight?: number // Added for consistency
  ): Feature {
    // BPM is determined by the base class constructor using metronomeBpmOverride
    // No specific config args needed for MetronomeFeature itself now
    return new MetronomeFeature(
        config, // Pass guitar settings config if any
        settings,
        metronomeBpmOverride, // Pass BPM from editor
        audioController,
        maxCanvasHeight
    );
  }

  readonly typeName = MetronomeFeature.typeName;

  constructor(
    config: ReadonlyArray<string>,
    settings: AppSettings,
    metronomeBpmOverride?: number, // Receive BPM from createFeature/editor
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    // Base constructor handles metronomeBpm assignment and checks audioController
    super(config, settings, metronomeBpmOverride, audioController, maxCanvasHeight);

    // Create MetronomeView if BPM > 0 and audioController exists
    const views: View[] = [];
    if (this.metronomeBpm > 0 && this.audioController) {
        // NOTE: Assumes audioController is now initialized with both click sounds
        views.push(new MetronomeView(this.metronomeBpm, this.audioController));
        console.log(`MetronomeFeature created MetronomeView with BPM: ${this.metronomeBpm}`);
    } else if (this.metronomeBpm <= 0) {
        console.log("MetronomeFeature: BPM is 0 or less, MetronomeView not created.");
    } else { // No audio controller
         console.warn("MetronomeFeature: Metronome requested but AudioController missing, MetronomeView not created.");
    }

    // Assign the created views
    (this as { views: ReadonlyArray<View> }).views = views;
  }

  /** Render just adds a header; DisplayController handles the MetronomeView. */
  render(container: HTMLElement): void {
    clearAllChildren(container);
    // Only show header if the view was actually created
    const headerText = this.views.length > 0 ? `Metronome @ ${this.metronomeBpm} BPM` : "Metronome (Off)";
    addHeader(container, headerText);
    // DisplayController renders the view(s) added in the constructor
  }
}
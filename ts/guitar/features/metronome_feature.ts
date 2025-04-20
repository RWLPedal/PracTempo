import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import { addHeader, clearAllChildren } from "../guitar_utils";

/** A simple feature that only displays a MetronomeView. */
export class MetronomeFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Metronome";
  static readonly displayName = "Metronome Only";
  static readonly description = "Displays only a metronome control/visualizer.";
  private static readonly DEFAULT_BPM = 80;

  static getConfigurationSchema(): ConfigurationSchema {
    return {
      description: `Config: ${this.typeName}\nDisplays a metronome set to ${this.DEFAULT_BPM} BPM.`,
      args: [], // No arguments needed
    };
  }

  static createFeature(
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings,
    metronomeBpmOverride?: number // This override is ignored by this specific feature type
  ): Feature {
    if (config.length !== 0) {
      // Log a warning but proceed, using the internal default BPM.
      console.warn(
        `MetronomeFeature received unexpected config arguments: [${config.join(
          ", "
        )}]. Ignoring them.`
      );
    }
    // Always use the internal DEFAULT_BPM for this specific feature type,
    // ignoring any metronomeBpmOverride that might have been parsed.
    return new MetronomeFeature(
      config,
      settings,
      this.DEFAULT_BPM,
      audioController
    );
  }

  readonly typeName = MetronomeFeature.typeName;

  constructor(
    config: ReadonlyArray<string>,
    settings: AppSettings,
    metronomeBpmOverride: number, // This will be the DEFAULT_BPM passed from createFeature
    audioController?: AudioController
  ) {
    // Pass the DEFAULT_BPM determined by createFeature to the base constructor.
    super(config, settings, metronomeBpmOverride, audioController);
  }

  render(container: HTMLElement): void {
    clearAllChildren(container);
    const headerText = `Metronome @ ${this.metronomeBpm} BPM`;
    addHeader(container, headerText);
    // The actual MetronomeView is handled by the base class and rendered by DisplayController
    console.log(
      `MetronomeFeature rendered. MetronomeView should be rendered by DisplayController.`
    );
  }
}

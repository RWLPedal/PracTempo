import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Fretboard } from "../fretboard";
import { AppSettings } from "../../settings";
import { AudioController } from "../../audio_controller";
import { MUSIC_NOTES, START_PX } from "../guitar_utils";

/** A guitar feature for displaying all of the notes on the fretboard. */
export class NotesFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Notes";
  static readonly displayName = "Fretboard Notes";
  static readonly description =
    "Displays all the notes on the guitar fretboard.";
  readonly typeName = NotesFeature.typeName;

  constructor(
    config: ReadonlyArray<string>,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    audioController?: AudioController
  ) {
    super(config, settings, metronomeBpmOverride, audioController);
  }

  static getConfigurationSchema(): ConfigurationSchema {
    return {
      description: `Config: ${this.typeName}[,GuitarSettings]`,
      args: [
        {
          name: "Guitar Settings",
          type: "ellipsis",
          description:
            "Configure interval-specific guitar settings (e.g., Metronome).",
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
    metronomeBpmOverride?: number
  ): Feature {
    if (config.length !== 0) {
      throw new Error(
        `Invalid config for ${
          this.typeName
        }. Expected an empty argument array, but received: [${config.join(
          ", "
        )}]`
      );
    }
    // Pass the empty config array, settings, override, and audio controller.
    return new NotesFeature(
      config,
      settings,
      metronomeBpmOverride,
      audioController
    );
  }

  render(container: HTMLElement): void {
    const { canvas, ctx } = this.clearAndAddCanvas(
      container,
      "Notes on the Fretboard"
    );
    const fretCount = 18;
    const requiredHeight =
      START_PX + fretCount * this.fretboardConfig.fretLengthPx + 65;
    canvas.height = Math.max(780, requiredHeight);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.resetTransform();
    ctx.translate(0.5, 0.5);

    const fretboard = new Fretboard(
      this.fretboardConfig,
      START_PX,
      START_PX,
      fretCount
    );
    ctx.fillStyle = "#333";
    fretboard.render(ctx);

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j <= fretboard.fretCount; j++) {
        const noteOffsetFromA =
          (this.fretboardConfig.tuning.tuning[i] + j) % 12;
        const noteName = MUSIC_NOTES[noteOffsetFromA][0];
        fretboard.renderTextLabel(
          ctx,
          j,
          i,
          noteName,
          18,
          7,
          "18px Sans-serif"
        );
      }
    }
  }
}

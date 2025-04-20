import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Fretboard } from "../fretboard";
import { Scale, scale_names, scales } from "../scales";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import {
  getKeyIndex,
  getChordTones,
  MUSIC_NOTES,
  NOTE_RADIUS_PX,
  RAINBOW_COLORS,
  START_PX,
} from "../guitar_utils";

/** Displays scale diagrams on the fretboard. */
export class ScaleFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Scale";
  static readonly displayName = "Scale Diagram";
  static readonly description =
    "Displays a specified scale on the fretboard in a given key, optionally highlighting chord tones.";

  static getConfigurationSchema(): ConfigurationSchema {
    const availableScaleNames = [
      ...new Set([...Object.keys(scales), ...Object.keys(scale_names)]),
    ];
    const availableKeys = MUSIC_NOTES.flat();
    return {
      description: `Config: ${this.typeName},ScaleName,Key[,ChordTones][,GuitarSettings]`,
      args: [
        {
          name: "ScaleName",
          type: "enum",
          required: true,
          enum: availableScaleNames,
          description: "Name of the scale.",
        },
        {
          name: "Key",
          type: "enum",
          required: true,
          enum: availableKeys,
          description: "Root note of the scale.",
        },
        {
          name: "ChordTones",
          type: "string",
          required: false,
          example: "C-E-G|G-B-D",
          description: "Optional. Chord tones to highlight.",
        },
        {
          name: "Guitar Settings",
          type: "ellipsis",
          description: "Configure interval-specific guitar settings.",
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
    // Config array should contain [ScaleName, Key, OptionalChordTones]
    // Check for minimum required arguments (ScaleName, Key)
    if (config.length < 2) {
      throw new Error(
        `Invalid config for ${
          this.typeName
        }. Expected at least [ScaleName, Key], received: [${config.join(", ")}]`
      );
    }

    const scaleNameOrAlias = config[0];
    const rootNoteName = config[1];
    const chordTonesStr = config.length > 2 ? config[2] : undefined; // ChordTones is the 3rd element if present

    // Resolve scale and key
    const scaleKey = scale_names[scaleNameOrAlias] ?? scaleNameOrAlias;
    const scale = scales[scaleKey];
    if (!scale) throw new Error(`Unknown scale: "${scaleNameOrAlias}"`);

    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1) throw new Error(`Unknown key: "${rootNoteName}"`);

    // Parse chord tones and create header
    const chordTones = getChordTones(chordTonesStr);
    const keyName = MUSIC_NOTES[keyIndex]?.[0] ?? `Note ${keyIndex}`;
    const headerText = `${scale.name} Scale, Key of ${keyName}`;

    // Pass the original arg-only config and the parsed override
    return new ScaleFeature(
      config,
      scale,
      keyIndex,
      chordTones,
      headerText,
      settings,
      metronomeBpmOverride,
      audioController
    );
  }

  readonly typeName = ScaleFeature.typeName;
  private readonly scale: Scale;
  private readonly keyIndex: number;
  private readonly chordTones: Array<Array<string>>;
  private readonly headerText: string;

  constructor(
    config: ReadonlyArray<string>,
    scale: Scale,
    keyIndex: number,
    chordTones: Array<Array<string>>,
    headerText: string,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    audioController?: AudioController
  ) {
    super(config, settings, metronomeBpmOverride, audioController);
    this.scale = scale;
    this.keyIndex = keyIndex;
    this.chordTones = chordTones;
    this.headerText = headerText;
  }

  render(container: HTMLElement): void {
    const { ctx } = this.clearAndAddCanvas(container, this.headerText);
    // Determine number of diagrams and adjust canvas height if necessary
    const numDiagrams = this.chordTones.length > 0 ? this.chordTones.length : 1;
    // Simplified height calculation for now, assumes single row
    const requiredHeight =
      START_PX + 18 * this.fretboardConfig.fretLengthPx + 65;
    const requiredWidth =
      START_PX +
      numDiagrams * (this.fretboardConfig.stringSpacingPx * 5 + 40) +
      START_PX; // Estimate width
    const canvas = ctx.canvas;
    canvas.height = Math.max(780, requiredHeight);
    canvas.width = Math.max(780, requiredWidth);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.resetTransform();
    ctx.translate(0.5, 0.5);

    if (this.chordTones.length > 0) {
      this.chordTones.forEach((tones, i) =>
        this.drawScale(ctx, this.scale, this.keyIndex, i, tones)
      );
    } else {
      this.drawScale(ctx, this.scale, this.keyIndex, 0, []);
    }
  }
  private drawScale(
    ctx: CanvasRenderingContext2D,
    scale: Scale,
    keyOffset: number,
    diagramIndex: number,
    chordTones: Array<string>
  ): void {
    const fretCount = 12;
    const diagramSpacing = this.fretboardConfig.stringSpacingPx * 5 + 40;
    const startX = START_PX + diagramIndex * diagramSpacing;
    const startY = START_PX;

    if (chordTones.length > 0) {
      ctx.font = "16px Sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "#555";
      ctx.fillText(
        chordTones.join("/"),
        startX,
        startY - this.fretboardConfig.fretLengthPx / 2
      );
    }

    const fretboard = new Fretboard(
      this.fretboardConfig,
      startX,
      startY,
      fretCount
    );
    fretboard.render(ctx);

    const theme = RAINBOW_COLORS;
    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      for (let fretIndex = 0; fretIndex <= fretCount; fretIndex++) {
        let noteOffsetFromA =
          (this.fretboardConfig.tuning.tuning[stringIndex] + fretIndex) % 12;
        let noteRelativeToKey = (noteOffsetFromA - keyOffset + 12) % 12;

        if (scale.degrees.includes(noteRelativeToKey)) {
          const noteName = MUSIC_NOTES[noteOffsetFromA][0];
          const isRoot = noteRelativeToKey === 0;
          const isChordTone = chordTones.includes(noteName);
          let bgColor = isChordTone
            ? "#a468d1"
            : isRoot
            ? theme[0].color
            : theme["default"].color;
          const fgColor = fretIndex > 0 ? "#eee" : "#333";
          fretboard.renderFingering(
            ctx,
            fretIndex,
            stringIndex,
            noteName,
            NOTE_RADIUS_PX,
            16,
            bgColor,
            fgColor,
            false
          );
        }
      }
    }
  }
}

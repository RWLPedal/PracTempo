/* ts/guitar/features/scale_feature.ts */

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
  START_PX,
  getIntervalLabel,
} from "../guitar_utils"; // Removed unused NOTE_RADIUS_PX

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
            // Color scheme is handled globally via AppSettings
          ],
        },
      ],
    };
  }

  static createFeature(
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings, // Receive full AppSettings
    metronomeBpmOverride?: number,
    maxCanvasHeight?: number // Add maxCanvasHeight parameter
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

    // Pass the original arg-only config, full settings, override, and maxCanvasHeight
    return new ScaleFeature(
      config,
      scale,
      keyIndex,
      chordTones,
      headerText,
      settings, // Pass full settings
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight // Pass maxCanvasHeight to constructor
    );
  }

  readonly typeName = ScaleFeature.typeName;
  private readonly scale: Scale;
  private readonly keyIndex: number;
  private readonly chordTones: Array<Array<string>>;
  private readonly headerText: string;
  // settings and fretboardConfig are inherited from GuitarFeature base class

  constructor(
    config: ReadonlyArray<string>,
    scale: Scale,
    keyIndex: number,
    chordTones: Array<Array<string>>,
    headerText: string,
    settings: AppSettings, // Accept full settings
    metronomeBpmOverride?: number,
    audioController?: AudioController,
    maxCanvasHeight?: number // Add maxCanvasHeight parameter
  ) {
    // Pass settings and maxCanvasHeight up to base class constructor
    super(
      config,
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
    this.scale = scale;
    this.keyIndex = keyIndex;
    this.chordTones = chordTones;
    this.headerText = headerText;
    // this.fretboardConfig is now set in the base constructor using settings
  }

  render(container: HTMLElement): void {
    const { canvas, ctx } = this.clearAndAddCanvas(container, this.headerText);
    const fretCount = 18;
    const config = this.fretboardConfig;
    const scaleFactor = config.scaleFactor;
    const scaledNoteRadius = config.noteRadiusPx;
    const scaledFretLength = config.fretLengthPx;

    const numDiagrams = this.chordTones.length > 0 ? this.chordTones.length : 1;
    const hasTitles = this.chordTones.length > 0;

    // --- Refined Height & Position Calculation ---
    const topPadding = START_PX * scaleFactor;
    const openNoteClearance = scaledNoteRadius * 1.5 + (5 * scaleFactor);
    const titleSpace = hasTitles ? (30 * scaleFactor) : 0;
    // Total space needed above the nut line (including title and open notes)
    const totalTopSpace = Math.max(topPadding + titleSpace, openNoteClearance);

    const fretboardLinesHeight = fretCount * scaledFretLength;
    const bottomClearance = scaledNoteRadius + (5 * scaleFactor);
    const bottomPadding = 65 * scaleFactor;
    const requiredHeight = totalTopSpace + fretboardLinesHeight + bottomClearance + bottomPadding;

    // --- Width Calculation ---
    const horizontalSpacing = 40 * scaleFactor;
    const diagramWidth = 5 * config.stringSpacingPx;
    const requiredWidth =
        START_PX * scaleFactor * 2 + numDiagrams * diagramWidth + Math.max(0, numDiagrams - 1) * horizontalSpacing;

    canvas.height = requiredHeight;
    canvas.width = Math.max(780, requiredWidth);

    // --- Rendering ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.resetTransform();
    ctx.translate(0.5, 0.5);

    // The top Y coordinate passed to drawScale is the basic top padding
    const diagramTopY = topPadding;

    if (this.chordTones.length > 0) {
      this.chordTones.forEach((tones, i) =>
        this.drawScale(
            ctx, this.scale, this.keyIndex, i, tones,
            diagramTopY, // Pass basic top padding
            totalTopSpace, // Pass calculated total needed above nut
            numDiagrams, diagramWidth, horizontalSpacing
            )
      );
    } else {
      this.drawScale(
          ctx, this.scale, this.keyIndex, 0, [],
          diagramTopY, totalTopSpace,
          numDiagrams, diagramWidth, horizontalSpacing
          );
    }
  }

  private drawScale(
    ctx: CanvasRenderingContext2D,
    scale: Scale,
    keyOffset: number,
    diagramIndex: number,
    chordTones: Array<string>,
    diagramTopY: number, // Absolute top Y for this diagram block (starts with padding)
    totalTopSpace: number, // Total space calculated above nut (incl title, open notes)
    numDiagrams: number,
    diagramWidth: number,
    horizontalSpacing: number
  ): void {
    const fretCount = 18;
    const config = this.fretboardConfig;
    const scaleFactor = config.scaleFactor;
    const scaledNoteRadius = config.noteRadiusPx;
    const fontSize = 16 * scaleFactor;

    const startX = START_PX * scaleFactor + diagramIndex * (diagramWidth + horizontalSpacing);

    // --- Draw Title (Chord Tones) ---
    if (chordTones.length > 0) {
       // Position title Y within the *overall* top space allocated
      const titleY = diagramTopY + (30 * scaleFactor) / 2; // Center roughly in title space
      ctx.font = `${fontSize}px Sans-serif`;
      ctx.textAlign = "left";
      ctx.fillStyle = "#555";
      ctx.fillText(chordTones.join("/"), startX, titleY);
    }

    // --- Draw Fretboard ---
    // Fretboard constructor receives the absolute top Y for its drawing area
    const fretboard = new Fretboard(
      config,
      startX,
      diagramTopY, // Pass the absolute top Y for this diagram block
      fretCount
    );
    // Fretboard.render internally calculates nut position based on diagramTopY + clearance
    fretboard.render(ctx);

    // --- Draw Notes ---
    // (Loop and renderFingering call remain the same as NotesFeature)
     for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
       for (let fretIndex = 0; fretIndex <= fretCount; fretIndex++) {
         const noteOffsetFromA = (config.tuning.tuning[stringIndex] + fretIndex) % 12;
         const noteRelativeToKey = (noteOffsetFromA - keyOffset + 12) % 12;

         if (scale.degrees.includes(noteRelativeToKey)) {
           const noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
           const intervalLabel = getIntervalLabel(noteRelativeToKey);
           const displayLabel = noteName;

           fretboard.renderFingering(
             ctx, fretIndex, stringIndex, noteName, intervalLabel, displayLabel,
             scaledNoteRadius, fontSize, false,
             "black", 1, undefined, config.colorScheme
           );
         }
       }
     }
  }
}

import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Chord, chord_library } from "../chords";
import { Fretboard } from "../fretboard";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import {
  START_PX,
  CANVAS_SUBTITLE_HEIGHT_PX,
  CANVAS_SUBTITLE_FONT,
  NOTE_RADIUS_PX,
  OPEN_NOTE_RADIUS_FACTOR,
} from "../guitar_utils";

/** A feature for displaying mulitple chord diagrams and a metronome. */
export class ChordFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Chord";
  static readonly displayName = "Chord Diagram";
  static readonly description = "Displays one or more chord diagrams.";
  readonly typeName = ChordFeature.typeName;
  private readonly chords: ReadonlyArray<Chord>;
  private readonly headerText: string;

  constructor(
    config: ReadonlyArray<string>,
    chords: ReadonlyArray<Chord>,
    headerText: string,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    audioController?: AudioController
  ) {
    super(config, settings, metronomeBpmOverride, audioController);
    this.chords = chords;
    this.headerText = headerText;
  }

  static getConfigurationSchema(): ConfigurationSchema {
    const availableChordNames = Object.keys(chord_library);
    return {
      description: `Config: ${this.typeName},ChordName1[,ChordName2,...][,GuitarSettings]`,
      args: [
        {
          name: "ChordNames",
          type: "enum",
          required: true,
          enum: availableChordNames,
          description: "One or more chord names.",
          isVariadic: true,
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
    // Config contains ONLY the ChordNames (one or more)
    if (config.length < 1) {
      throw new Error(
        `Invalid config for ${
          this.typeName
        }. Expected at least one ChordName, received: [${config.join(", ")}]`
      );
    }

    const chordKeys = config; // All elements are chord keys
    const chords: Chord[] = [];
    const validChordNames: string[] = [];

    chordKeys.forEach((chordKey) => {
      const chord = chord_library[chordKey];
      if (chord) {
        chords.push(chord);
        validChordNames.push(chord.name);
      } else {
        console.warn(`Unknown chord key: "${chordKey}". Skipping.`);
      }
    });

    if (chords.length === 0)
      throw new Error(`No valid chords found in config: ${config.join(",")}`);

    const headerText =
      validChordNames.length > 1
        ? validChordNames.join(" & ") + " Chords"
        : validChordNames[0] + " Chord";

    return new ChordFeature(
      config,
      chords,
      headerText,
      settings,
      metronomeBpmOverride,
      audioController
    );
  }

  render(container: HTMLElement): void {
    const { canvas, ctx } = this.clearAndAddCanvas(container, this.headerText);
    const numRows = Math.ceil(this.chords.length / 2);
    const requiredHeight =
      START_PX +
      numRows *
        (5 * this.fretboardConfig.fretLengthPx +
          CANVAS_SUBTITLE_HEIGHT_PX +
          NOTE_RADIUS_PX * 3 +
          130) + 65;
    canvas.height = Math.max(780, requiredHeight);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.resetTransform();
    ctx.translate(0.5, 0.5);
    this.chords.forEach((chord, i) => this.drawChord(canvas, ctx, chord, i));
  }

  private drawChord(
    canvasEl: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    chord: Chord,
    index: number
  ): void {
    const fretCount = 5;
    const fontSize = 16;
    const chordsPerRow = 2;
    const colIndex = index % chordsPerRow;
    const rowIndex = Math.floor(index / chordsPerRow);
    const diagramWidth =
      this.fretboardConfig.stringSpacingPx * 5 + NOTE_RADIUS_PX * 2;
    const horizontalSpacing = 52;
    const verticalSpacing = 130;
    const fullDiagramHeight =
      fretCount * this.fretboardConfig.fretLengthPx +
      CANVAS_SUBTITLE_HEIGHT_PX +
      NOTE_RADIUS_PX * 3;
    const leftPos = START_PX + colIndex * (diagramWidth + horizontalSpacing);
    const topPos =
      START_PX +
      rowIndex * (fullDiagramHeight + verticalSpacing) +
      CANVAS_SUBTITLE_HEIGHT_PX;

    ctx.font = CANVAS_SUBTITLE_FONT;
    ctx.fillStyle = "#444";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(chord.name, leftPos, topPos - CANVAS_SUBTITLE_HEIGHT_PX * 0.5);

    let startFret = 0;
    let minFret = fretCount + 1;
    let maxFret = 0;
    chord.strings.forEach((fret) => {
      if (fret > 0) {
        minFret = Math.min(minFret, fret);
        maxFret = Math.max(maxFret, fret);
      }
    });
    // Determine if the chord is played higher up the neck
    if (minFret > 3 && maxFret - minFret < fretCount) {
      startFret = minFret - 1;
    }

    const fretboard = new Fretboard(
      this.fretboardConfig,
      leftPos,
      topPos,
      fretCount
    );
    fretboard.render(ctx);

    // Display starting fret number if not starting at the nut
    if (startFret > 0) {
      ctx.font = "16px Sans-serif";
      ctx.fillStyle = "#666";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `${startFret + 1}`,
        leftPos - 10,
        topPos + this.fretboardConfig.fretLengthPx * 0.8
      );
    }

    ctx.font = fontSize + "px Sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (
      let stringIndex = 0;
      stringIndex < chord.strings.length;
      stringIndex++
    ) {
      const fret = chord.strings[stringIndex];
      const finger = chord.fingers[stringIndex];
      const displayFret = fret - startFret; // Adjust fret based on starting position

      // Only draw if the fret is within the visible range (or muted/open)
      if (fret === -1 || (displayFret >= 0 && displayFret <= fretCount)) {
        const fingerLabel = finger > 0 ? `${finger}` : "";
        const isMuted = fret === -1;
        const isOpen = fret === 0;
        let noteColor = "#333";
        let bgColor = "#555";
        let strokeColor = "#888";
        let lineWidth = 1;
        let radiusOverride: number | undefined = undefined;

        if (isOpen) {
          bgColor = "transparent";
          noteColor = "#666";
          strokeColor = "#aaa";
          radiusOverride = NOTE_RADIUS_PX * OPEN_NOTE_RADIUS_FACTOR;
        } else if (!isMuted) {
          noteColor = "#eee"; // Light text for filled notes
        }

        if (!isMuted) {
          fretboard.renderFingering(
            ctx,
            displayFret,
            stringIndex,
            fingerLabel,
            NOTE_RADIUS_PX,
            fontSize,
            bgColor,
            noteColor,
            false, // drawStar
            strokeColor,
            lineWidth,
            radiusOverride
          );
        } else {
          // Draw 'X' for muted string
          const visualIndex =
            this.fretboardConfig.handedness === "left"
              ? 5 - stringIndex
              : stringIndex;
          fretboard.drawMutedString(ctx, visualIndex, NOTE_RADIUS_PX);
        }
      } else if (fret > 0) {
        // Log if a defined fret is outside the calculated display range
        console.warn(`Chord ${chord.name} fret ${fret} outside range`);
      }
    }
  }
}

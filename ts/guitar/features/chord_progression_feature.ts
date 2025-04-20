/* ts/guitar/features/chord_progression_feature.ts */

import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
  ConfigurationSchemaArg, // Import ConfigurationSchemaArg
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Chord, chord_library } from "../chords";
import { Fretboard } from "../fretboard";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import {
  START_PX,
  NOTE_RADIUS_PX,
  OPEN_NOTE_RADIUS_FACTOR,
  MUSIC_NOTES,
  getKeyIndex,
  getIntervalLabel,
  addHeader, // No longer needed if base class handles header?
  clearAllChildren,
  CANVAS_SUBTITLE_HEIGHT_PX, // No longer needed if base class handles clear?
} from "../guitar_utils";
import { getChordInKey } from "../progressions";
import { MetronomeView } from "../views/metronome_view";
import { FretboardColorScheme } from "../colors";

/** Displays chord diagrams for a Roman numeral progression in a given key. */
export class ChordProgressionFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Chord Progression";
  static readonly displayName = "Chord Progression";
  static readonly description =
    "Displays chord diagrams for a Roman numeral progression (e.g., I-IV-V) in a specified key.";

  readonly typeName = ChordProgressionFeature.typeName;
  private readonly rootNoteName: string;
  private readonly progression: string[]; // Array of Roman numerals
  private readonly headerText: string;

  constructor(
    config: ReadonlyArray<string>, // Config now contains [RootNote, Numeral1, Numeral2,...]
    rootNoteName: string,
    progression: string[],
    headerText: string,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    audioController?: AudioController,
    maxCanvasHeight?: number // Add maxCanvasHeight
  ) {
    // Pass the modified config (RootNote + Numerals) and maxCanvasHeight to base
    super(
      config,
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
    this.rootNoteName = rootNoteName;
    this.progression = progression;
    this.headerText = headerText;
  }

  static getConfigurationSchema(): ConfigurationSchema {
    const availableKeys = MUSIC_NOTES.flat();
    // Define the button labels for the custom UI component
    const progressionButtonLabels = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

    const schemaArgs: ConfigurationSchemaArg[] = [
      {
        name: "RootNote",
        type: "enum", // Data type
        required: true,
        enum: availableKeys,
        description: "Root note (key) of the progression.",
        // Default UI component (select dropdown) will be used based on 'enum' type
      },
      {
        name: "Progression",
        type: "string", // Underlying data is string (parsed/generated as hyphenated)
        required: true,
        // Specify the custom UI component and provide necessary data
        uiComponentType: "toggle_button_selector",
        uiComponentData: {
          buttonLabels: progressionButtonLabels,
        },
        // This is conceptually variadic in terms of data extraction/creation,
        // even though the UI is custom. Keep true for parsing logic consistency.
        isVariadic: true,
        // Example shows the format used by text parser/generator
        example: "I-vi-IV-V",
        description:
          "Build the progression sequence using the Roman numeral buttons.",
      },
      {
        name: "Guitar Settings",
        type: "ellipsis",
        uiComponentType: "ellipsis", // Explicitly state UI type
        description: "Configure interval-specific guitar settings.",
        nestedSchema: [
          {
            name: "metronomeBpm",
            type: "number",
            description: "Metronome BPM (0=off)",
          },
          // Color scheme is handled globally
        ],
      },
    ];

    return {
      description: `Config: ${this.typeName},RootNote,ProgressionSequence...[,GuitarSettings]`,
      args: schemaArgs,
    };
  }

  static createFeature(
    config: ReadonlyArray<string>, // Expects [RootNote, Numeral1, Numeral2, ...]
    audioController: AudioController,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    maxCanvasHeight?: number // Add maxCanvasHeight
  ): Feature {
    // Config: [RootNote, Numeral1, Numeral2, ...]
    if (config.length < 2) {
      // Need at least RootNote and one Numeral
      throw new Error(
        `Invalid config for ${
          this.typeName
        }. Expected [RootNote, Numeral1, ...], received: [${config.join(", ")}]`
      );
    }

    const rootNoteName = config[0];
    // The rest of the config array elements are the progression numerals
    const progressionNumerals = config.slice(1);

    // --- Validation ---
    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1) throw new Error(`Unknown key: "${rootNoteName}"`);
    const validRootName = MUSIC_NOTES[keyIndex]?.[0] ?? rootNoteName;

    if (progressionNumerals.length === 0) {
      throw new Error(`Progression cannot be empty.`);
    }
    // TODO: Optionally validate each numeral against MAJOR_KEY_ROMAN_MAP keys?

    const headerText = `${progressionNumerals.join(
      "-"
    )} Progression in ${validRootName}`;

    // Pass the original config array, validated data, and maxCanvasHeight
    return new ChordProgressionFeature(
      config,
      validRootName,
      progressionNumerals,
      headerText,
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight // Pass height to constructor
    );
  }

  render(container: HTMLElement): void {
    // --- Initial Setup & Clear ---
    const { canvas, ctx } = this.clearAndAddCanvas(container, this.headerText);
    const config = this.fretboardConfig;
    const scaleFactor = config.scaleFactor;
    const scaledStartPx = START_PX * scaleFactor;

    // --- Get Chords ---
    const rootNoteIndex = getKeyIndex(this.rootNoteName);
    if (rootNoteIndex === -1) {
      /* ... error handling ... */ return;
    }

    const progressionChords = this.progression.map((numeral) => ({
      numeral: numeral,
      details: getChordInKey(rootNoteIndex, numeral),
    }));

    const chordsToDraw = progressionChords
      .map((item) => ({
        numeral: item.numeral,
        chordName: item.details.chordName,
        chordData: item.details.chordKey
          ? chord_library[item.details.chordKey]
          : null,
      }))
      .filter((item) => item.chordData !== null);

    const numChords = chordsToDraw.length;
    if (numChords === 0) {
      /* ... handle no chords found ... */ return;
    }

    // --- Dynamic Layout Calculation (same as ChordFeature) ---
    const availableWidth = Math.max(
      300,
      container.clientWidth - scaledStartPx * 2
    );
    const fretCount = 5; // Standard chord diagram fret count
    const scaledNoteRadius = config.noteRadiusPx;
    const diagramContentWidth =
      config.stringSpacingPx * 5 + scaledNoteRadius * 2;
    const diagramContentHeight =
      fretCount * config.fretLengthPx + scaledNoteRadius * 3;
    const titleHeight = CANVAS_SUBTITLE_HEIGHT_PX * scaleFactor;
    const horizontalSpacing = Math.max(20 * scaleFactor, 80 * scaleFactor);
    const verticalSpacing = Math.max(30 * scaleFactor, 100 * scaleFactor);
    const fullDiagramWidth = diagramContentWidth + horizontalSpacing;
    const fullDiagramHeight =
      diagramContentHeight + titleHeight + verticalSpacing;

    const chordsPerRow = Math.max(
      1,
      Math.floor(availableWidth / fullDiagramWidth)
    );
    const numRows = Math.ceil(numChords / chordsPerRow);

    const requiredWidth =
      chordsPerRow * fullDiagramWidth - horizontalSpacing + scaledStartPx * 2;
    let requiredHeight = scaledStartPx;
    requiredHeight += numRows * fullDiagramHeight;
    requiredHeight -= verticalSpacing;
    requiredHeight += 65 * scaleFactor;

    const metronomeView = this.views.find(
      (view) => view instanceof MetronomeView
    );
    const METRONOME_ESTIMATED_HEIGHT = 120;
    if (metronomeView) {
      requiredHeight += METRONOME_ESTIMATED_HEIGHT * scaleFactor;
    }

    canvas.width = Math.max(350, requiredWidth);
    canvas.height = Math.max(300, requiredHeight);

    console.log(
      `[ChordProgression Render] AvailableW: ${availableWidth.toFixed(
        0
      )}, DiagramW: ${diagramContentWidth.toFixed(
        0
      )}, HSpacing: ${horizontalSpacing.toFixed(
        0
      )}, ChordsPerRow: ${chordsPerRow}, NumRows: ${numRows}, CanvasW: ${
        canvas.width
      }, CanvasH: ${canvas.height}`
    );

    // --- Clear & Translate ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.resetTransform();
    ctx.translate(0.5, 0.5);

    // --- Draw each chord ---
    chordsToDraw.forEach((item, i) => {
      if (!item.chordData) return;
      const title = `${item.chordName} (${item.numeral})`; // Include numeral in title
      // Pass the dynamically calculated chordsPerRow and fretCount
      this.drawSingleChordDiagram(
        canvas,
        ctx,
        item.chordData,
        title,
        i,
        chordsPerRow,
        numRows,
        fretCount // Pass fret count
      );
    });

    // MetronomeView renders via DisplayController
  }

  /** Draws a single chord diagram (Same logic as in ChordFeature) */
  private drawSingleChordDiagram(
    canvasEl: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    chord: Chord,
    title: string, // Title now includes numeral
    index: number,
    chordsPerRow: number,
    numRows: number,
    fretCount: number = 5 // Default to 5 frets
  ): void {
    const config = this.fretboardConfig;
    const scaleFactor = config.scaleFactor;
    const fontSize = 16 * scaleFactor;
    const titleFontSize = 18 * scaleFactor;
    const sideFretFontSize = 16 * scaleFactor;
    const scaledNoteRadius = config.noteRadiusPx;
    const scaledStartPx = START_PX * scaleFactor;

    // --- Layout Calculations ---
    const colIndex = index % chordsPerRow;
    const rowIndex = Math.floor(index / chordsPerRow);
    const diagramContentWidth =
      config.stringSpacingPx * 5 + scaledNoteRadius * 2;
    const diagramContentHeight =
      fretCount * config.fretLengthPx + scaledNoteRadius * 3;
    const titleHeight = CANVAS_SUBTITLE_HEIGHT_PX * scaleFactor;
    const horizontalSpacing = Math.max(20 * scaleFactor, 80 * scaleFactor);
    const verticalSpacing = Math.max(30 * scaleFactor, 100 * scaleFactor);
    const fullDiagramWidth = diagramContentWidth + horizontalSpacing;
    const fullDiagramHeight =
      diagramContentHeight + titleHeight + verticalSpacing;
    const leftPos = scaledStartPx + colIndex * fullDiagramWidth;
    const topPosDiagramContent =
      scaledStartPx + rowIndex * fullDiagramHeight + titleHeight;
    const openNoteClearance = scaledNoteRadius * 1.5 + 5 * scaleFactor;
    const absoluteNutLineY = topPosDiagramContent + openNoteClearance;

    // --- Draw Title ---
    ctx.font = `${titleFontSize}px Sans-serif`;
    ctx.fillStyle = "#444";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const titleX = leftPos + diagramContentWidth / 2;
    const titleY = topPosDiagramContent - titleHeight / 2;
    ctx.fillText(title, titleX, titleY);

    // --- Fretboard and Notes ---
    // ** Calculate startFret based on furthest fretted note **
    let minFret = fretCount + 1;
    let maxFret = 0;
    chord.strings.forEach((fret) => {
      if (fret > 0) {
        minFret = Math.min(minFret, fret);
        maxFret = Math.max(maxFret, fret);
      }
    });
    let startFret = 0;
    if (maxFret > 3) {
      if (minFret > 0 && maxFret - minFret < fretCount) {
        startFret = minFret - 1;
      }
    }
    console.log(
      `[DEBUG Prog] Chord: ${chord.name}, MaxFret: ${maxFret}, MinFret: ${minFret}, Calculated StartFret: ${startFret}`
    );

    const fretboard = new Fretboard(
      config,
      leftPos,
      topPosDiagramContent,
      fretCount
    );
    fretboard.render(ctx);

    // --- Starting Fret Number ---
    if (startFret > 0) {
      ctx.font = `${sideFretFontSize}px Sans-serif`;
      ctx.fillStyle = "#666";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const sideNumberX = leftPos - 10 * scaleFactor;
      const sideNumberY = absoluteNutLineY + 0.5 * config.fretLengthPx;
      ctx.fillText(`${startFret + 1}`, sideNumberX, sideNumberY);
    }

    // --- Draw Fingerings/Notes ---
    const chordRootName = this.getChordRootNote(chord.name);
    const chordRootIndex = chordRootName ? getKeyIndex(chordRootName) : -1;
    ctx.font = `${fontSize}px Sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (
      let stringIndex = 0;
      stringIndex < chord.strings.length;
      stringIndex++
    ) {
      if (stringIndex >= config.tuning.tuning.length) continue;
      const fret = chord.strings[stringIndex]; // Actual fret number
      const finger = chord.fingers[stringIndex];

      const fingerLabel = finger > 0 ? `${finger}` : "";
      const isMuted = fret === -1;
      const isOpen = fret === 0;
      let noteName = "?";
      let intervalLabel = "?";
      let radiusOverride: number | undefined = undefined;

      if (!isMuted) {
        const noteOffsetFromA = (config.tuning.tuning[stringIndex] + fret) % 12;
        noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
        if (chordRootIndex !== -1) {
          const noteRelativeToKey =
            (noteOffsetFromA - chordRootIndex + 12) % 12;
          intervalLabel = getIntervalLabel(noteRelativeToKey);
        }
        if (isOpen) {
          radiusOverride = scaledNoteRadius * OPEN_NOTE_RADIUS_FACTOR;
        }
      }

      // **Call renderFingering for ALL strings**
      fretboard.renderFingering(
        ctx,
        fret, // Pass actual fret value
        stringIndex,
        noteName,
        intervalLabel,
        fingerLabel,
        scaledNoteRadius,
        fontSize,
        false, // drawStar
        "black", // strokeColor
        1, // lineWidth
        radiusOverride,
        config.colorScheme // Use global scheme
      );
    } // End string loop
  } // End drawSingleChordDiagram

  /** Helper to get chord root note - adapted from ChordFeature */
  private getChordRootNote(chordName: string): string | null {
    if (!chordName) return null;
    const match = chordName.match(/^([A-G])([#b]?)/);
    if (match) {
      const rootName = `${match[1]}${match[2] || ""}`;
      if (getKeyIndex(rootName) !== -1) return rootName;
    }
    // Fallback for keys like "Fsharp_MINOR" potentially stored in chord_library
    const keyMatch = Object.keys(chord_library).find(
      (key) => chord_library[key].name === chordName
    );
    if (keyMatch) {
      const underscoreIndex = keyMatch.indexOf("_");
      if (underscoreIndex > 0) {
        const potentialRoot = keyMatch
          .substring(0, underscoreIndex)
          .replace("sharp", "#");
        if (getKeyIndex(potentialRoot) !== -1) return potentialRoot;
      }
    }
    console.warn(`Could not determine root note for chord name: ${chordName}`);
    return null;
  }
}

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
  clearAllChildren, // No longer needed if base class handles clear?
} from "../guitar_utils";
import { getChordInKey } from "../progressions";

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

  // --- Rendering Logic ---
  render(container: HTMLElement): void {
    const { canvas, ctx } = this.clearAndAddCanvas(container, this.headerText);

    const rootNoteIndex = getKeyIndex(this.rootNoteName);
    if (rootNoteIndex === -1) {
      ctx.fillStyle = "#CC0000";
      ctx.font = "18px Sans-serif"; // Consider scaling font
      ctx.fillText(
        `Error: Invalid root note "${this.rootNoteName}"`,
        20,
        START_PX + 20
      );
      return;
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
      .filter((item) => item.chordData !== null); // Filter out chords not found in library

    if (chordsToDraw.length === 0) {
      ctx.fillStyle = "#888";
      ctx.font = "16px Sans-serif"; // Consider scaling font
      ctx.fillText(
        `No chord diagrams found for progression: ${this.progression.join(
          "-"
        )}`,
        canvas.width / 2,
        START_PX + 50
      );
      ctx.textAlign = "center";
      console.warn(
        "Progression Feature: No valid chords found in library for:",
        progressionChords
      );
      return;
    }

    // --- Layout Logic ---
    const numChords = chordsToDraw.length;
    const chordsPerRow = Math.min(4, numChords > 2 ? 4 : numChords);
    const numRows = Math.ceil(numChords / chordsPerRow);

    // Use SCALED values from fretboardConfig
    const diagramHeight =
      5 * this.fretboardConfig.fretLengthPx +
      this.fretboardConfig.noteRadiusPx * 3;
    const titleHeight = 50 * this.fretboardConfig.scaleFactor; // Scale title space
    const verticalSpacing = 80 * this.fretboardConfig.scaleFactor; // Scale vertical space
    const horizontalSpacing = 80 * this.fretboardConfig.scaleFactor; // Scale horizontal space
    const diagramWidth =
      this.fretboardConfig.stringSpacingPx * 5 +
      this.fretboardConfig.noteRadiusPx * 2;

    const requiredHeight =
      START_PX * this.fretboardConfig.scaleFactor +
      numRows * (diagramHeight + titleHeight + verticalSpacing) +
      65 * this.fretboardConfig.scaleFactor; // Scale padding

    canvas.height = Math.max(780, requiredHeight);
    canvas.width = Math.max(
      780,
      (diagramWidth + horizontalSpacing) * chordsPerRow +
        START_PX * this.fretboardConfig.scaleFactor * 2 // Scale side padding
    );

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.resetTransform();
    ctx.translate(0.5, 0.5);

    // --- Draw each chord ---
    chordsToDraw.forEach((item, i) => {
      if (!item.chordData) return;

      const title = `${item.chordName} (${item.numeral})`;
      this.drawSingleChordDiagram(
        canvas,
        ctx,
        item.chordData,
        title,
        i,
        chordsPerRow,
        numRows
      );
    });
  }

  private drawSingleChordDiagram(
    canvasEl: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    chord: Chord,
    title: string,
    index: number,
    chordsPerRow: number,
    numRows: number
): void {
  const fretCount = 5; // Number of frets to display for chord diagrams
  const config = this.fretboardConfig;
  const scaleFactor = config.scaleFactor;
  const fontSize = 16 * scaleFactor;
  const titleFontSize = 18 * scaleFactor;
  const sideFretFontSize = 16 * scaleFactor;
  const scaledNoteRadius = config.noteRadiusPx;

  // --- Layout Calculations (Scaled) ---
  // ... (layout calculations remain the same) ...
  const colIndex = index % chordsPerRow;
  const rowIndex = Math.floor(index / chordsPerRow);
  const diagramWidth = config.stringSpacingPx * 5 + scaledNoteRadius * 2;
  const horizontalSpacing = 80 * scaleFactor;
  const verticalSpacing = 80 * scaleFactor;
  const titleHeight = 50 * scaleFactor;
  const diagramContentHeight = fretCount * config.fretLengthPx + scaledNoteRadius * 3;
  const fullBlockHeight = diagramContentHeight + titleHeight + verticalSpacing;
  const leftPos = START_PX * scaleFactor + colIndex * (diagramWidth + horizontalSpacing);
  const topPosDiagram = START_PX * scaleFactor + rowIndex * fullBlockHeight + titleHeight;
  const topPosTitle = topPosDiagram - titleHeight + (titleHeight - titleFontSize) / 2;


  // --- Calculate Nut Line Y Position ---
  const openNoteClearance = scaledNoteRadius * 1.5 + (5 * scaleFactor);
  const nutLineY = topPosDiagram + openNoteClearance;

  // --- Draw Title ---
  // ... (title drawing logic remains the same) ...
   ctx.font = `${titleFontSize}px Sans-serif`;
   ctx.fillStyle = "#333";
   ctx.textAlign = "center";
   ctx.textBaseline = "bottom";
   const titleX = leftPos + diagramWidth / 2;
   const titleY = topPosDiagram - (15 * scaleFactor);
   ctx.fillText(title, titleX, titleY);


  // --- Fretboard and Notes Logic ---
  let startFret = 0;
  // *** FIX: Define minFret and maxFret ***
  let minFret = fretCount + 1;
  let maxFret = 0;
  // *** END FIX ***
  chord.strings.forEach((fret) => {
    if (fret > 0) {
      minFret = Math.min(minFret, fret);
      maxFret = Math.max(maxFret, fret);
    }
  });
   // Adjust starting fret if chord is played higher up
  if (minFret > 3 && maxFret - minFret < fretCount) {
    startFret = minFret - 1;
  }

  const fretboard = new Fretboard(
    config,
    leftPos,
    topPosDiagram, // Pass absolute top edge Y
    fretCount
  );
  fretboard.render(ctx);

  // --- Display starting fret number (Scaled) ---
  if (startFret > 0) {
    ctx.font = `${sideFretFontSize}px Sans-serif`;
    ctx.fillStyle = "#666";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `${startFret + 1}`,
      leftPos - 10 * scaleFactor,
      nutLineY + (0.5 * config.fretLengthPx) // Position relative to nutLineY
    );
  }

  // ... (rest of the note/fingering loop remains the same) ...
   const chordRootName = this.getChordRootNote(chord.name);
   const chordRootIndex = chordRootName ? getKeyIndex(chordRootName) : -1;

   ctx.font = fontSize + "px Sans-serif";
   ctx.textAlign = "center";
   ctx.textBaseline = "middle";

   for (let stringIndex = 0; stringIndex < chord.strings.length; stringIndex++) {
     const fret = chord.strings[stringIndex];
     const finger = chord.fingers[stringIndex];
     const displayFret = fret - startFret; // Calculate display fret relative to startFret

     if (fret === -1 || (displayFret >= 0 && displayFret <= fretCount)) {
         // ... (logic for drawing non-muted or muted string markers) ...
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
             const noteRelativeToKey = (noteOffsetFromA - chordRootIndex + 12) % 12;
             intervalLabel = getIntervalLabel(noteRelativeToKey);
           }
           if (isOpen) {
               radiusOverride = scaledNoteRadius * OPEN_NOTE_RADIUS_FACTOR;
           }
         }

         if (!isMuted) {
           // Pass displayFret to renderFingering
           fretboard.renderFingering(
             ctx, displayFret, stringIndex, noteName, intervalLabel, fingerLabel,
             scaledNoteRadius, fontSize, false, "black", 1, radiusOverride, config.colorScheme
           );
         } else { // Fret is -1 (muted)
           const visualIndex = config.handedness === "left" ? 5 - stringIndex : stringIndex;
           // Pass calculated nutLineY to drawMutedString
           fretboard.drawMutedString(ctx, visualIndex, scaledNoteRadius, nutLineY);
         }

     } else if (fret > 0) {
        console.warn(`Progression Chord ${chord.name} fret ${fret} on string ${stringIndex} outside display range (startFret: ${startFret})`);
     }
   }
}

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

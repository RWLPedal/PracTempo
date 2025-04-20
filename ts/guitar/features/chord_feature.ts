/* ts/guitar/features/chord_feature.ts */

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
  NOTE_RADIUS_PX,
  OPEN_NOTE_RADIUS_FACTOR,
  MUSIC_NOTES, // Import MUSIC_NOTES
  getKeyIndex, // Import getKeyIndex
  getIntervalLabel, // Import getIntervalLabel
} from "../guitar_utils"; // Removed unused font import
import { MetronomeView } from "../views/metronome_view"; // Import MetronomeView to check instance type

/** A feature for displaying mulitple chord diagrams and a metronome. */
export class ChordFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Chord";
  static readonly displayName = "Chord Diagram";
  static readonly description = "Displays one or more chord diagrams.";
  readonly typeName = ChordFeature.typeName;
  private readonly chords: ReadonlyArray<Chord>;
  private readonly headerText: string;

  // Constructor and static methods remain the same as before...
  constructor(
    config: ReadonlyArray<string>,
    chords: ReadonlyArray<Chord>,
    headerText: string,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    audioController?: AudioController,
    maxCanvasHeight?: number // Add maxCanvasHeight
  ) {
    // Pass maxCanvasHeight to base constructor
    super(
      config,
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
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
          type: "enum", // Data type is enum
          required: true,
          enum: availableChordNames,
          description: "One or more chord names.",
          isVariadic: true, // Allows multiple inputs
          // Default UI (text input for each) will be used unless uiComponentType specified
        },
        {
          name: "Guitar Settings",
          type: "ellipsis",
          uiComponentType: "ellipsis",
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
    config: ReadonlyArray<string>, // Expects [ChordKey1, ChordKey2, ...]
    audioController: AudioController,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    maxCanvasHeight?: number // Add maxCanvasHeight
  ): Feature {
    if (config.length < 1) {
      throw new Error(
        `Invalid config for ${
          this.typeName
        }. Expected at least one ChordName, received: [${config.join(", ")}]`
      );
    }

    const chordKeys = config;
    const chords: Chord[] = [];
    const validChordNames: string[] = [];

    chordKeys.forEach((chordKey) => {
      const chord = chord_library[chordKey];
      if (chord) {
        chords.push(chord);
        validChordNames.push(chord.name);
      } else {
        console.warn(`[DEBUG]   Unknown chord key: "${chordKey}". Skipping.`);
      }
    });

    if (chords.length === 0) {
      throw new Error(`No valid chords found in config: ${config.join(",")}`);
    }

    const headerText =
      validChordNames.length > 1
        ? validChordNames.join(" & ") + " Chords"
        : validChordNames[0] + " Chord";

    // Pass maxCanvasHeight to constructor
    return new ChordFeature(
      config,
      chords,
      headerText,
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
  }

  // Helper to get root note (copied from ChordProgressionFeature for consistency)
  private getChordRootNote(chordName: string): string | null {
    if (!chordName) return null;
    const match = chordName.match(/^([A-G])([#b]?)/);
    if (match) {
      const rootName = `${match[1]}${match[2] || ""}`;
      if (getKeyIndex(rootName) !== -1) return rootName;
    }
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

  render(container: HTMLElement): void {
    const { canvas, ctx } = this.clearAndAddCanvas(container, this.headerText);

    // --- Canvas Size Calculation ---
    const numChords = this.chords.length;
    const chordsPerRow = Math.min(4, numChords > 2 ? 4 : numChords);
    const numRows = Math.ceil(numChords / chordsPerRow);
    const verticalSpacing = 130 * this.fretboardConfig.scaleFactor; // Scale spacing
    const titleHeight =
      CANVAS_SUBTITLE_HEIGHT_PX * this.fretboardConfig.scaleFactor; // Scale title height
    const diagramHeight =
      5 * this.fretboardConfig.fretLengthPx +
      this.fretboardConfig.noteRadiusPx * 3; // Height of fretboard + markers (already scaled)

    let requiredHeight = START_PX * this.fretboardConfig.scaleFactor; // Initial padding scaled
    requiredHeight += numRows * (diagramHeight + titleHeight + verticalSpacing); // Space for diagrams, titles, spacing
    requiredHeight -= verticalSpacing; // Remove trailing spacing after last row
    requiredHeight += 65 * this.fretboardConfig.scaleFactor; // Bottom padding scaled

    // *** Check if metronome view exists and add its estimated height ***
    const metronomeView = this.views.find(
      (view) => view instanceof MetronomeView
    );
    const METRONOME_ESTIMATED_HEIGHT = 120; // Adjust as needed based on metronome view CSS/layout
    if (metronomeView) {
      requiredHeight += METRONOME_ESTIMATED_HEIGHT;
      console.log(
        `ChordFeature: Added ${METRONOME_ESTIMATED_HEIGHT}px to canvas height for MetronomeView.`
      );
    }

    // Set canvas dimensions - Use scaled values where applicable
    canvas.height = Math.max(780, requiredHeight); // Ensure minimum height, use calculated height
    canvas.width = Math.max(
      780,
      (this.fretboardConfig.stringSpacingPx * 5 +
        this.fretboardConfig.noteRadiusPx * 2 +
        80 * this.fretboardConfig.scaleFactor) * // Scale horizontal spacing
        chordsPerRow +
        START_PX * this.fretboardConfig.scaleFactor * 2 // Scale side padding
    );

    // --- Rendering ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.resetTransform();
    ctx.translate(0.5, 0.5);
    this.chords.forEach((chord, i) =>
      this.drawSingleChordDiagram(canvas, ctx, chord, i, chordsPerRow, numRows)
    );

    // MetronomeView will render itself into the container via DisplayController/base class logic
  }

  private drawSingleChordDiagram(
    canvasEl: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    chord: Chord,
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
    const verticalSpacing = 130 * scaleFactor;
    const titleHeight = CANVAS_SUBTITLE_HEIGHT_PX * scaleFactor;
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
    ctx.fillStyle = "#444";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const titleX = leftPos + diagramWidth / 2;
    ctx.fillText(chord.name, titleX, topPosTitle);


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
           fretboard.drawMutedString(ctx, visualIndex, scaledNoteRadius, nutLineY);
         }

      } else if (fret > 0) {
         console.warn(`Chord ${chord.name} fret ${fret} on string ${stringIndex} outside display range (startFret: ${startFret})`);
      }
    }
  }
}

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
import { FretboardColorScheme } from "../colors"; // Import color scheme type only

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
    // --- Initial Setup & Clear ---
    const { canvas, ctx } = this.clearAndAddCanvas(container, this.headerText);
    const config = this.fretboardConfig; // Use the instance's config
    const scaleFactor = config.scaleFactor;
    const scaledStartPx = START_PX * scaleFactor;
    const numChords = this.chords.length;

    if (numChords === 0) {
      // Handle case with no valid chords
      ctx.fillStyle = "#888";
      ctx.font = `${16 * scaleFactor}px Sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(
        "No valid chords specified.",
        canvas.width / 2,
        50 * scaleFactor
      );
      return;
    }

    // --- Dynamic Layout Calculation ---

    // Get available width (subtract some padding maybe?)
    // Use clientWidth, ensure it's positive. Add fallback?
    const availableWidth = Math.max(
      300,
      container.clientWidth - scaledStartPx * 2
    ); // Minimum width 300px, consider padding

    // Calculate dimensions of a single diagram using scaled values
    const fretCount = 5; // Standard number of frets displayed in chord diagrams
    const scaledNoteRadius = config.noteRadiusPx;
    const diagramContentWidth =
      config.stringSpacingPx * 5 + scaledNoteRadius * 2; // Width of the 6 strings + radius padding
    const diagramContentHeight =
      fretCount * config.fretLengthPx + scaledNoteRadius * 3; // Height for frets + markers
    const titleHeight = CANVAS_SUBTITLE_HEIGHT_PX * scaleFactor;
    const horizontalSpacing = Math.max(20 * scaleFactor, 80 * scaleFactor); // Ensure some minimum spacing, scale default
    const verticalSpacing = Math.max(30 * scaleFactor, 100 * scaleFactor); // Scale vertical spacing, ensure minimum
    const fullDiagramWidth = diagramContentWidth + horizontalSpacing; // Width including spacing
    const fullDiagramHeight =
      diagramContentHeight + titleHeight + verticalSpacing; // Height including title and spacing

    // Determine how many chords fit per row
    const chordsPerRow = Math.max(
      1,
      Math.floor(availableWidth / fullDiagramWidth)
    ); // At least 1 per row

    // Calculate number of rows needed
    const numRows = Math.ceil(numChords / chordsPerRow);

    // Calculate required canvas dimensions based on dynamic layout
    const requiredWidth =
      chordsPerRow * fullDiagramWidth - horizontalSpacing + scaledStartPx * 2; // Adjust for last item spacing and padding
    let requiredHeight = scaledStartPx; // Top padding
    requiredHeight += numRows * fullDiagramHeight; // Space for diagrams, titles, spacing
    requiredHeight -= verticalSpacing; // Remove trailing spacing after last row
    requiredHeight += 65 * scaleFactor; // Bottom padding scaled

    // Add space for metronome if present
    const metronomeView = this.views.find(
      (view) => view instanceof MetronomeView
    );
    const METRONOME_ESTIMATED_HEIGHT = 120; // Rough estimate
    if (metronomeView) {
      requiredHeight += METRONOME_ESTIMATED_HEIGHT * scaleFactor; // Scale metronome space too? Or keep fixed? Let's scale.
    }

    // Apply calculated dimensions (ensure minimums)
    canvas.width = Math.max(350, requiredWidth); // Ensure minimum width
    canvas.height = Math.max(300, requiredHeight); // Ensure minimum height

    console.log(
      `[ChordFeature Render] AvailableW: ${availableWidth.toFixed(
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
    ctx.translate(0.5, 0.5); // Anti-aliasing

    // --- Draw each chord ---
    this.chords.forEach((chord, i) => {
      // Pass the dynamically calculated chordsPerRow to the drawing function
      this.drawSingleChordDiagram(
        canvas,
        ctx,
        chord,
        i,
        chordsPerRow, // Use dynamic value
        numRows,
        fretCount // Pass the standard fret count
      );
    });

    // MetronomeView will render itself via DisplayController if added to this.views
  }

  /** Draws a single chord diagram */
  private drawSingleChordDiagram(
    canvasEl: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    chord: Chord,
    index: number,
    chordsPerRow: number,
    numRows: number,
    fretCount: number = 5 // Default to 5 frets for chord diagrams
  ): void {
    const config = this.fretboardConfig;
    const scaleFactor = config.scaleFactor;
    const fontSize = 16 * scaleFactor;
    const titleFontSize = 18 * scaleFactor;
    const sideFretFontSize = 16 * scaleFactor;
    const scaledNoteRadius = config.noteRadiusPx;
    const scaledStartPx = START_PX * scaleFactor;

    // --- Layout Calculations (Scaled, using dynamic chordsPerRow) ---
    const colIndex = index % chordsPerRow;
    const rowIndex = Math.floor(index / chordsPerRow);

    // Calculate base dimensions again
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

    // --- Calculate Nut Line Y Position ---
    const openNoteClearance = scaledNoteRadius * 1.5 + 5 * scaleFactor;
    const absoluteNutLineY = topPosDiagramContent + openNoteClearance; // Y coordinate on the canvas for fret 0

    // --- Draw Title ---
    ctx.font = `${titleFontSize}px Sans-serif`;
    ctx.fillStyle = "#444";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const titleX = leftPos + diagramContentWidth / 2;
    const titleY = topPosDiagramContent - titleHeight / 2;
    ctx.fillText(chord.name, titleX, titleY);

    // --- Fretboard and Notes Logic ---
    // ** Calculate startFret based on furthest fretted note **
    let minFret = fretCount + 1;
    let maxFret = 0;
    chord.strings.forEach((fret) => {
      if (fret > 0) {
        minFret = Math.min(minFret, fret);
        maxFret = Math.max(maxFret, fret);
      }
    });

    // Default to showing the nut (startFret = 0)
    let startFret = 0;
    // If the highest fret used is greater than 3, check if the shape fits
    if (maxFret > 3) {
      // Check if the range of fretted notes (max - min) fits within the display count (minus 1 for range)
      // AND if the lowest fretted note is actually greater than 0
      if (minFret > 0 && maxFret - minFret < fretCount) {
        // If it fits, start the diagram one fret below the lowest fretted note
        startFret = minFret - 1;
      }
      // If the range is too wide or minFret is 0, startFret remains 0 (show nut)
    }
    console.log(
      `[DEBUG] Chord: ${chord.name}, MaxFret: ${maxFret}, MinFret: ${minFret}, Calculated StartFret: ${startFret}`
    );

    // Create Fretboard instance for drawing this diagram
    const fretboard = new Fretboard(
      config,
      leftPos,
      topPosDiagramContent,
      fretCount // Number of frets to draw for this diagram
    );
    fretboard.render(ctx); // Draw the grid

    // --- Display starting fret number (if not starting at the nut) ---
    if (startFret > 0) {
      ctx.font = `${sideFretFontSize}px Sans-serif`;
      ctx.fillStyle = "#666";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const sideNumberX = leftPos - 10 * scaleFactor;
      const sideNumberY = absoluteNutLineY + 0.5 * config.fretLengthPx; // Position next to 1st displayed fret line
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
      if (stringIndex >= config.tuning.tuning.length) continue; // Safety check

      const fret = chord.strings[stringIndex]; // Actual fret number (0=open, -1=muted)
      const finger = chord.fingers[stringIndex];
      const displayFret = fret - startFret; // Fret position relative to the diagram's start

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

      // **Call renderFingering for ALL strings (open, muted, or fretted)**
      // Pass the *actual* fret number; renderFingering handles positioning relative to startFret.
      // Pass '0' for open strings, '-1' for muted strings.
      fretboard.renderFingering(
        ctx,
        fret, // Pass the *actual* fret value (0, -1, or >0)
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
        config.colorScheme // Use the color scheme from the fretboard config
      );
    } // End string loop
  } // End drawSingleChordDiagram
}

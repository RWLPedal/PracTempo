/* ts/guitar/features/base_chord_diagram_feature.ts */

import { FeatureCategoryName } from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Chord } from "../chords";
import { Fretboard } from "../fretboard";
import { AppSettings } from "../../settings";
import { AudioController } from "../../audio_controller";
import {
  START_PX,
  CANVAS_SUBTITLE_HEIGHT_PX,
  OPEN_NOTE_RADIUS_FACTOR,
  MUSIC_NOTES,
  getKeyIndex,
  getIntervalLabel,
} from "../guitar_utils";
import { MetronomeView } from "../views/metronome_view"; // Import MetronomeView to check instance type
import { FretboardColorScheme } from "../colors"; // Import color scheme type only

/** Structure returned by subclasses to provide chords and titles to the base render method. */
export interface ChordAndTitle {
  chord: Chord;
  title: string;
}

/**
 * Base class for features that display one or more chord diagrams.
 * Handles common layout and rendering logic.
 */
export abstract class BaseChordDiagramFeature extends GuitarFeature {
  // Subclasses must provide the chords and their specific titles
  protected abstract getChordsAndTitles(): ChordAndTitle[];

  // Constructor passes arguments up to GuitarFeature
  constructor(
    config: ReadonlyArray<string>,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    super(
      config,
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
  }

  /** Common render logic for features showing multiple chord diagrams. */
  render(container: HTMLElement): void {
    // --- Get Chords & Titles from Subclass ---
    const chordsAndTitles = this.getChordsAndTitles();
    const numChords = chordsAndTitles.length;
    const headerText = this.getHeaderText(chordsAndTitles); // Generate header dynamically

    // --- Initial Setup & Clear ---
    const { canvas, ctx } = this.clearAndAddCanvas(container, headerText);
    const config = this.fretboardConfig; // Use the instance's config
    const scaleFactor = config.scaleFactor;
    const scaledStartPx = START_PX * scaleFactor;

    if (numChords === 0) {
      ctx.fillStyle = "#888";
      ctx.font = `${16 * scaleFactor}px Sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(
        "No valid chords to display.",
        canvas.width / 2,
        50 * scaleFactor
      );
      return;
    }

    // --- Dynamic Layout Calculation ---
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

    // --- Clear & Translate ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.resetTransform();
    ctx.translate(0.5, 0.5);

    // --- Draw each chord ---
    chordsAndTitles.forEach((item, i) => {
      this.drawSingleChordDiagram(
        canvas,
        ctx,
        item.chord,
        item.title, // Pass the title from the subclass
        i,
        chordsPerRow,
        numRows,
        fretCount
      );
    });
  }

  /** Generates the main header text based on the chords being displayed. */
  protected getHeaderText(chordsAndTitles: ChordAndTitle[]): string {
    const uniqueChordNames = [
      ...new Set(chordsAndTitles.map((item) => item.chord.name)),
    ];
    if (uniqueChordNames.length === 0) {
      return "Chord Diagram";
    } else if (uniqueChordNames.length === 1) {
      return `${uniqueChordNames[0]} Chord`;
    } else {
      // For progressions or multiple chords, use a generic or more complex title
      // This might need refinement depending on how ChordProgressionFeature generates its titles
      return uniqueChordNames.slice(0, 3).join(" / ") + " Chords"; // Example for multiple
    }
  }

  /** Helper to get root note */
  protected getChordRootNote(chordName: string): string | null {
    if (!chordName) return null;
    const match = chordName.match(/^([A-G])([#b]?)/);
    if (match) {
      const rootName = `${match[1]}${match[2] || ""}`;
      if (getKeyIndex(rootName) !== -1) return rootName;
    }
    // Fallback might be needed if chord_library keys differ significantly from names
    console.warn(`Could not determine root note for chord name: ${chordName}`);
    return null;
  }

  /** Draws a single chord diagram */
  protected drawSingleChordDiagram(
    canvasEl: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    chord: Chord,
    title: string, // Title provided by the subclass
    index: number,
    chordsPerRow: number,
    numRows: number,
    fretCount: number = 5
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
    ctx.fillText(title, titleX, titleY); // Use the passed title

    // --- Fretboard and Notes Logic ---
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
      // Only shift if the lowest fretted note is > 0 and the shape fits
      if (minFret > 0 && maxFret - minFret < fretCount) {
        startFret = minFret - 1;
      }
    }
    // console.log(`[DEBUG Base] Chord: ${chord.name}, MaxFret: ${maxFret}, MinFret: ${minFret}, Calc StartFret: ${startFret}`);

    const fretboard = new Fretboard(
      config,
      leftPos,
      topPosDiagramContent,
      fretCount
    );
    fretboard.render(ctx);

    // --- Display starting fret number (Only if diagram is shifted) ---
    if (startFret > 0) {
      // <<<<< FIX: Ensure this condition correctly gates the drawing
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

      const fret = chord.strings[stringIndex];
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

      // Call renderFingering for ALL strings
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
        config.colorScheme // Use the color scheme from the fretboard config
      );
    } // End string loop
  } // End drawSingleChordDiagram
}

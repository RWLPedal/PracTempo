/* ts/guitar/views/chord_diagram_view.ts */

import { View } from "../../view";
import { Chord } from "../chords";
import { Fretboard, FretboardConfig } from "../fretboard";
import {
  START_PX,
  // CANVAS_SUBTITLE_HEIGHT_PX, // No longer needed for external title height
  NOTE_RADIUS_PX,
  OPEN_NOTE_RADIUS_FACTOR,
  MUSIC_NOTES,
  getKeyIndex,
  getIntervalLabel,
  // addHeader, // No longer needed for external title
  addCanvas, // Keep for creating canvas
  clearAllChildren,
} from "../guitar_utils";
import { FretboardColorScheme } from "../colors"; // Import color scheme type only

/**
 * A View responsible for rendering a single chord diagram onto its own canvas,
 * including the title within the canvas.
 */
export class ChordDiagramView implements View {
  private chord: Chord;
  private title: string;
  private fretboardConfig: FretboardConfig;
  private wrapperDiv: HTMLElement | null = null; // Still useful for layout/styling container
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Store calculated dimensions
  private requiredWidth: number = 0;
  private requiredHeight: number = 0;
  private diagramContentWidth: number = 0;
  private diagramContentHeight: number = 0;
  private absoluteNutLineY: number = 0;
  private leftPos: number = 0;
  private topPosDiagramContent: number = 0; // Y position where diagram *content* starts (below title)
  private startFret: number = 0;
  private readonly fretCount: number = 5; // Standard for chord diagrams

  constructor(chord: Chord, title: string, fretboardConfig: FretboardConfig) {
    this.chord = chord;
    this.title = title;
    this.fretboardConfig = fretboardConfig;
  }

  render(container: HTMLElement): void {
    if (!this.wrapperDiv) {
      this.createElements(container);
    } else {
      if (!this.wrapperDiv.parentNode) {
        container.appendChild(this.wrapperDiv); // Re-attach if detached
      }
    }

    if (this.canvas && this.ctx) {
      this.drawDiagram(); // Always redraw when render is called
    } else {
      console.error(
        "Canvas or context not available for rendering chord:",
        this.title
      );
    }
  }

  private createElements(container: HTMLElement): void {
    const config = this.fretboardConfig;
    const scaleFactor = config.scaleFactor;
    const scaledNoteRadius = config.noteRadiusPx;
    const scaledStartPx = START_PX * scaleFactor;
    const titleFontSize = 18 * scaleFactor; // Font size for title inside canvas
    const titlePadding = 10 * scaleFactor; // Space above/below title inside canvas

    // --- Calculate Dimensions for a Single Diagram ---
    this.diagramContentWidth =
      config.stringSpacingPx * 5 + scaledNoteRadius * 2;
    this.diagramContentHeight =
      this.fretCount * config.fretLengthPx + scaledNoteRadius * 3;

    // Calculate required size for the canvas (including internal title space)
    this.requiredWidth =
      scaledStartPx + this.diagramContentWidth + scaledStartPx;
    // Height: TopPad + Title + TitlePad + DiagramContent + BottomPad
    this.requiredHeight =
      scaledStartPx +
      titleFontSize +
      titlePadding +
      this.diagramContentHeight +
      scaledStartPx;

    // --- Create Wrapper Div (optional, but good for styling/layout) ---
    this.wrapperDiv = document.createElement("div");
    this.wrapperDiv.classList.add("chord-diagram-view");
    this.wrapperDiv.style.display = "inline-block";
    this.wrapperDiv.style.verticalAlign = "top";
    this.wrapperDiv.style.padding = "5px"; // Padding around the canvas
    this.wrapperDiv.style.minWidth = `${this.requiredWidth}px`;

    // --- Create Canvas ---
    const canvasIdSuffix = `chord-${this.title.replace(/[^a-zA-Z0-9-]/g, "_")}`;
    this.canvas = addCanvas(this.wrapperDiv, canvasIdSuffix); // Add canvas to wrapper
    this.canvas.width = Math.max(150, this.requiredWidth);
    this.canvas.height = Math.max(200, this.requiredHeight);

    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) {
      console.error("Failed to get 2D context for chord diagram:", this.title);
      return;
    }

    // Calculate drawing positions relative to this canvas
    this.leftPos = scaledStartPx;
    // Diagram content starts below the top padding, title, and title padding
    this.topPosDiagramContent = scaledStartPx + titleFontSize + titlePadding;
    const openNoteClearance = scaledNoteRadius * 1.5 + 5 * scaleFactor;
    this.absoluteNutLineY = this.topPosDiagramContent + openNoteClearance;

    this.calculateStartFret();

    container.appendChild(this.wrapperDiv); // Append wrapper (with canvas)
  }

  private calculateStartFret(): void {
    let minFret = this.fretCount + 1;
    let maxFret = 0;
    this.chord.strings.forEach((fret) => {
      if (fret > 0) {
        minFret = Math.min(minFret, fret);
        maxFret = Math.max(maxFret, fret);
      }
    });
    this.startFret = 0;
    if (maxFret > 3) {
      if (minFret > 0 && maxFret - minFret < this.fretCount) {
        this.startFret = minFret - 1;
      }
    }
  }

  private getChordRootNote(): string | null {
    const chordName = this.chord.name;
    if (!chordName) return null;
    const match = chordName.match(/^([A-G])([#b]?)/);
    if (match) {
      const rootName = `${match[1]}${match[2] || ""}`;
      if (getKeyIndex(rootName) !== -1) return rootName;
    }
    console.warn(`Could not determine root note for chord name: ${chordName}`);
    return null;
  }

  private drawDiagram(): void {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const config = this.fretboardConfig;
    const scaleFactor = config.scaleFactor;
    const fontSize = 16 * scaleFactor;
    const titleFontSize = 18 * scaleFactor; // Use consistent size
    const sideFretFontSize = 16 * scaleFactor;
    const scaledNoteRadius = config.noteRadiusPx;

    // Clear canvas and translate
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.resetTransform();
    ctx.translate(0.5, 0.5);

    // --- Draw Title INSIDE Canvas ---
    ctx.font = `${titleFontSize}px Sans-serif`;
    ctx.fillStyle = "#444";
    ctx.textAlign = "center";
    ctx.textBaseline = "top"; // Align text to the top baseline
    const titleX = this.canvas.width / 2; // Center horizontally
    const titleY = START_PX * scaleFactor; // Position within top padding
    ctx.fillText(this.title, titleX, titleY);

    // --- Create and render Fretboard instance ---
    // Fretboard starts drawing at topPosDiagramContent
    const fretboard = new Fretboard(
      config,
      this.leftPos,
      this.topPosDiagramContent, // Pass Y where fretboard content starts
      this.fretCount
    );
    fretboard.render(ctx); // Draw the grid relative to its topPos

    // --- Display starting fret number (if diagram is shifted) ---
    if (this.startFret > 0) {
      ctx.font = `${sideFretFontSize}px Sans-serif`;
      ctx.fillStyle = "#666";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const sideNumberX = this.leftPos - 10 * scaleFactor;
      // Position relative to the absolute nut line Y calculated earlier
      const sideNumberY = this.absoluteNutLineY + 0.5 * config.fretLengthPx;
      ctx.fillText(`${this.startFret + 1}`, sideNumberX, sideNumberY);
    }

    // --- Draw Fingerings/Notes ---
    const chordRootName = this.getChordRootNote();
    const chordRootIndex = chordRootName ? getKeyIndex(chordRootName) : -1;

    ctx.font = `${fontSize}px Sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (
      let stringIndex = 0;
      stringIndex < this.chord.strings.length;
      stringIndex++
    ) {
      if (stringIndex >= config.tuning.tuning.length) continue;

      const fret = this.chord.strings[stringIndex];
      const finger = this.chord.fingers[stringIndex];

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
      // It uses absoluteNutLineY internally for positioning fret 0 / -1
      fretboard.renderFingering(
        ctx,
        fret,
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
        config.colorScheme
      );
    } // End string loop
  }

  start(): void {}
  stop(): void {}

  destroy(): void {
    if (this.wrapperDiv && this.wrapperDiv.parentNode) {
      this.wrapperDiv.parentNode.removeChild(this.wrapperDiv);
    }
    this.wrapperDiv = null;
    this.canvas = null;
    this.ctx = null;
  }
}

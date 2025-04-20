/* ts/guitar/views/fretboard_view.ts */

import { View } from "../../view";
import { Fretboard, FretboardConfig } from "../fretboard";
import { FretboardColorScheme } from "../colors";
import { addCanvas, OPEN_NOTE_RADIUS_FACTOR } from "../guitar_utils";
import { START_PX } from "../guitar_utils";

/** Interface defining the data needed to render a single note/fingering. */
export interface NoteRenderData {
  fret: number; // -1 for muted, 0 for open
  stringIndex: number;
  noteName: string; // For coloring or display
  intervalLabel: string; // For coloring or display
  displayLabel: string; // Text to show inside the dot (often noteName or finger)
  colorSchemeOverride?: FretboardColorScheme; // Optional override for this note
  isRoot?: boolean; // Explicit flag if needed (though intervalLabel often covers this)
  radiusOverride?: number; // For open strings etc.
  strokeColor?: string;
  lineWidth?: number;
  drawStar?: boolean;
  // Add optional coordinate cache if needed, but calculate dynamically preferably
  x?: number;
  y?: number;
}

/** Interface defining data needed to render a line segment. */
export interface LineData {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color: string;
    lineWidth?: number;
    dashed?: boolean;
}


/**
 * A View responsible for rendering the fretboard grid, notes/fingerings, and lines provided to it.
 */
export class FretboardView implements View {
  private fretboardConfig: FretboardConfig;
  private fretCount: number;
  private fretboard: Fretboard; // Internal Fretboard logic instance
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private notesToDraw: NoteRenderData[] = []; // Data for notes to render
  private linesToDraw: LineData[] = []; // Data for lines to render

  // Store calculated dimensions
  private requiredWidth: number = 0;
  private requiredHeight: number = 0;

  /**
   * Creates a FretboardView.
   * @param fretboardConfig - The configuration for the fretboard appearance.
   * @param fretCount - The number of frets to display.
   */
  constructor(fretboardConfig: FretboardConfig, fretCount: number) {
    this.fretboardConfig = fretboardConfig;
    this.fretCount = fretCount > 0 ? fretCount : 12;
    this.calculateDimensions();

    const scaledStartPx = START_PX * this.fretboardConfig.scaleFactor;
    this.fretboard = new Fretboard(
      this.fretboardConfig,
      scaledStartPx,
      scaledStartPx,
      this.fretCount
    );
  }

  private calculateDimensions(): void {
      const config = this.fretboardConfig;
      const scaleFactor = config.scaleFactor;
      const scaledNoteRadius = config.noteRadiusPx;
      const scaledStartPx = START_PX * scaleFactor;
      const openNoteClearance = scaledNoteRadius * 1.5 + (5 * scaleFactor);
      const fretboardLinesHeight = this.fretCount * config.fretLengthPx;
      const bottomClearance = scaledNoteRadius + (5 * scaleFactor);
      this.requiredWidth = scaledStartPx + (config.stringSpacingPx * 5) + scaledStartPx;
      this.requiredHeight = scaledStartPx + openNoteClearance + fretboardLinesHeight + bottomClearance + scaledStartPx;
  }

  render(container: HTMLElement): void {
    if (!this.canvas) {
      this.createCanvas(container);
    } else {
      if (!this.canvas.parentNode) {
        container.appendChild(this.canvas);
      }
    }
    if (this.ctx) {
      this.drawContent();
    } else {
      console.error("Canvas context not available for FretboardView.");
    }
  }

  private createCanvas(container: HTMLElement): void {
    const canvasIdSuffix = `fretboard-${Date.now()}`;
    this.canvas = addCanvas(container, canvasIdSuffix);
    this.canvas.width = Math.max(150, this.requiredWidth);
    this.canvas.height = Math.max(150, this.requiredHeight);
    this.canvas.classList.add('fretboard-view-canvas');

    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) {
      console.error("Failed to get 2D context for FretboardView.");
      this.canvas = null;
    }
  }

  /** Draws the grid, notes, and lines onto the canvas. */
  private drawContent(): void {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas and translate
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.resetTransform();
    this.ctx.translate(0.5, 0.5);

    // 1. Draw the Grid
    this.fretboard.render(this.ctx);

    // 2. Draw the Lines (drawn under the notes)
    this.drawLines();

    // 3. Draw the Notes
    this.drawNotes();
  }

  /** Draws the stored notes onto the canvas context. */
  private drawNotes(): void {
      if (!this.ctx) return;
      const scaleFactor = this.fretboardConfig.scaleFactor;
      const baseFontSize = 16 * scaleFactor;
      const baseNoteRadius = this.fretboardConfig.noteRadiusPx;

      this.notesToDraw.forEach(noteData => {
          const radiusOverride = noteData.fret === 0 && noteData.radiusOverride === undefined
              ? baseNoteRadius * OPEN_NOTE_RADIUS_FACTOR
              : noteData.radiusOverride;

          this.fretboard.renderFingering(
              this.ctx!,
              noteData.fret, noteData.stringIndex, noteData.noteName,
              noteData.intervalLabel, noteData.displayLabel, baseNoteRadius,
              baseFontSize, noteData.drawStar ?? false, noteData.strokeColor ?? "black",
              noteData.lineWidth ?? 1, radiusOverride, noteData.colorSchemeOverride
          );
      });
  }

  /** Draws the stored lines onto the canvas context. */
  private drawLines(): void {
    if (!this.ctx) return;
    const scaleFactor = this.fretboardConfig.scaleFactor;
    this.ctx.save();
    this.linesToDraw.forEach(line => {
        this.ctx!.strokeStyle = line.color || 'grey';
        this.ctx!.lineWidth = (line.lineWidth || 2) * scaleFactor; // Scale line width
        if (line.dashed) {
            // Scale dash pattern
            const dashLength = 4 * scaleFactor;
            this.ctx!.setLineDash([dashLength, dashLength]);
        } else {
            this.ctx!.setLineDash([]);
        }
        this.ctx!.beginPath();
        this.ctx!.moveTo(line.startX, line.startY);
        this.ctx!.lineTo(line.endX, line.endY);
        this.ctx!.stroke();
    });
    this.ctx.restore(); // Restore line dash and other context settings
  }


  // --- Public Methods to Control Data ---

  /** Sets the notes to be drawn on the fretboard. */
  public setNotes(notes: NoteRenderData[]): void {
    this.notesToDraw = notes;
    this.redrawIfReady();
  }

  /** Sets the lines to be drawn on the fretboard. */
  public setLines(lines: LineData[]): void {
      this.linesToDraw = lines;
      this.redrawIfReady();
  }

  /** Clears all notes from the fretboard display. */
  public clearNotes(): void {
    this.notesToDraw = [];
    this.redrawIfReady();
  }

  /** Clears all lines from the fretboard display. */
  public clearLines(): void {
      this.linesToDraw = [];
      this.redrawIfReady();
  }

  /** Clears both notes and lines. */
  public clearAllMarkings(): void {
      this.notesToDraw = [];
      this.linesToDraw = [];
      this.redrawIfReady();
  }

  /** Helper to redraw the canvas content if context is available. */
  private redrawIfReady(): void {
      if (this.ctx && this.canvas?.parentNode) {
          requestAnimationFrame(() => this.drawContent());
      }
  }

  // --- Expose Methods/Properties ---
  public getFretboard(): Fretboard { return this.fretboard; }
  public getCanvasElement(): HTMLCanvasElement | null { return this.canvas; }

  // --- View Lifecycle Methods ---
  start(): void {}
  stop(): void {}

  destroy(): void {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
    this.notesToDraw = [];
    this.linesToDraw = [];
  }
}
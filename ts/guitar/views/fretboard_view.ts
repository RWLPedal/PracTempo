import { View } from "../../view";
import {
  Fretboard,
  FretboardConfig,
  NoteRenderData,
  LineData,
} from "../fretboard"; // Import types from fretboard.ts
import { addCanvas, START_PX } from "../guitar_utils";

/**
 * A View that wraps a Fretboard instance, sets up its canvas,
 * and delegates rendering and data updates to it.
 */
export class FretboardView implements View {
  private fretboardConfig: FretboardConfig;
  private fretCount: number;
  private fretboard: Fretboard; // Internal Fretboard logic instance
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Store calculated dimensions (mostly for canvas creation)
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

    // Calculate dimensions needed for the canvas based on config and fret count
    this.calculateDimensions();

    // Instantiate the Fretboard logic class
    // The Fretboard class itself uses START_PX internally for drawing padding
    this.fretboard = new Fretboard(
      this.fretboardConfig,
      this.fretboardConfig.scaleFactor * START_PX, // Pass scaled start X
      this.fretboardConfig.scaleFactor * START_PX, // Pass scaled start Y
      this.fretCount
    );
  }

  /** Calculates the required canvas dimensions. */
  private calculateDimensions(): void {
    const config = this.fretboardConfig;
    const scaleFactor = config.scaleFactor;
    const scaledNoteRadius = config.noteRadiusPx;
    const scaledStartPx = START_PX * scaleFactor;
    const openNoteClearance = scaledNoteRadius * 1.5 + 5 * scaleFactor;
    const fretboardLinesHeight = this.fretCount * config.fretLengthPx;
    const bottomClearance = scaledNoteRadius + 5 * scaleFactor;
    this.requiredWidth =
      scaledStartPx + config.stringSpacingPx * 5 + scaledStartPx;
    this.requiredHeight =
      scaledStartPx +
      openNoteClearance +
      fretboardLinesHeight +
      bottomClearance +
      scaledStartPx;
  }

  /** Creates the canvas and triggers the initial render via the Fretboard instance. */
  render(container: HTMLElement): void {
    if (!this.canvas) {
      this.createCanvas(container);
    } else {
      if (!this.canvas.parentNode) {
        // Re-attach if detached
        container.appendChild(this.canvas);
      }
    }

    // Always delegate rendering to the Fretboard instance
    if (this.ctx) {
      this.fretboard.render(this.ctx);
    } else {
      console.error("Canvas context not available for FretboardView render.");
    }
  }

  /** Creates the canvas element. */
  private createCanvas(container: HTMLElement): void {
    const canvasIdSuffix = `fretboard-${Date.now()}`;
    this.canvas = addCanvas(container, canvasIdSuffix);
    this.canvas.width = Math.max(150, this.requiredWidth);
    this.canvas.height = Math.max(150, this.requiredHeight);
    this.canvas.classList.add("fretboard-view-canvas");

    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) {
      console.error("Failed to get 2D context for FretboardView.");
      this.canvas = null;
    }
  }

  // --- Public Methods to Pass Data to Fretboard Instance ---

  public setNotes(notes: NoteRenderData[]): void {
    this.fretboard.setNotes(notes);
    this.redrawIfReady(); // Trigger redraw after data update
  }

  public setLines(lines: LineData[]): void {
    this.fretboard.setLines(lines);
    this.redrawIfReady();
  }

  public clearMarkings(): void {
    this.fretboard.clearMarkings();
    this.redrawIfReady();
  }

  /** Helper to redraw the canvas content via the Fretboard instance. */
  private redrawIfReady(): void {
    if (this.ctx && this.canvas?.parentNode) {
      // Use rAF for potentially smoother updates if rapid changes occur
      requestAnimationFrame(() => {
        if (this.ctx) this.fretboard.render(this.ctx);
      });
    }
  }

  // --- Expose Methods/Properties (Optional) ---
  // May not be needed if Fretboard handles all drawing
  public getFretboard(): Fretboard {
    return this.fretboard;
  }
  public getCanvasElement(): HTMLCanvasElement | null {
    return this.canvas;
  }

  // --- View Lifecycle Methods ---
  start(): void {} // No dynamic behavior
  stop(): void {} // No dynamic behavior

  destroy(): void {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
    this.fretboard.clearMarkings(); // Clear data in underlying fretboard
  }
}

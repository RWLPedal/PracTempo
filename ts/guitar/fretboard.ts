/* ts/guitar/fretboard.ts */

import { NOTE_RADIUS_PX } from "./guitar_utils";
import { FretboardColorScheme, getColor as getColorFromScheme } from "./colors";

export class Tuning {
  constructor(public readonly tuning: Array<number>) {}
}

// EADGBE tuning offsets from A: [7, 0, 5, 10, 2, 7]
export const STANDARD_TUNING = new Tuning([7, 0, 5, 10, 2, 7]);
// DADGBE tuning offsets from A: [5, 0, 5, 10, 2, 7]
export const DROP_D_TUNING = new Tuning([5, 0, 5, 10, 2, 7]);

export const AVAILABLE_TUNINGS = {
  Standard: STANDARD_TUNING,
  "Drop D": DROP_D_TUNING,
};
export type TuningName = keyof typeof AVAILABLE_TUNINGS;

const DEFAULT_FRETBOARD_DRAW_HEIGHT = 650;
const ESTIMATED_FRETS_FOR_SCALING = 18;

export class FretboardConfig {
  public readonly baseStringSpacingPx = 32;
  public readonly baseFretLengthPx = 39;
  public readonly baseMarkerDotRadiusPx = 7;
  public readonly baseNoteRadiusPx = NOTE_RADIUS_PX;

  public readonly stringSpacingPx: number;
  public readonly fretLengthPx: number;
  public readonly markerDotRadiusPx: number;
  public readonly noteRadiusPx: number;
  public readonly scaleFactor: number;

  constructor(
    public readonly tuning: Tuning,
    public readonly handedness: "right" | "left" = "right",
    public readonly colorScheme: FretboardColorScheme = "default",
    public readonly markerDots = [
      0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 2, 0, 0, 1, 0, 1, 0, 1, 0, 1,
    ],
    public readonly sideNumbers = [
      "",
      "",
      "",
      "III",
      "",
      "V",
      "",
      "VII",
      "",
      "IX",
      "",
      "",
      "XII",
      "",
      "",
      "XV",
      "",
      "XVII",
      "",
      "XIX",
      "",
      "XXI",
    ],
    public readonly stringWidths = [3, 3, 2, 2, 1, 1],
    maxCanvasHeight?: number, // Max height constraint
    globalScaleMultiplier: number = 1.0 // <<<<< ADDED: Optional overall scale multiplier
  ) {
    const actualMaxHeight = maxCanvasHeight ?? DEFAULT_FRETBOARD_DRAW_HEIGHT;
    const estimatedBaseHeight =
      this.baseFretLengthPx * ESTIMATED_FRETS_FOR_SCALING + 80;
    // Apply the globalScaleMultiplier here
    this.scaleFactor =
      Math.min(1.0, actualMaxHeight / estimatedBaseHeight) *
      globalScaleMultiplier; // <<< MODIFIED

    this.stringSpacingPx = this.baseStringSpacingPx * this.scaleFactor;
    this.fretLengthPx = this.baseFretLengthPx * this.scaleFactor;
    this.markerDotRadiusPx = this.baseMarkerDotRadiusPx * this.scaleFactor;
    this.noteRadiusPx = this.baseNoteRadiusPx * this.scaleFactor;

    console.log(
      `[FretboardConfig] Multiplier: ${globalScaleMultiplier.toFixed(
        2
      )}, Final ScaleFactor: ${this.scaleFactor.toFixed(3)}`
    );
  }

  getStringWidths(): Array<number> {
    return this.handedness === "left"
      ? [...this.stringWidths].reverse()
      : this.stringWidths;
  }
}

// --- Fretboard Class (logic remains the same) ---
export class Fretboard {
  // ... (constructor remains the same) ...
  constructor(
    public readonly config: FretboardConfig,
    public readonly leftPx = 45, // Base X position for drawing start
    public readonly topPx = 45, // Base Y position for drawing start
    public readonly fretCount: number
  ) {}

  // ... (getStringIndex, getStringX remain the same) ...
  private getStringIndex(visualIndex: number): number {
    return this.config.handedness === "left" ? 5 - visualIndex : visualIndex;
  }

  private getStringX(visualIndex: number): number {
    // Uses scaled spacing from config
    return this.leftPx + visualIndex * this.config.stringSpacingPx;
  }

  /** Calculates the X, Y coordinates for the center of a note circle. */
  getNoteCoordinates(
    stringIndex: number,
    fret: number
  ): { x: number; y: number } {
    const config = this.config; // Use scaled config values
    const scaleFactor = config.scaleFactor;
    const scaledNoteRadius = config.noteRadiusPx;
    // Y position of the nut line (fret 0) relative to the Fretboard's topPx
    const openNoteClearance = scaledNoteRadius * 1.5 + 5 * scaleFactor;
    const nutLineY = this.topPx + openNoteClearance;

    const visualStringIndex =
      config.handedness === "left" ? 5 - stringIndex : stringIndex;
    const x = this.getStringX(visualStringIndex);

    let y: number;
    if (fret > 0) {
      // Fretted notes: Position relative to the nut line
      y = nutLineY + (fret - 0.5) * config.fretLengthPx; // Use scaled fret length
    } else {
      // Open notes (fret === 0): Position center so bottom edge is above nutLineY
      const textBuffer = 5 * scaleFactor; // Extra buffer
      y = nutLineY - scaledNoteRadius - textBuffer;
      y = Math.max(this.topPx + scaledNoteRadius, y); // Ensure it stays within top bound
    }
    return { x, y };
  }

  // ... (render method remains the same) ...
  render(ctx: CanvasRenderingContext2D): void {
    const config = this.config; // Alias
    const scaleFactor = config.scaleFactor;
    const scaledNoteRadius = config.noteRadiusPx;

    // Clearance needed above the nut line for open notes/muted markers
    const openNoteClearance = scaledNoteRadius * 1.5 + 5 * scaleFactor;
    // The Y coordinate where the nut line (fret 0) should be drawn
    const nutLineY = this.topPx + openNoteClearance;

    const textHeight = 12 * scaleFactor;
    const stringWidths = config.getStringWidths();
    ctx.fillStyle = "#aaa"; // TODO: Theming

    // Strings - Start drawing from the calculated nutLineY
    for (var visualIndex = 0; visualIndex < 6; visualIndex++) {
      const xPos = this.getStringX(visualIndex);
      ctx.beginPath();
      ctx.lineWidth = stringWidths[visualIndex] * scaleFactor; // Scale line width
      ctx.moveTo(xPos, nutLineY);
      const stringBottomY = nutLineY + this.fretCount * config.fretLengthPx;
      ctx.lineTo(xPos, stringBottomY);
      ctx.strokeStyle = "#aaa";
      ctx.stroke();
    }

    // Frets & Markers - Start drawing from the calculated nutLineY
    ctx.font = textHeight + "px Sans-serif";
    ctx.strokeStyle = "#555";
    ctx.fillStyle = "#aaa";

    const totalBoardWidth = 5 * config.stringSpacingPx;
    const boardCenterX = this.leftPx + totalBoardWidth / 2;
    const defaultFretLineWidth = 1 * scaleFactor;
    const boldFretLineWidth = 2 * scaleFactor;
    const sideNumberOffsetX = 18 * scaleFactor;

    for (var i = 0; i <= this.fretCount; i++) {
      const yPos = nutLineY + i * config.fretLengthPx;
      const hasSideNumber = !!config.sideNumbers[i];

      if (i === 0) ctx.lineWidth = boldFretLineWidth * 1.5; // Thicker nut
      else if (hasSideNumber) ctx.lineWidth = boldFretLineWidth;
      else ctx.lineWidth = defaultFretLineWidth;

      ctx.beginPath();
      ctx.moveTo(this.leftPx, yPos);
      ctx.lineTo(this.leftPx + totalBoardWidth, yPos);
      ctx.stroke();

      if (hasSideNumber && i > 0) {
        // Don't draw side number for fret 0
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(
          config.sideNumbers[i],
          this.leftPx - sideNumberOffsetX,
          nutLineY + (i - 0.5) * config.fretLengthPx
        );
      }

      const markerY = nutLineY + (i - 0.5) * config.fretLengthPx;
      const scaledMarkerRadius = config.markerDotRadiusPx;
      if (config.markerDots[i] === 1) {
        ctx.beginPath();
        ctx.arc(boardCenterX, markerY, scaledMarkerRadius, 0, 2 * Math.PI);
        ctx.fill();
      } else if (config.markerDots[i] === 2) {
        const markerX1 = this.leftPx + 1.5 * config.stringSpacingPx;
        const markerX2 = this.leftPx + 3.5 * config.stringSpacingPx;
        ctx.beginPath();
        ctx.arc(markerX1, markerY, scaledMarkerRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(markerX2, markerY, scaledMarkerRadius, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    ctx.textAlign = "left"; // Reset default
    ctx.lineWidth = 1;
  }

  // ... (renderFingering, drawMutedString, drawStar methods remain the same) ...
  /**
   * Renders a fingering dot/label on the fretboard.
   */
  renderFingering(
    ctx: CanvasRenderingContext2D,
    fret: number, // The actual fret number (-1=muted, 0=open)
    stringIndex: number,
    noteName: string,
    intervalLabel: string,
    label: string,
    noteRadiusPx: number, // Base scaled radius from config
    fontSize: number, // Base scaled font size
    drawStar = false,
    strokeColor = "black",
    lineWidth = 1,
    radiusOverride?: number, // Specific radius (e.g., for open notes)
    colorSchemeOverride?: FretboardColorScheme
  ): void {
    const config = this.config;
    const visualStringIndex =
      config.handedness === "left" ? 5 - stringIndex : stringIndex;
    const scaleFactor = config.scaleFactor;
    const effectiveRadius = radiusOverride ?? noteRadiusPx; // Use override or base scaled radius
    const scaledLineWidth = lineWidth * scaleFactor;
    // Adjust font size slightly if it's an open note override using smaller radius
    const effectiveFontSize =
      fret === 0 && radiusOverride ? fontSize * 0.85 : fontSize;

    // Use getNoteCoordinates to find the center position
    const { x, y } = this.getNoteCoordinates(stringIndex, fret);

    ctx.save();
    const effectiveColorScheme = colorSchemeOverride ?? config.colorScheme;
    const bgColor = getColorFromScheme(
      effectiveColorScheme,
      noteName,
      intervalLabel
    );

    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const fgColor = brightness > 150 ? "#333" : "#eee";

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = scaledLineWidth;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (fret >= 0) {
      // Draw dot for open or fretted
      ctx.beginPath();
      ctx.arc(x, y, effectiveRadius, 0, 2 * Math.PI);

      const isDefaultOpenOutline =
        fret === 0 && effectiveColorScheme === "default";
      if (!isDefaultOpenOutline && bgColor !== "transparent") {
        ctx.fill();
      }
      if (bgColor !== "transparent") {
        ctx.stroke();
      }

      if (label !== "") {
        ctx.fillStyle = fgColor;
        ctx.font = effectiveFontSize + "px Sans-serif";
        const textYOffset = effectiveFontSize * 0.05; // Smaller adjustment
        ctx.fillText(label, x, y + textYOffset);
      }
      if (drawStar) {
        ctx.fillStyle = fgColor;
        this.drawStar(ctx, x, y, effectiveRadius * 0.6, 5, 2);
      }
    } else {
      // Fret is -1 (muted)
      this.drawMutedString(
        ctx,
        visualStringIndex,
        config.noteRadiusPx,
        this.topPx + config.noteRadiusPx * 1.5 + 5 * scaleFactor
      ); // Pass calculated nutLineY
    }
    ctx.restore();
  }

  drawMutedString(
    ctx: CanvasRenderingContext2D,
    visualStringIndex: number,
    scaledRadiusPx: number, // Expect scaled radius
    nutLineY: number // Position relative to the nut line
  ): void {
    const x = this.getStringX(visualStringIndex);
    // Position above the nut line, using calculated nutLineY from getNoteCoordinates logic
    const y = nutLineY - scaledRadiusPx * 1.5; // Similar vertical pos as open notes
    const size = scaledRadiusPx * 0.55; // Size based on scaled radius

    ctx.save();
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1.5 * this.config.scaleFactor; // Scale line width
    ctx.beginPath();
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.moveTo(x + size, y - size);
    ctx.lineTo(x - size, y + size);
    ctx.stroke();
    ctx.restore();
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    n: number,
    insetRatio: number
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.translate(x, y);
    ctx.moveTo(0, 0 - r);
    for (var i = 0; i < n; i++) {
      ctx.rotate(Math.PI / n);
      ctx.lineTo(0, 0 - r / insetRatio);
      ctx.rotate(Math.PI / n);
      ctx.lineTo(0, 0 - r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
} // End Fretboard Class

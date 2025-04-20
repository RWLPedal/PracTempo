import { NOTE_RADIUS_PX } from "./guitar_utils";
import { FretboardColorScheme, getColor as getColorFromScheme } from "./colors"; // Import FretboardColorScheme

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

// Define a base height for scaling calculations
const DEFAULT_FRETBOARD_DRAW_HEIGHT = 650; // Target height for scale = 1.0
const ESTIMATED_FRETS_FOR_SCALING = 18; // Use a larger number of frets for estimation

export class FretboardConfig {
  // Store base dimensions for scaling
  public readonly baseStringSpacingPx = 32;
  public readonly baseFretLengthPx = 39;
  public readonly baseMarkerDotRadiusPx = 7;
  public readonly baseNoteRadiusPx = NOTE_RADIUS_PX; // Assuming NOTE_RADIUS_PX is the base

  // Scaled dimensions
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
      "", "", "", "III", "", "V", "", "VII", "", "IX", "", "", "XII", "", "",
      "XV", "", "XVII", "", "XIX", "", "XXI",
    ],
    public readonly stringWidths = [3, 3, 2, 2, 1, 1],
    maxCanvasHeight?: number // Add optional max height
  ) {
    // Calculate scale factor
    const actualMaxHeight = maxCanvasHeight ?? DEFAULT_FRETBOARD_DRAW_HEIGHT;
    // Estimate required height based on ESTIMATED_FRETS_FOR_SCALING and some padding
    const estimatedBaseHeight = this.baseFretLengthPx * ESTIMATED_FRETS_FOR_SCALING + 80; // Use the new constant
    this.scaleFactor = Math.min(1.0, actualMaxHeight / estimatedBaseHeight); // Don't scale up, only down

    // Apply scale factor to base dimensions
    this.stringSpacingPx = this.baseStringSpacingPx * this.scaleFactor;
    this.fretLengthPx = this.baseFretLengthPx * this.scaleFactor;
    this.markerDotRadiusPx = this.baseMarkerDotRadiusPx * this.scaleFactor;
    this.noteRadiusPx = this.baseNoteRadiusPx * this.scaleFactor;

    console.log(`[FretboardConfig] MaxHeight: ${maxCanvasHeight}, ActualMax: ${actualMaxHeight}, EstBaseHeight: ${estimatedBaseHeight.toFixed(2)}, ScaleFactor: ${this.scaleFactor.toFixed(3)}`);
  }

  getStringWidths(): Array<number> {
    return this.handedness === "left"
      ? [...this.stringWidths].reverse()
      : this.stringWidths;
  }
}


export class Fretboard {
  constructor(
    public readonly config: FretboardConfig,
    public readonly leftPx = 45,
    public readonly topPx = 45,
    public readonly fretCount: number
  ) {}

  private getStringIndex(visualIndex: number): number {
    return this.config.handedness === "left" ? 5 - visualIndex : visualIndex;
  }

  private getStringX(visualIndex: number): number {
    return this.leftPx + visualIndex * this.config.stringSpacingPx;
  }

  getNoteCoordinates(
    stringIndex: number,
    fret: number
  ): { x: number; y: number } {
    const visualStringIndex = (this.config.handedness === 'left') ? 5 - stringIndex : stringIndex;
    const x = this.getStringX(visualStringIndex);
    const y =
      fret > 0
        ? this.topPx + (fret - 0.5) * this.config.fretLengthPx // Use scaled fretLengthPx
        : this.topPx - this.config.noteRadiusPx * 1.5; // Use scaled noteRadiusPx
    return { x, y };
  }

  render(ctx: CanvasRenderingContext2D): void {
    const config = this.config; // Alias
    const scaleFactor = config.scaleFactor;
    const scaledNoteRadius = config.noteRadiusPx;

    // Clearance needed above the nut line for open notes/muted markers
    const openNoteClearance = scaledNoteRadius * 1.5 + (5 * scaleFactor);
    // The Y coordinate where the nut line (fret 0) should be drawn
    const nutLineY = this.topPx + openNoteClearance;

    const textHeight = 12 * scaleFactor;
    const stringWidths = config.getStringWidths();
    ctx.fillStyle = "#aaa"; // TODO: Theming

    // Strings - Start drawing from the calculated nutLineY
    // ... (string drawing loop remains the same) ...
    for (var visualIndex = 0; visualIndex < 6; visualIndex++) {
      const xPos = this.getStringX(visualIndex);
      ctx.beginPath();
      ctx.lineWidth = stringWidths[visualIndex];
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

    // Define the horizontal offset for side numbers
    const sideNumberOffsetX = 18 * scaleFactor; // Increased from 10 * scaleFactor

    for (var i = 0; i <= this.fretCount; i++) {
      const yPos = nutLineY + i * config.fretLengthPx;
      const hasSideNumber = !!config.sideNumbers[i];

      // Set Line Width based on fret
      if (i === 0) ctx.lineWidth = boldFretLineWidth;
      else if (hasSideNumber) ctx.lineWidth = boldFretLineWidth;
      else ctx.lineWidth = defaultFretLineWidth;

      // Draw Fret Line
      ctx.beginPath();
      ctx.moveTo(this.leftPx, yPos);
      ctx.lineTo(this.leftPx + totalBoardWidth, yPos);
      ctx.stroke();

      // Side Numbers
      if (hasSideNumber) {
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        // *** FIX: Use increased offset ***
        ctx.fillText(
          config.sideNumbers[i],
          this.leftPx - sideNumberOffsetX, // Use the defined offset
          nutLineY + (i - 0.5) * config.fretLengthPx
        );
      }

      // Marker Dots
      // ... (marker dot logic remains the same) ...
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
    // Reset context properties
    ctx.textAlign = "left";
    ctx.lineWidth = 1;
  }


  /**
   * Renders a fingering dot/label on the fretboard.
   * Uses the effective color scheme (override or config default).
   */
  renderFingering(
    ctx: CanvasRenderingContext2D,
    fret: number,
    stringIndex: number,
    noteName: string,
    intervalLabel: string,
    label: string, // This is the text to display (usually noteName or finger number)
    noteRadiusPx: number, // Base radius expected (will be scaled internally if needed)
    fontSize: number,     // Base font size expected (will be scaled internally)
    drawStar = false,
    strokeColor = "black",
    lineWidth = 1,
    radiusOverride?: number,
    colorSchemeOverride?: FretboardColorScheme
  ): void {
    const visualStringIndex = (this.config.handedness === 'left') ? 5 - stringIndex : stringIndex;
    const x = this.getStringX(visualStringIndex); // Already uses scaled spacing via config
    const scaleFactor = this.config.scaleFactor;
    const scaledRadius = (radiusOverride ?? this.config.noteRadiusPx); // Use scaled radius from config or override
    const scaledLineWidth = lineWidth * scaleFactor;
    const baseFontSize = fret === 0 && radiusOverride ? fontSize * 0.8 : fontSize; // Adjust base size for open override
    const effectiveFontSize = baseFontSize * scaleFactor; // Scale font size

    // Y position of the nut line (fret 0)
    const openNoteClearance = this.config.noteRadiusPx * 1.5 + (5 * scaleFactor); // Space reserved above nut
    const nutLineY = this.topPx + openNoteClearance;

    // --- ADJUSTED Y CALCULATION ---
    let y: number;
    if (fret > 0) {
      // Fretted notes: Position relative to the nut line
      y = nutLineY + (fret - 0.5) * this.config.fretLengthPx; // Use scaled fret length
    } else {
      // Open notes (fret === 0): Position center so bottom edge + text buffer is above nutLineY
      const textBuffer = 5 * scaleFactor; // Extra buffer below the circle for the text label
      y = nutLineY - scaledRadius - textBuffer; // Calculate center Y position
      // Ensure y doesn't go negative if clearance is very small (edge case)
      y = Math.max(scaledRadius, y); // Ensure center is at least radius distance from canvas top (0)
    }
    // --- END ADJUSTED Y CALCULATION ---

    ctx.save();
    const effectiveColorScheme = colorSchemeOverride ?? this.config.colorScheme;
    const bgColor = getColorFromScheme(effectiveColorScheme, noteName, intervalLabel);
    // Determine foreground color based on background brightness (simple version)
     const r = parseInt(bgColor.slice(1, 3), 16);
     const g = parseInt(bgColor.slice(3, 5), 16);
     const b = parseInt(bgColor.slice(5, 7), 16);
     const brightness = (r * 299 + g * 587 + b * 114) / 1000;
     const fgColor = brightness > 150 ? "#333" : "#eee"; // Dark text on light bg, light text on dark bg


    ctx.fillStyle = bgColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = scaledLineWidth;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (fret >= 0) { // Muted strings (fret === -1) are handled below
      ctx.beginPath();
      ctx.arc(x, y, scaledRadius, 0, 2 * Math.PI); // Use calculated y and scaled radius

      // Fill/Stroke logic
      const isDefaultOpenOutline = (fret === 0 && effectiveColorScheme === 'default');
      if (!isDefaultOpenOutline && bgColor !== 'transparent') {
           ctx.fill(); // Fill unless it's a default open string or transparent
       }
       if (bgColor !== 'transparent') {
           ctx.stroke(); // Always stroke unless transparent
       }


      if (label !== "") {
        ctx.fillStyle = fgColor; // Use calculated fgColor
        ctx.font = effectiveFontSize + "px Sans-serif";
        // Adjust text Y position slightly for better centering within the circle
        const textYOffset = effectiveFontSize * 0.1; // Small adjustment factor
        ctx.fillText(label, x, y + textYOffset);
      }
      if (drawStar) {
        ctx.fillStyle = fgColor; // Use calculated fgColor
        this.drawStar(ctx, x, y, scaledRadius * 0.6, 5, 2); // Use scaled radius
      }
    } else { // Fret is -1 (muted) - Draw relative to nutLineY
       // visualStringIndex calculation should be outside the fret check? No, it's correct here.
       this.drawMutedString(ctx, visualStringIndex, this.config.noteRadiusPx, nutLineY); // Pass nutLineY
    }
    ctx.restore();
  }

  // Update drawMutedString to accept nutLineY
  drawMutedString(
    ctx: CanvasRenderingContext2D,
    visualStringIndex: number,
    scaledRadiusPx: number, // Expect scaled radius
    nutLineY: number // Position relative to the nut line
  ): void {
    const x = this.getStringX(visualStringIndex); // Already scaled
    // Position above the nut line, similar to open notes visually
    const y = nutLineY - scaledRadiusPx * 1.5;
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

  renderTextLabel(
    ctx: CanvasRenderingContext2D,
    fret: number,
    stringIndex: number,
    label: string,
    fontSize: number,
    fontWidth: number,
    font: string,
    bgColor = "white",
    fgColor = "black"
  ): void {
    const visualStringIndex = (this.config.handedness === 'left') ? 5 - stringIndex : stringIndex;
    const x = this.getStringX(visualStringIndex); // Already scaled
    // Use scaled fretLengthPx for y position
    const y = this.topPx + (fret - 0.5) * this.config.fretLengthPx;
    ctx.save();
    ctx.strokeStyle = bgColor;
    // Scale font width and font size
    const effectiveFontWidth = (fontWidth > 0 ? fontWidth : 3) * this.config.scaleFactor;
    const effectiveFontSize = fontSize * this.config.scaleFactor;
    ctx.lineWidth = effectiveFontWidth;
    ctx.fillStyle = fgColor;
    // Apply scaled font size to the font string (assuming format like "12px Sans-serif")
    const fontParts = font.trim().split(' ');
    const scaledFont = `${effectiveFontSize}px ${fontParts.slice(1).join(' ')}`;
    ctx.font = scaledFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(label, x, y);
    ctx.fillText(label, x, y);
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
}

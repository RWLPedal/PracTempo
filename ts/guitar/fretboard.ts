import { NOTE_RADIUS_PX } from "./guitar_utils";

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

export class FretboardConfig {
  constructor(
    public readonly tuning: Tuning,
    public readonly handedness: "right" | "left" = "right",
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
    public readonly stringWidths = [
      3,
      3,
      2,
      2,
      1,
      1, // Thickest (E) to thinnest (e)
    ],
    public readonly stringSpacingPx = 32,
    public readonly fretLengthPx = 39,
    public readonly markerDotRadiusPx = 7
  ) {}

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

  /** Calculates the canvas coordinates for the center of a note position. */
  getNoteCoordinates(
    stringIndex: number,
    fret: number
  ): { x: number; y: number } {
    const visualStringIndex = this.getStringIndex(stringIndex);
    const x = this.getStringX(visualStringIndex);
    // Y position: centered between frets for fretted notes, above nut for open strings
    const y =
      fret > 0
        ? this.topPx + (fret - 0.5) * this.config.fretLengthPx
        : this.topPx - NOTE_RADIUS_PX * 1.5;
    return { x, y };
  }

  render(ctx: CanvasRenderingContext2D): void {
    const textHeight = 12;
    const stringWidths = this.config.getStringWidths();

    ctx.fillStyle = "#aaa";

    // Strings
    for (var visualIndex = 0; visualIndex < 6; visualIndex++) {
      const xPos = this.getStringX(visualIndex);
      ctx.beginPath();
      ctx.lineWidth = stringWidths[visualIndex];
      ctx.moveTo(xPos, this.topPx);
      ctx.lineTo(xPos, this.topPx + this.fretCount * this.config.fretLengthPx);
      ctx.strokeStyle = "#aaa";
      ctx.stroke();
    }

    // Frets & Markers
    ctx.lineWidth = 2; // Nut width
    ctx.font = textHeight + "px Sans-serif";
    ctx.strokeStyle = "black";
    ctx.fillStyle = "#aaa";

    const totalBoardWidth = 5 * this.config.stringSpacingPx;
    const boardCenterX = this.leftPx + totalBoardWidth / 2;

    for (var i = 0; i <= this.fretCount; i++) {
      const yPos = this.topPx + i * this.config.fretLengthPx;
      ctx.beginPath();
      ctx.moveTo(this.leftPx, yPos);
      ctx.lineTo(this.leftPx + totalBoardWidth, yPos);
      ctx.stroke();
      ctx.lineWidth = 1; // Reset for subsequent frets

      // Side Numbers
      if (this.config.sideNumbers[i]) {
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(
          this.config.sideNumbers[i],
          this.leftPx - 10,
          this.topPx + (i - 0.5) * this.config.fretLengthPx
        );
      }

      // Marker Dots
      const markerY = this.topPx + (i - 0.5) * this.config.fretLengthPx;
      if (this.config.markerDots[i] === 1) {
        ctx.beginPath();
        ctx.arc(
          boardCenterX,
          markerY,
          this.config.markerDotRadiusPx,
          0,
          2 * Math.PI
        );
        ctx.fill();
      } else if (this.config.markerDots[i] === 2) {
        ctx.beginPath();
        ctx.arc(
          this.leftPx + 1.5 * this.config.stringSpacingPx,
          markerY,
          this.config.markerDotRadiusPx,
          0,
          2 * Math.PI
        );
        ctx.fill();
        ctx.beginPath();
        ctx.arc(
          this.leftPx + 3.5 * this.config.stringSpacingPx,
          markerY,
          this.config.markerDotRadiusPx,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
    }
    ctx.textAlign = "left";
  }

  renderFingering(
    ctx: CanvasRenderingContext2D,
    fret: number,
    string: number,
    label: string,
    noteRadiusPx: number,
    fontSize: number,
    bgColor = "black",
    fgColor = "white",
    drawStar = false,
    strokeColor = "black",
    lineWidth = 1,
    radiusOverride?: number
  ): void {
    const visualStringIndex = this.getStringIndex(string);
    const x = this.getStringX(visualStringIndex);
    const yPosFretted = this.topPx + (fret - 0.5) * this.config.fretLengthPx;
    const yPosOpenOrMuted = this.topPx - noteRadiusPx * 1.5;
    const effectiveRadius = radiusOverride ?? noteRadiusPx;

    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (fret >= 0) {
      const y = fret > 0 ? yPosFretted : yPosOpenOrMuted;
      ctx.beginPath();
      ctx.arc(x, y, effectiveRadius, 0, 2 * Math.PI);
      if (fret > 0) {
        ctx.fill();
      }
      ctx.stroke();

      if (label !== "") {
        const effectiveFontSize =
          fret === 0 && radiusOverride ? fontSize * 0.8 : fontSize;
        ctx.fillStyle = fret > 0 ? fgColor : "black";
        ctx.font = effectiveFontSize + "px Sans-serif";
        ctx.fillText(label, x, y + 1);
      }
      if (drawStar) {
        ctx.fillStyle = fgColor;
        this.drawStar(ctx, x, y, effectiveRadius * 0.6, 5, 2);
      }
    } else {
      this.drawMutedString(ctx, visualStringIndex, noteRadiusPx);
    }
    ctx.restore();
  }

  renderTextLabel(
    ctx: CanvasRenderingContext2D,
    fret: number,
    string: number,
    label: string,
    fontSize: number,
    fontWidth: number,
    font: string,
    bgColor = "white",
    fgColor = "black"
  ): void {
    const visualStringIndex = this.getStringIndex(string);
    const x = this.getStringX(visualStringIndex);
    const y = this.topPx + (fret - 0.5) * this.config.fretLengthPx;
    ctx.save();
    ctx.strokeStyle = bgColor;
    ctx.lineWidth = fontWidth > 0 ? fontWidth : 3;
    ctx.fillStyle = fgColor;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(label, x, y);
    ctx.fillText(label, x, y);
    ctx.restore();
  }

  drawMutedString(
    ctx: CanvasRenderingContext2D,
    visualStringIndex: number,
    radiusPx: number
  ): void {
    const x = this.getStringX(visualStringIndex);
    const y = this.topPx - radiusPx * 1.5;
    const size = radiusPx * 0.55;

    ctx.save();
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1.5;
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
}

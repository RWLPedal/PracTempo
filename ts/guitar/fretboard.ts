import {
  NOTE_RADIUS_PX,
  START_PX,
  OPEN_NOTE_RADIUS_FACTOR,
} from "./guitar_utils";
import { FretboardColorScheme, getColor as getColorFromScheme } from "./colors";

export enum NoteIcon {
  None = "none",
  Star = "star",
  Circle = "circle", // Example: Small inner circle
  Square = "square", // Example: Small inner square
  Triangle = "triangle", // Example: Small inner triangle
}

export interface NoteRenderData {
  fret: number; // -1 for muted, 0 for open
  stringIndex: number;
  noteName: string; // For coloring or display fallback
  intervalLabel: string; // For coloring
  displayLabel?: string; // Optional explicit label override
  fillColor?: string | string[]; // Explicit fill color(s) (up to 2 for split)
  strokeColor?: string | string[]; // Explicit stroke color(s) (up to 2 for split)
  strokeWidth?: number; // Explicit stroke width (unscaled)
  icon?: NoteIcon; // Icon to display instead of text label
  colorSchemeOverride?: FretboardColorScheme; // Override global scheme for this note
  radiusOverride?: number; // Scaled override for radius (e.g., open notes)
  // Coords are calculated internally, not passed in
}

export interface LineData {
  startX: number; // Scaled coordinate
  startY: number; // Scaled coordinate
  endX: number; // Scaled coordinate
  endY: number; // Scaled coordinate
  color: string;
  strokeWidth?: number; // Unscaled width
  dashed?: boolean;
}

// --- FretboardConfig Class ---
// (Includes globalScaleMultiplier modification from previous step)
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
    maxCanvasHeight?: number,
    globalScaleMultiplier: number = 1.0
  ) {
    const DEFAULT_FRETBOARD_DRAW_HEIGHT = 650;
    const ESTIMATED_FRETS_FOR_SCALING = 18;
    const actualMaxHeight = maxCanvasHeight ?? DEFAULT_FRETBOARD_DRAW_HEIGHT;
    const estimatedBaseHeight =
      this.baseFretLengthPx * ESTIMATED_FRETS_FOR_SCALING + 80;
    this.scaleFactor =
      Math.min(1.0, actualMaxHeight / estimatedBaseHeight) *
      globalScaleMultiplier;

    this.stringSpacingPx = this.baseStringSpacingPx * this.scaleFactor;
    this.fretLengthPx = this.baseFretLengthPx * this.scaleFactor;
    this.markerDotRadiusPx = this.baseMarkerDotRadiusPx * this.scaleFactor;
    this.noteRadiusPx = this.baseNoteRadiusPx * this.scaleFactor;
  }

  getStringWidths(): Array<number> {
    return this.handedness === "left"
      ? [...this.stringWidths].reverse()
      : this.stringWidths;
  }
}

// --- Tuning Definitions ---
export class Tuning {
  constructor(public readonly tuning: Array<number>) {}
}
export const STANDARD_TUNING = new Tuning([7, 0, 5, 10, 2, 7]);
export const DROP_D_TUNING = new Tuning([5, 0, 5, 10, 2, 7]);
export const AVAILABLE_TUNINGS = {
  Standard: STANDARD_TUNING,
  "Drop D": DROP_D_TUNING,
};
export type TuningName = keyof typeof AVAILABLE_TUNINGS;

// --- Fretboard Class ---
export class Fretboard {
  private notesToRender: NoteRenderData[] = [];
  private linesToRender: LineData[] = [];
  // Calculated positions (relative to internal origin)
  private nutLineY = 0;
  private absoluteTopPx = 0; // Y coordinate for the very top drawing bound (fretboard's topPx)
  private absoluteLeftPx = 0; // X coordinate for the very left drawing bound (fretboard's leftPx)

  constructor(
    public readonly config: FretboardConfig,
    public readonly leftPx = 45, // Base X position on canvas for drawing start
    public readonly topPx = 45, // Base Y position on canvas for drawing start
    public readonly fretCount: number
  ) {
    // Pre-calculate positions based on scaled config
    const scaleFactor = this.config.scaleFactor;
    const scaledNoteRadius = this.config.noteRadiusPx;
    this.absoluteLeftPx = this.leftPx;
    this.absoluteTopPx = this.topPx;
    // Clearance needed above the nut line
    const openNoteClearance = scaledNoteRadius * 1.5 + 5 * scaleFactor;
    // The Y coordinate where the nut line (fret 0) should be drawn relative to this.topPx
    this.nutLineY = this.absoluteTopPx + openNoteClearance;
  }

  // --- Public Data Setting Methods ---
  public setNotes(notes: NoteRenderData[]): void {
    this.notesToRender = notes;
  }
  public setLines(lines: LineData[]): void {
    this.linesToRender = lines;
  }
  public clearMarkings(): void {
    this.notesToRender = [];
    this.linesToRender = [];
  }

  // --- Coordinate and Grid Logic ---
  private getStringIndex(visualIndex: number): number {
    return this.config.handedness === "left" ? 5 - visualIndex : visualIndex;
  }
  private getStringX(visualIndex: number): number {
    return this.absoluteLeftPx + visualIndex * this.config.stringSpacingPx;
  }
  /** Calculates the X, Y coordinates for the center of a note circle on the canvas. */
  getNoteCoordinates(
    stringIndex: number,
    fret: number
  ): { x: number; y: number } {
    const visualStringIndex =
      this.config.handedness === "left" ? 5 - stringIndex : stringIndex;
    const x = this.getStringX(visualStringIndex);
    let y: number;
    if (fret > 0) {
      y = this.nutLineY + (fret - 0.5) * this.config.fretLengthPx;
    } else {
      const textBuffer = 5 * this.config.scaleFactor;
      y = this.nutLineY - this.config.noteRadiusPx - textBuffer;
      y = Math.max(this.absoluteTopPx + this.config.noteRadiusPx, y);
    }
    return { x, y };
  }

  // --- Main Render Method ---
  render(ctx: CanvasRenderingContext2D): void {
    this._renderGrid(ctx);
    this._renderLines(ctx); // Draw lines first (underneath notes)
    this._renderNotes(ctx); // Draw notes on top
  }

  // --- Private Rendering Helpers ---

  private _renderGrid(ctx: CanvasRenderingContext2D): void {
    const config = this.config;
    const scaleFactor = config.scaleFactor;
    const textHeight = 12 * scaleFactor;
    const stringWidths = config.getStringWidths();
    ctx.fillStyle = "#aaa"; // Grid color

    // Strings
    for (var visualIndex = 0; visualIndex < 6; visualIndex++) {
      const xPos = this.getStringX(visualIndex);
      ctx.beginPath();
      ctx.lineWidth = stringWidths[visualIndex] * scaleFactor; // Scale string width
      ctx.moveTo(xPos, this.nutLineY);
      const stringBottomY =
        this.nutLineY + this.fretCount * config.fretLengthPx;
      ctx.lineTo(xPos, stringBottomY);
      ctx.strokeStyle = "#aaa";
      ctx.stroke();
    }

    // Frets & Markers
    ctx.font = textHeight + "px Sans-serif";
    ctx.strokeStyle = "#555"; // Fret color
    ctx.fillStyle = "#aaa"; // Marker color

    const totalBoardWidth = 5 * config.stringSpacingPx;
    const boardCenterX = this.absoluteLeftPx + totalBoardWidth / 2;
    const defaultFretLineWidth = 1 * scaleFactor;
    const boldFretLineWidth = 2 * scaleFactor;
    const sideNumberOffsetX = 18 * scaleFactor;

    for (var i = 0; i <= this.fretCount; i++) {
      const yPos = this.nutLineY + i * config.fretLengthPx;
      const hasSideNumber = !!config.sideNumbers[i];

      if (i === 0) ctx.lineWidth = boldFretLineWidth * 1.5; // Thicker nut
      else if (hasSideNumber) ctx.lineWidth = boldFretLineWidth;
      else ctx.lineWidth = defaultFretLineWidth;

      ctx.beginPath();
      ctx.moveTo(this.absoluteLeftPx, yPos);
      ctx.lineTo(this.absoluteLeftPx + totalBoardWidth, yPos);
      ctx.stroke();

      if (hasSideNumber && i > 0) {
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(
          config.sideNumbers[i],
          this.absoluteLeftPx - sideNumberOffsetX,
          this.nutLineY + (i - 0.5) * config.fretLengthPx
        );
      }

      const markerY = this.nutLineY + (i - 0.5) * config.fretLengthPx;
      const scaledMarkerRadius = config.markerDotRadiusPx;
      if (config.markerDots[i] === 1) {
        ctx.beginPath();
        ctx.arc(boardCenterX, markerY, scaledMarkerRadius, 0, 2 * Math.PI);
        ctx.fill();
      } else if (config.markerDots[i] === 2) {
        const markerX1 = this.absoluteLeftPx + 1.5 * config.stringSpacingPx;
        const markerX2 = this.absoluteLeftPx + 3.5 * config.stringSpacingPx;
        ctx.beginPath();
        ctx.arc(markerX1, markerY, scaledMarkerRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(markerX2, markerY, scaledMarkerRadius, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    ctx.textAlign = "left";
    ctx.lineWidth = 1; // Reset default line width
  }

  private _renderLines(ctx: CanvasRenderingContext2D): void {
    const scaleFactor = this.config.scaleFactor;
    ctx.save();
    this.linesToRender.forEach((line) => {
      ctx.strokeStyle = line.color || "grey";
      // Use provided strokeWidth (unscaled) and apply scaling factor
      ctx.lineWidth = (line.strokeWidth || 2) * scaleFactor;
      if (line.dashed) {
        const dashLength = 4 * scaleFactor;
        ctx.setLineDash([dashLength, dashLength]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(line.startX, line.startY); // Use pre-calculated scaled coords
      ctx.lineTo(line.endX, line.endY);
      ctx.stroke();
    });
    ctx.restore();
  }

  private _renderNotes(ctx: CanvasRenderingContext2D): void {
    const scaleFactor = this.config.scaleFactor;
    const baseFontSize = 16 * scaleFactor; // Base scaled font size
    const baseNoteRadius = this.config.noteRadiusPx; // Base scaled radius

    this.notesToRender.forEach((noteData) => {
      if (noteData.fret === -1) {
        // Handle muted string
        const visualStringIndex =
          this.config.handedness === "left"
            ? 5 - noteData.stringIndex
            : noteData.stringIndex;
        this._drawMutedString(ctx, visualStringIndex, baseNoteRadius);
      } else {
        // Handle open or fretted note
        const { x, y } = this.getNoteCoordinates(
          noteData.stringIndex,
          noteData.fret
        );
        const effectiveRadius =
          noteData.radiusOverride ??
          (noteData.fret === 0
            ? baseNoteRadius * OPEN_NOTE_RADIUS_FACTOR
            : baseNoteRadius);
        const effectiveStrokeWidth = (noteData.strokeWidth ?? 1) * scaleFactor;
        const effectiveColorScheme =
          noteData.colorSchemeOverride ?? this.config.colorScheme;

        // Determine Fill Color
        let finalFillColor: string | string[] =
          noteData.fillColor ||
          getColorFromScheme(
            effectiveColorScheme,
            noteData.noteName,
            noteData.intervalLabel
          );

        // Determine Stroke Color
        let finalStrokeColor: string | string[] =
          noteData.strokeColor || "black"; // Default stroke

        // Determine FG color (for text/icon) based on primary fill
        const primaryFill = Array.isArray(finalFillColor)
          ? finalFillColor[0]
          : finalFillColor;
        let fgColor = "#eee"; // Default light text
        if (primaryFill !== "transparent") {
          try {
            const r = parseInt(primaryFill.slice(1, 3), 16);
            const g = parseInt(primaryFill.slice(3, 5), 16);
            const b = parseInt(primaryFill.slice(5, 7), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            fgColor = brightness > 150 ? "#333" : "#eee"; // Dark text on light bg
          } catch (e) {
            /* Keep default fgColor if parsing fails */
          }
        }

        // Draw Circle(s)
        this._drawCircle(
          ctx,
          x,
          y,
          effectiveRadius,
          finalFillColor,
          finalStrokeColor,
          effectiveStrokeWidth
        );

        // Determine Content Hierarchy
        let contentToDraw: string | null = null;
        let drawIconType: NoteIcon | undefined =
          noteData.icon && noteData.icon !== NoteIcon.None
            ? noteData.icon
            : undefined;

        if (!drawIconType) {
          if (
            noteData.displayLabel !== undefined &&
            noteData.displayLabel !== ""
          ) {
            contentToDraw = noteData.displayLabel;
          } else {
            contentToDraw = noteData.noteName;
          }
        }

        // Draw Content (Icon or Text)
        if (drawIconType) {
          this._drawIcon(ctx, drawIconType, x, y, effectiveRadius, fgColor);
        } else if (contentToDraw) {
          const effectiveFontSize =
            noteData.fret === 0 && noteData.radiusOverride === undefined
              ? baseFontSize * 0.85
              : baseFontSize; // Adjust for smaller open notes
          this._drawText(ctx, contentToDraw, x, y, effectiveFontSize, fgColor);
        }
      }
    });
  }

  // --- Private Drawing Helpers ---

  private _drawCircle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    fill: string | string[],
    stroke: string | string[],
    strokeWidth: number
  ): void {
    ctx.save();
    ctx.lineWidth = strokeWidth;

    if (Array.isArray(fill) || Array.isArray(stroke)) {
      // Split Circle Logic
      const topFill = Array.isArray(fill) ? fill[0] : fill;
      const bottomFill = Array.isArray(fill) ? fill[1] ?? fill[0] : fill;
      const topStroke = Array.isArray(stroke) ? stroke[0] : stroke;
      const bottomStroke = Array.isArray(stroke)
        ? stroke[1] ?? stroke[0]
        : stroke;

      // Top Half
      ctx.beginPath();
      ctx.arc(x, y, radius, Math.PI, 0); // Top semi-circle path
      if (topFill !== "transparent") {
        ctx.fillStyle = topFill;
        ctx.fill();
      }
      if (topStroke !== "transparent") {
        ctx.strokeStyle = topStroke;
        ctx.stroke();
      }

      // Bottom Half
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI); // Bottom semi-circle path
      if (bottomFill !== "transparent") {
        ctx.fillStyle = bottomFill;
        ctx.fill();
      }
      if (bottomStroke !== "transparent") {
        ctx.strokeStyle = bottomStroke;
        ctx.stroke();
      }
    } else {
      // Solid Circle Logic
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      if (fill !== "transparent") {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke !== "transparent") {
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private _drawMutedString(
    ctx: CanvasRenderingContext2D,
    visualStringIndex: number,
    baseScaledRadius: number
  ): void {
    const x = this.getStringX(visualStringIndex);
    // Position above the nut line
    const y = this.nutLineY - baseScaledRadius * 1.5;
    const size = baseScaledRadius * 0.55; // Size based on note radius

    ctx.save();
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1.5 * this.config.scaleFactor;
    ctx.beginPath();
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.moveTo(x + size, y - size);
    ctx.lineTo(x - size, y + size);
    ctx.stroke();
    ctx.restore();
  }

  private _drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    color: string
  ): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px Sans-serif`; // Consider making font configurable
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textYOffset = fontSize * 0.05; // Small adjustment for visual centering
    ctx.fillText(text, x, y + textYOffset);
    ctx.restore();
  }

  private _drawIcon(
    ctx: CanvasRenderingContext2D,
    icon: NoteIcon,
    x: number,
    y: number,
    radius: number,
    color: string
  ): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color; // Icons are typically solid color
    ctx.lineWidth = 1 * this.config.scaleFactor; // Thin line for icons

    const iconSize = radius * 0.7; // Size relative to note radius

    switch (icon) {
      case NoteIcon.Star:
        this._drawStarIcon(ctx, x, y, iconSize); // Call helper
        break;
      case NoteIcon.Circle:
        ctx.beginPath();
        ctx.arc(x, y, iconSize / 2, 0, 2 * Math.PI);
        //ctx.fill(); // Fill or stroke for circle? Let's stroke.
        ctx.stroke();
        break;
      case NoteIcon.Square:
        ctx.fillRect(x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
        break;
      case NoteIcon.Triangle:
        ctx.beginPath();
        ctx.moveTo(x, y - iconSize / 1.7); // Top point
        ctx.lineTo(x + iconSize / 1.7, y + iconSize / 3.4); // Bottom right
        ctx.lineTo(x - iconSize / 1.7, y + iconSize / 3.4); // Bottom left
        ctx.closePath();
        ctx.fill();
        break;
      // Add cases for other icons
      case NoteIcon.None:
      default:
        break; // Do nothing
    }
    ctx.restore();
  }

  private _drawStarIcon(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outerRadius: number
  ): void {
    const spikes = 5;
    const innerRadius = outerRadius * 0.4; // Adjust for star point sharpness
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill(); // Fill the star
  }
}

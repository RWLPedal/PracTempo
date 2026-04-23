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
  startX: number; // Canvas coordinate (already transformed for orientation)
  startY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth?: number; // Unscaled width
  dashed?: boolean;
}

/** An outlined rounded rectangle drawn around a region of the fretboard. */
export interface RoundedRectData {
  /** Inclusive fret range (actual fret numbers, matching NoteRenderData.fret). */
  fretStart: number;
  fretEnd: number;
  /** Inclusive string index range. */
  stringStart: number;
  stringEnd: number;
  /** Stroke (outline) color. */
  color: string;
  /** Optional fill color. Defaults to transparent (outline only). */
  fillColor?: string;
  /** Unscaled stroke width. Defaults to 2. */
  strokeWidth?: number;
  /** Unscaled padding beyond the note radius on each side. Defaults to 4. */
  padding?: number;
  /**
   * When true, automatically splits the rectangle at non-standard string
   * interval boundaries (e.g. the G–B boundary in standard tuning), offsetting
   * each segment's fret range by the accumulated interval deviation. Defaults to true.
   */
  autoSplit?: boolean;
}

/** A barre chord bar drawn as a filled pill spanning multiple strings at one fret. */
export interface BarreData {
  /** Actual fret number (must be > 0). */
  fret: number;
  /** String index of one end of the barre (inclusive). */
  stringStart: number;
  /** String index of the other end of the barre (inclusive). */
  stringEnd: number;
  /** Fill color of the barre bar. Defaults to "#777". */
  color?: string;
}

// --- String width presets by string count ---
const STRING_WIDTH_PRESETS: Record<number, number[]> = {
  4: [3, 2, 2, 1],
  5: [3, 2, 2, 1, 1],
  6: [3, 3, 2, 2, 1, 1],
  7: [3, 3, 2, 2, 1, 1, 1],
  8: [3, 3, 2, 2, 1, 1, 1, 1],
};

function defaultStringWidths(stringCount: number): number[] {
  return STRING_WIDTH_PRESETS[stringCount] ?? Array(stringCount).fill(1);
}

// --- FretboardConfig Class ---
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
  public readonly stringWidths: number[];

  constructor(
    public readonly tuning: Tuning,
    public readonly handedness: "right" | "left" = "right",
    public readonly orientation: "vertical" | "horizontal" = "vertical",
    public readonly colorScheme: FretboardColorScheme = "interval",
    public readonly markerDots = [
      0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 2, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0,
    ],
    public readonly sideNumbers = [
      "", "", "", "III", "", "V", "", "VII", "", "IX", "", "",
      "XII", "", "", "XV", "", "XVII", "", "XIX", "", "XXI", "",
    ],
    stringWidths?: number[],
    maxCanvasHeight?: number,
    globalScaleMultiplier: number = 1.0
  ) {
    this.stringWidths = stringWidths ?? defaultStringWidths(tuning.tuning.length);

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

  get stringCount(): number {
    return this.tuning.tuning.length;
  }

  getStringWidths(): Array<number> {
    return this.handedness === "left"
      ? [...this.stringWidths].reverse()
      : this.stringWidths;
  }

  /**
   * Returns the canvas width needed to render the fretboard with the given fret count,
   * accounting for orientation. External code should call this instead of computing
   * dimensions independently.
   */
  getRequiredWidth(fretCount: number): number {
    const scaledStartPx = START_PX * this.scaleFactor;
    const stringSpan = (this.stringCount - 1) * this.stringSpacingPx;
    if (this.orientation === "horizontal") {
      // Width is along the fret direction
      const openNoteClearance = this.noteRadiusPx * 1.5 + 5 * this.scaleFactor;
      const fretboardLength = fretCount * this.fretLengthPx;
      const bottomClearance = this.noteRadiusPx + 5 * this.scaleFactor;
      return scaledStartPx + openNoteClearance + fretboardLength + bottomClearance + scaledStartPx;
    }
    // Vertical: width is along the string direction
    return scaledStartPx + stringSpan + scaledStartPx;
  }

  /**
   * Returns the canvas height needed to render the fretboard with the given fret count,
   * accounting for orientation.
   */
  getRequiredHeight(fretCount: number): number {
    const scaledStartPx = START_PX * this.scaleFactor;
    const stringSpan = (this.stringCount - 1) * this.stringSpacingPx;
    if (this.orientation === "horizontal") {
      // Height is along the string direction
      return scaledStartPx + stringSpan + scaledStartPx;
    }
    // Vertical: height is along the fret direction
    const openNoteClearance = this.noteRadiusPx * 1.5 + 5 * this.scaleFactor;
    const fretboardLength = fretCount * this.fretLengthPx;
    const bottomClearance = this.noteRadiusPx + 5 * this.scaleFactor;
    return scaledStartPx + openNoteClearance + fretboardLength + bottomClearance + scaledStartPx;
  }
}

// --- Tuning Definitions ---
export class Tuning {
  constructor(public readonly tuning: Array<number>) {}
}

// Guitar tunings (6-string, semitones with A=0)
export const STANDARD_TUNING              = new Tuning([7, 0, 5, 10, 2, 7]);     // E-A-D-G-B-E
export const DROP_D_TUNING                = new Tuning([5, 0, 5, 10, 2, 7]);     // D-A-D-G-B-E
export const BARITONE_B_STANDARD_TUNING   = new Tuning([2, 7, 0, 5, 9, 2]);      // B-E-A-D-F#-B
export const BARITONE_A_STANDARD_TUNING   = new Tuning([0, 5, 10, 3, 7, 0]);     // A-D-G-C-E-A

// Bass tunings (4-string)
export const BASS_STANDARD_TUNING         = new Tuning([7, 0, 5, 10]);           // E-A-D-G

// Ukulele tunings (4-string)
export const UKULELE_GCEA_TUNING          = new Tuning([10, 3, 7, 0]);           // G-C-E-A

// Mandolin-family tunings (4-string, tuned in 5ths)
export const MANDOLA_TUNING               = new Tuning([3, 10, 5, 0]);           // C-G-D-A
export const MANDOLIN_TUNING              = new Tuning([10, 5, 0, 7]);           // G-D-A-E

// Extended-range guitar tunings
export const GUITAR_7_STANDARD_TUNING     = new Tuning([2, 7, 0, 5, 10, 2, 7]); // B-E-A-D-G-B-E
export const GUITAR_8_STANDARD_TUNING     = new Tuning([9, 2, 7, 0, 5, 10, 2, 7]); // F#-B-E-A-D-G-B-E

// --- Instrument / Tuning Organization ---
export type InstrumentName =
  | "Guitar"
  | "Bass"
  | "Ukulele"
  | "Mandola"
  | "Mandolin"
  | "7-String Guitar"
  | "8-String Guitar";

export const INSTRUMENT_TUNINGS: Record<InstrumentName, Record<string, Tuning>> = {
  "Guitar": {
    "Standard":            STANDARD_TUNING,
    "Drop D":              DROP_D_TUNING,
    "Baritone B Standard": BARITONE_B_STANDARD_TUNING,
    "Baritone A Standard": BARITONE_A_STANDARD_TUNING,
  },
  "Bass": {
    "EADG (Standard)": BASS_STANDARD_TUNING,
  },
  "Ukulele": {
    "GCEA (Standard)": UKULELE_GCEA_TUNING,
  },
  "Mandola": {
    "CGDA (Standard)": MANDOLA_TUNING,
  },
  "Mandolin": {
    "GDAE (Standard)": MANDOLIN_TUNING,
  },
  "7-String Guitar": {
    "Standard (BEADGBE)": GUITAR_7_STANDARD_TUNING,
  },
  "8-String Guitar": {
    "Standard (F#BEADGBE)": GUITAR_8_STANDARD_TUNING,
  },
};

// Flat alias for backward compatibility — saved schedules with tuning:"Standard" etc. still resolve.
export const AVAILABLE_TUNINGS: Record<string, Tuning> = Object.assign(
  {},
  ...Object.values(INSTRUMENT_TUNINGS)
);
export type TuningName = keyof typeof AVAILABLE_TUNINGS;

// --- Fretboard Class ---
export class Fretboard {
  private notesToRender: NoteRenderData[] = [];
  private linesToRender: LineData[] = [];
  private roundedRectsToRender: RoundedRectData[] = [];
  private barresToRender: BarreData[] = [];
  private startFret: number = 0; // Store the starting fret for rendering
  // Calculated positions (relative to internal origin)
  private nutLineY = 0;
  private absoluteTopPx = 0; // Y coordinate for the very top drawing bound
  private absoluteLeftPx = 0; // X coordinate for the very left drawing bound
  /**
   * The width the canvas would have in vertical orientation.
   * Used by _toCanvas() to compute horizontal coordinates.
   */
  private verticalCanvasWidth: number;
  /**
   * The width of the canvas in horizontal orientation.
   * Used by _toCanvas() to flip the fret axis for left-handed horizontal mode.
   */
  private horizontalCanvasWidth: number;

  constructor(
    public readonly config: FretboardConfig,
    public readonly leftPx = 45,
    public readonly topPx = 45,
    public readonly fretCount: number
  ) {
    const scaleFactor = this.config.scaleFactor;
    const scaledNoteRadius = this.config.noteRadiusPx;
    this.absoluteLeftPx = this.leftPx;
    this.absoluteTopPx = this.topPx;
    const openNoteClearance = scaledNoteRadius * 1.5 + 5 * scaleFactor;
    this.nutLineY = this.absoluteTopPx + openNoteClearance;
    // Vertical canvas width = left padding + (stringCount-1) spacings + right padding
    const stringSpan = (this.config.stringCount - 1) * this.config.stringSpacingPx;
    this.verticalCanvasWidth = 2 * this.leftPx + stringSpan;
    this.horizontalCanvasWidth = config.getRequiredWidth(fretCount);
  }

  // --- Public Data Setting Methods ---
  public setNotes(notes: NoteRenderData[]): void {
    this.notesToRender = notes;
  }
  public setLines(lines: LineData[]): void {
    this.linesToRender = lines;
  }
  public setRoundedRects(rects: RoundedRectData[]): void {
    this.roundedRectsToRender = rects;
  }
  public setBarres(barres: BarreData[]): void {
    this.barresToRender = barres;
  }
  public clearMarkings(): void {
    this.notesToRender = [];
    this.linesToRender = [];
    this.roundedRectsToRender = [];
    this.barresToRender = [];
  }

  /** Sets the starting fret number for the diagram display. */
  public setStartFret(fret: number): void {
    this.startFret = Math.max(0, fret);
  }

  // --- Coordinate Transform ---

  /**
   * Converts "vertical-space" coordinates (as if the fretboard were vertical) to
   * actual canvas coordinates. In vertical mode this is a no-op. In horizontal mode
   * the fretboard is rotated 90° CCW: the nut appears on the left, higher frets go
   * rightward, and strings run top-to-bottom (high-E at top for right-handed).
   *
   * Mapping: canvasX = verticalY, canvasY = verticalCanvasWidth − verticalX
   *
   * This means all text drawn at the transformed position is still upright.
   */
  private _toCanvas(vx: number, vy: number): { x: number; y: number } {
    if (this.config.orientation === "horizontal") {
      if (this.config.handedness === "left") {
        // Nut on the right; frets extend leftward. String reversal (stringCount-1 - stringIndex)
        // is already applied to vx, so canvasY = vx keeps strings in the correct
        // top-to-bottom order (high string at top, low string at bottom).
        return { x: this.horizontalCanvasWidth - vy, y: vx };
      }
      return { x: vy, y: this.verticalCanvasWidth - vx };
    }
    return { x: vx, y: vy };
  }

  // --- Coordinate and Grid Logic ---
  private getStringX(visualIndex: number): number {
    return this.absoluteLeftPx + visualIndex * this.config.stringSpacingPx;
  }

  /**
   * Calculates the canvas (x, y) coordinates for the centre of a note circle.
   * Returns coordinates in the canvas's actual coordinate system, respecting
   * both handedness and orientation.
   */
  getNoteCoordinates(
    stringIndex: number,
    fret: number // actual fret number (0 for open, >0 for fretted)
  ): { x: number; y: number } {
    const maxStringIndex = this.config.stringCount - 1;
    const visualStringIndex =
      this.config.handedness === "left" ? maxStringIndex - stringIndex : stringIndex;
    const vx = this.getStringX(visualStringIndex);

    const displayFret = fret - this.startFret;
    let vy: number;
    if (displayFret > 0) {
      vy = this.nutLineY + (displayFret - 0.5) * this.config.fretLengthPx;
    } else {
      // Open or muted — position above/before the nut line
      const textBuffer = 5 * this.config.scaleFactor;
      vy = this.nutLineY - this.config.noteRadiusPx - textBuffer;
      vy = Math.max(this.absoluteTopPx + this.config.noteRadiusPx, vy);
    }
    return this._toCanvas(vx, vy);
  }


  // --- Main Render Method ---
  render(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this._renderGrid(ctx);
    this._renderBarres(ctx);      // Behind notes
    this._renderLines(ctx);       // Behind notes
    this._renderNotes(ctx);       // Notes on top
    this._renderRoundedRects(ctx); // Outlines on top of everything
  }

  // --- Private Rendering Helpers ---

  private _renderGrid(ctx: CanvasRenderingContext2D): void {
    const config = this.config;
    const scaleFactor = config.scaleFactor;
    const textHeight = 12 * scaleFactor;
    const stringWidths = config.getStringWidths();
    const isHorizontal = config.orientation === "horizontal";
    const stringCount = config.stringCount;

    ctx.fillStyle = "#aaa";

    // --- Strings ---
    for (let visualIndex = 0; visualIndex < stringCount; visualIndex++) {
      const vx = this.getStringX(visualIndex);
      const p1 = this._toCanvas(vx, this.nutLineY);
      const p2 = this._toCanvas(vx, this.nutLineY + this.fretCount * config.fretLengthPx);

      ctx.beginPath();
      ctx.lineWidth = (stringWidths[visualIndex] ?? 1) * scaleFactor;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = "#aaa";
      ctx.stroke();
    }

    // --- Frets & Markers ---
    ctx.font = textHeight + "px Sans-serif";
    ctx.strokeStyle = "#555";
    ctx.fillStyle = "#aaa";

    const totalBoardSpan = (stringCount - 1) * config.stringSpacingPx;
    const leftEdge_v = this.absoluteLeftPx;
    const rightEdge_v = this.absoluteLeftPx + totalBoardSpan;
    const defaultFretLineWidth = 1 * scaleFactor;
    const boldFretLineWidth = 2 * scaleFactor;
    const sideNumberOffset = 18 * scaleFactor;

    // Draw the first line (nut or starting fret)
    const nutP1 = this._toCanvas(leftEdge_v, this.nutLineY);
    const nutP2 = this._toCanvas(rightEdge_v, this.nutLineY);
    ctx.beginPath();
    ctx.lineWidth = this.startFret === 0 ? boldFretLineWidth * 1.5 : boldFretLineWidth;
    ctx.moveTo(nutP1.x, nutP1.y);
    ctx.lineTo(nutP2.x, nutP2.y);
    ctx.stroke();

    // Draw subsequent fret lines
    for (let i = 1; i <= this.fretCount; i++) {
      const vy = this.nutLineY + i * config.fretLengthPx;
      const actualFretNumber = this.startFret + i;
      const hasSideNumber =
        actualFretNumber < config.sideNumbers.length &&
        !!config.sideNumbers[actualFretNumber];

      ctx.lineWidth = hasSideNumber ? boldFretLineWidth : defaultFretLineWidth;
      const fp1 = this._toCanvas(leftEdge_v, vy);
      const fp2 = this._toCanvas(rightEdge_v, vy);
      ctx.beginPath();
      ctx.moveTo(fp1.x, fp1.y);
      ctx.lineTo(fp2.x, fp2.y);
      ctx.stroke();

      // --- Side Numbers ---
      const fretMidVY = this.nutLineY + (i - 0.5) * config.fretLengthPx;
      if (hasSideNumber && actualFretNumber > 0) {
        if (isHorizontal) {
          const numVX = config.handedness === "left"
            ? rightEdge_v + sideNumberOffset
            : leftEdge_v - sideNumberOffset;
          const numPos = this._toCanvas(numVX, fretMidVY);
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(config.sideNumbers[actualFretNumber], numPos.x, numPos.y);
        } else {
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          ctx.fillText(
            config.sideNumbers[actualFretNumber],
            leftEdge_v - sideNumberOffset,
            fretMidVY
          );
        }
      }

      // --- Marker Dots ---
      const markerDotType =
        actualFretNumber < config.markerDots.length
          ? config.markerDots[actualFretNumber]
          : 0;
      const scaledMarkerRadius = config.markerDotRadiusPx;

      if (markerDotType === 1) {
        const dotPos = this._toCanvas(leftEdge_v + totalBoardSpan / 2, fretMidVY);
        ctx.beginPath();
        ctx.arc(dotPos.x, dotPos.y, scaledMarkerRadius, 0, 2 * Math.PI);
        ctx.fill();
      } else if (markerDotType === 2) {
        // Double dots at 25% and 75% of board span
        const m1vx = leftEdge_v + totalBoardSpan * 0.25;
        const m2vx = leftEdge_v + totalBoardSpan * 0.75;
        const m1 = this._toCanvas(m1vx, fretMidVY);
        const m2 = this._toCanvas(m2vx, fretMidVY);
        ctx.beginPath();
        ctx.arc(m1.x, m1.y, scaledMarkerRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(m2.x, m2.y, scaledMarkerRadius, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    ctx.textAlign = "left";
    ctx.lineWidth = 1; // Reset default line width
  }


  // --- Rounded Rect / Barre Helpers ---

  /** Traces a rounded rectangle path without stroking or filling. */
  private _roundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  /**
   * Returns the bounding box (in canvas coords) that tightly wraps two canvas
   * points, expanded outward by `expand` pixels on each side.
   */
  private _expandedBBox(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    expand: number
  ): { x: number; y: number; w: number; h: number } {
    const x = Math.min(p1.x, p2.x) - expand;
    const y = Math.min(p1.y, p2.y) - expand;
    const w = Math.abs(p1.x - p2.x) + expand * 2;
    const h = Math.abs(p1.y - p2.y) + expand * 2;
    return { x, y, w, h };
  }

  /**
   * Splits a RoundedRectData at non-standard string-interval boundaries (any
   * adjacent-string interval that isn't a perfect 4th, i.e. 5 semitones).
   * Each resulting segment's fret range is shifted by the cumulative interval
   * deviation from the starting segment, so the split halves visually track
   * the actual note positions on the fretboard.
   */
  private _computeRectSegments(rect: RoundedRectData): RoundedRectData[] {
    const tuning = this.config.tuning.tuning;
    const segments: RoundedRectData[] = [];
    let segStart = rect.stringStart;
    let cumulativeOffset = 0;

    for (let s = rect.stringStart; s < rect.stringEnd; s++) {
      const interval = ((tuning[s + 1] - tuning[s]) + 12) % 12;
      const delta = interval - 5; // 0 for a standard perfect-4th pair
      if (delta !== 0) {
        segments.push({
          ...rect,
          stringStart: segStart,
          stringEnd: s,
          fretStart: rect.fretStart + cumulativeOffset,
          fretEnd: rect.fretEnd + cumulativeOffset,
        });
        cumulativeOffset += delta;
        segStart = s + 1;
      }
    }
    // Final (or only) segment
    segments.push({
      ...rect,
      stringStart: segStart,
      stringEnd: rect.stringEnd,
      fretStart: rect.fretStart + cumulativeOffset,
      fretEnd: rect.fretEnd + cumulativeOffset,
    });

    return segments;
  }

  private _renderRoundedRects(ctx: CanvasRenderingContext2D): void {
    const scaleFactor = this.config.scaleFactor;
    const noteRadius = this.config.noteRadiusPx;

    this.roundedRectsToRender.forEach((rect) => {
      const segments =
        rect.autoSplit !== false ? this._computeRectSegments(rect) : [rect];

      segments.forEach((seg) => {
        const padding = (seg.padding ?? 4) * scaleFactor;
        const strokeWidth = (seg.strokeWidth ?? 2) * scaleFactor;
        const expand = noteRadius + padding;

        const c1 = this.getNoteCoordinates(seg.stringStart, seg.fretStart);
        const c2 = this.getNoteCoordinates(seg.stringEnd, seg.fretEnd);
        const { x, y, w, h } = this._expandedBBox(c1, c2, expand);
        const cornerRadius = noteRadius + padding;

        ctx.save();
        this._roundedRectPath(ctx, x, y, w, h, cornerRadius);
        if (seg.fillColor && seg.fillColor !== "transparent") {
          ctx.fillStyle = seg.fillColor;
          ctx.fill();
        }
        ctx.strokeStyle = seg.color;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
        ctx.restore();
      });
    });
  }

  private _renderBarres(ctx: CanvasRenderingContext2D): void {
    const scaleFactor = this.config.scaleFactor;
    const noteRadius = this.config.noteRadiusPx;
    const padding = 2 * scaleFactor;

    this.barresToRender.forEach((barre) => {
      const displayFret = barre.fret - this.startFret;
      if (displayFret < 1 || displayFret > this.fretCount) return;

      const p1 = this.getNoteCoordinates(barre.stringStart, barre.fret);
      const p2 = this.getNoteCoordinates(barre.stringEnd, barre.fret);
      const { x, y, w, h } = this._expandedBBox(p1, p2, noteRadius + padding);
      // Pill shape: corner radius = half the short side
      const cornerRadius = Math.min(w, h) / 2;

      ctx.save();
      this._roundedRectPath(ctx, x, y, w, h, cornerRadius);
      ctx.fillStyle = barre.color ?? "#777";
      ctx.fill();
      ctx.restore();
    });
  }

  private _renderLines(ctx: CanvasRenderingContext2D): void {
    const scaleFactor = this.config.scaleFactor;
    ctx.save();
    this.linesToRender.forEach((line) => {
      ctx.strokeStyle = line.color || "grey";
      ctx.lineWidth = (line.strokeWidth || 2) * scaleFactor;
      if (line.dashed) {
        const dashLength = 4 * scaleFactor;
        ctx.setLineDash([dashLength, dashLength]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(line.startX, line.startY);
      ctx.lineTo(line.endX, line.endY);
      ctx.stroke();
    });
    ctx.restore();
  }

  private _renderNotes(ctx: CanvasRenderingContext2D): void {
    const scaleFactor = this.config.scaleFactor;
    const baseFontSize = 16 * scaleFactor;
    const baseNoteRadius = this.config.noteRadiusPx;
    const maxStringIndex = this.config.stringCount - 1;

    this.notesToRender.forEach((noteData) => {
      const displayFret = noteData.fret - this.startFret;
      if (noteData.fret === -1 || (displayFret >= 0 && displayFret <= this.fretCount)) {

        if (noteData.fret === -1) {
          // Handle muted string — compute canvas-space position via _toCanvas
          const visualStringIndex =
            this.config.handedness === "left"
              ? maxStringIndex - noteData.stringIndex
              : noteData.stringIndex;
          const vx = this.getStringX(visualStringIndex);
          const vy = this.nutLineY - baseNoteRadius * 1.5;
          const { x, y } = this._toCanvas(vx, vy);
          this._drawMutedString(ctx, x, y, baseNoteRadius);
        } else {
          // Handle open or fretted note
          const { x, y } = this.getNoteCoordinates(noteData.stringIndex, noteData.fret);
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
            noteData.strokeColor || "black";

          // Determine FG color (for text/icon) based on primary fill
          const primaryFill = Array.isArray(finalFillColor)
            ? finalFillColor[0]
            : finalFillColor;
          let fgColor = "#eee";
          if (primaryFill !== "transparent") {
            try {
              const r = parseInt(primaryFill.slice(1, 3), 16);
              const g = parseInt(primaryFill.slice(3, 5), 16);
              const b = parseInt(primaryFill.slice(5, 7), 16);
              const brightness = (r * 299 + g * 587 + b * 114) / 1000;
              fgColor = brightness > 150 ? "#333" : "#eee";
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
            const fontSizeRatio = 0.9;
            const effectiveFontSize = Math.min(
              baseFontSize,
              effectiveRadius * 2 * fontSizeRatio * 0.6
            );
            this._drawText(ctx, contentToDraw, x, y, effectiveFontSize, fgColor);
          }
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
      const topFill = Array.isArray(fill) ? fill[0] : fill;
      const bottomFill = Array.isArray(fill) ? fill[1] ?? fill[0] : fill;
      const topStroke = Array.isArray(stroke) ? stroke[0] : stroke;
      const bottomStroke = Array.isArray(stroke)
        ? stroke[1] ?? stroke[0]
        : stroke;

      // Top Half
      ctx.beginPath();
      ctx.arc(x, y, radius, Math.PI, 0);
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
      ctx.arc(x, y, radius, 0, Math.PI);
      if (bottomFill !== "transparent") {
        ctx.fillStyle = bottomFill;
        ctx.fill();
      }
      if (bottomStroke !== "transparent") {
        ctx.strokeStyle = bottomStroke;
        ctx.stroke();
      }

      // Dividing line — left half uses top/first color, right half uses bottom/second color
      const divLeft = Array.isArray(stroke) ? stroke[0] : stroke;
      const divRight = Array.isArray(stroke) ? stroke[1] ?? stroke[0] : stroke;
      ctx.beginPath();
      ctx.moveTo(x - radius, y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = divLeft;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + radius, y);
      ctx.strokeStyle = divRight;
      ctx.stroke();

    } else {
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
    x: number,
    y: number,
    baseScaledRadius: number
  ): void {
    const size = baseScaledRadius * 0.55;
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
    ctx.font = `bold ${fontSize}px Sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textYOffset = fontSize * 0.05;
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
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 * this.config.scaleFactor;

    const iconSize = radius * 0.7;

    switch (icon) {
      case NoteIcon.Star:
        this._drawStarIcon(ctx, x, y, iconSize);
        break;
      case NoteIcon.Circle:
        ctx.beginPath();
        ctx.arc(x, y, iconSize / 2, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case NoteIcon.Square:
        ctx.fillRect(x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
        break;
      case NoteIcon.Triangle:
        ctx.beginPath();
        ctx.moveTo(x, y - iconSize / 1.7);
        ctx.lineTo(x + iconSize / 1.7, y + iconSize / 3.4);
        ctx.lineTo(x - iconSize / 1.7, y + iconSize / 3.4);
        ctx.closePath();
        ctx.fill();
        break;
      case NoteIcon.None:
      default:
        break;
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
    const innerRadius = outerRadius * 0.4;
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
    ctx.fill();
  }
}

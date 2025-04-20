import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Fretboard } from "../fretboard";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import {
  MUSIC_NOTES,
  NOTE_RADIUS_PX,
  getKeyIndex,
  START_PX,
  addHeader,
  addCanvas,
  clearAllChildren,
} from "../guitar_utils";
import {
  TriadQuality,
  TriadInversion,
  findSpecificTriadShapes,
  TriadFingering,
  TriadShapeNote,
  TRIAD_INTERVALS,
} from "../triads";

// Define distinct colors for connecting lines
const SHAPE_LINE_COLORS = [
  "#3273dc",
  "#ff3860",
  "#48c774",
  "#ffdd57",
  "#b86bff",
  "#7a7a7a",
];

/** Displays common, movable triad shapes on the fretboard. */
export class TriadFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Triad Shapes";
  static readonly displayName = "Triad Shapes";
  static readonly description =
    "Displays common movable triad shapes (Major, Minor) for a given key and inversion(s).";

  static getConfigurationSchema(): ConfigurationSchema {
    const availableKeys = MUSIC_NOTES.flat();
    const qualities: TriadQuality[] = ["Major", "Minor"]; // Focus on Maj/Min
    // Add "All" to the list of inversion options
    const inversions: (TriadInversion | "All")[] = [
      "Root",
      "1st",
      "2nd",
      "All",
    ];
    return {
      description: `Config: ${this.typeName},RootNote,Quality[,Inversion][,GuitarSettings]`,
      args: [
        {
          name: "Root Note",
          type: "enum",
          required: true,
          enum: availableKeys,
          description: "Root note of the triad.",
        },
        {
          name: "Quality",
          type: "enum",
          required: true,
          enum: qualities,
          description: "Quality of the triad (Major, Minor).",
        },
        // Combined Inversion/All selector. Defaults to 'All' if omitted.
        {
          name: "Inversion",
          type: "enum",
          required: false,
          enum: inversions,
          description: "Inversion(s) to display (Root, 1st, 2nd, or All).",
        },
        // Removed the separate "Show All Inversions" boolean argument
        {
          name: "Guitar Settings",
          type: "ellipsis",
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
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings,
    metronomeBpmOverride?: number
  ): Feature {
    // Config array: [RootNote, Quality, Optional Inversion ('All' is an option)]
    if (config.length < 2) {
      throw new Error(
        `Invalid config for ${
          this.typeName
        }. Expected [RootNote, Quality], received: [${config.join(", ")}]`
      );
    }

    const rootNoteName = config[0];
    const quality = config[1] as TriadQuality;
    // Default to 'All' if inversion arg is missing or empty
    const inversionSelection = (
      config.length > 2 && config[2] ? config[2] : "All"
    ) as TriadInversion | "All";

    // --- Validation ---
    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1) throw new Error(`Unknown key: "${rootNoteName}"`);
    const validRootName = MUSIC_NOTES[keyIndex]?.[0] ?? rootNoteName;

    const validQualities: TriadQuality[] = ["Major", "Minor"];
    const validInversions: (TriadInversion | "All")[] = [
      "Root",
      "1st",
      "2nd",
      "All",
    ];
    if (!validQualities.includes(quality))
      throw new Error(`Invalid or unsupported triad quality: "${quality}"`);
    if (!validInversions.includes(inversionSelection))
      throw new Error(`Invalid inversion selection: "${inversionSelection}"`);
    // --- End Validation ---

    let headerText = `${validRootName} ${quality} Triad Shapes`;
    if (inversionSelection !== "All") {
      headerText += ` (${inversionSelection})`;
    } else {
      headerText += ` (All Inversions)`;
    }

    // Pass validated root, quality, and the inversion selection to constructor
    return new TriadFeature(
      config,
      validRootName,
      quality,
      inversionSelection,
      headerText,
      settings,
      metronomeBpmOverride,
      audioController
    );
  }

  // --- Instance properties & methods ---
  readonly typeName = TriadFeature.typeName;
  private readonly rootNoteName: string;
  private readonly quality: TriadQuality;
  private readonly inversionSelection: TriadInversion | "All";
  private readonly headerText: string;

  constructor(
    config: ReadonlyArray<string>,
    rootNoteName: string,
    quality: TriadQuality,
    inversionSelection: TriadInversion | "All",
    headerText: string,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    audioController?: AudioController
  ) {
    super(config, settings, metronomeBpmOverride, audioController);
    this.rootNoteName = rootNoteName;
    this.quality = quality;
    this.inversionSelection = inversionSelection;
    this.headerText = headerText;
  }

  // Helper to get the triad notes as strings (e.g., "C, E, G")
  private getTriadNoteNames(): string {
    const rootIndex = getKeyIndex(this.rootNoteName);
    if (rootIndex === -1) return "Invalid Root";
    const intervals = TRIAD_INTERVALS[this.quality];
    if (!intervals) return "Invalid Quality";
    return intervals
      .map((i) => MUSIC_NOTES[(rootIndex + i) % 12][0])
      .join(", ");
  }

  render(container: HTMLElement): void {
    clearAllChildren(container); // Clear the main container once

    const fretCount = 14;
    // Determine which inversions to display based on the selection
    const inversionsToDisplay: TriadInversion[] =
      this.inversionSelection === "All"
        ? ["Root", "1st", "2nd"]
        : [this.inversionSelection];

    // Add overall header if showing multiple
    if (inversionsToDisplay.length > 1) {
      addHeader(container, this.headerText);
      // Optional: Add main notes text here too
      const notesHeader = addHeader(
        container,
        `Notes: ${this.getTriadNoteNames()}`
      );
      notesHeader.style.fontSize = "0.9em";
      notesHeader.style.marginTop = "-10px";
    }

    // Use flex layout for multiple fretboards if needed
    const requiresFlex = inversionsToDisplay.length > 1;
    if (requiresFlex) {
      container.style.display = "flex";
      // Decide layout: row is better for 3 diagrams if space permits
      container.style.flexDirection = "row";
      container.style.flexWrap = "wrap";
      container.style.justifyContent = "space-around"; // Space them out
      container.style.gap = "15px";
    } else {
      container.style.display = ""; // Reset style
      container.style.flexDirection = "";
      container.style.flexWrap = "";
      container.style.justifyContent = "";
      container.style.gap = "";
    }

    inversionsToDisplay.forEach((inversion) => {
      // Create a container div for each diagram + its specific header
      const diagramWrapper = document.createElement("div");
      diagramWrapper.classList.add("diagram-wrapper");
      if (requiresFlex) {
        diagramWrapper.style.flex = "1 1 auto"; // Allow shrinking/growing
        diagramWrapper.style.minWidth = "300px"; // Prevent excessive shrinking
      }
      container.appendChild(diagramWrapper);

      // Add header specific to this inversion
      const inversionHeaderText = requiresFlex
        ? `${inversion} Shapes` // Shorter header if multiple
        : this.headerText; // Full header if only one
      const headerEl = addHeader(diagramWrapper, inversionHeaderText);
      if (requiresFlex) headerEl.style.textAlign = "center";

      // Add Triad Notes Text below header
      const notesText = addHeader(
        diagramWrapper,
        `Notes: ${this.getTriadNoteNames()}`
      );
      notesText.style.fontSize = "0.9em";
      notesText.style.marginTop = "-15px"; // Adjust spacing
      if (requiresFlex) notesText.style.textAlign = "center";

      // Add canvas for this inversion
      const canvasIdBase = `${this.typeName}-${inversion}`;
      const canvas = addCanvas(diagramWrapper, canvasIdBase);
      // Adjust canvas size if multiple are shown - make them smaller?
      // For now, keep the larger size from utils, rely on flexbox/wrapping.
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const requiredHeight =
        START_PX + fretCount * this.fretboardConfig.fretLengthPx + 65;
      canvas.height = Math.max(canvas.height, requiredHeight); // Use calculated or default

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.resetTransform();
      ctx.translate(0.5, 0.5);

      const fretboard = new Fretboard(
        this.fretboardConfig,
        START_PX,
        START_PX,
        fretCount
      );
      fretboard.render(ctx);

      // Find shapes for the current inversion
      const triadShapes = findSpecificTriadShapes(
        this.rootNoteName,
        this.quality,
        inversion,
        this.fretboardConfig,
        fretCount
      );

      if (!triadShapes || triadShapes.length === 0) {
        ctx.font = "18px Sans-serif";
        ctx.fillStyle = "#888";
        ctx.textAlign = "center";
        ctx.fillText(
          `No common ${inversion} shapes found.`,
          canvas.width / 2,
          START_PX + 100
        );
        return; // Stop processing this inversion's canvas
      }

      // --- Draw notes and connecting lines for found shapes ---
      const drawnNotes = new Set<string>();
      triadShapes.forEach((shape, shapeIndex) => {
        // Calculate coordinates
        shape.notes.forEach((note) => {
          if (note.fret !== -1) {
            const coords = fretboard.getNoteCoordinates(
              note.stringIndex,
              note.fret
            );
            note.x = coords.x;
            note.y = coords.y;
          }
        });
        const lineColor =
          SHAPE_LINE_COLORS[shapeIndex % SHAPE_LINE_COLORS.length];
        this.drawShapeConnections(ctx, shape, lineColor);
        shape.notes.forEach((note) => {
          const noteKey = `${note.stringIndex}-${note.fret}`;
          if (note.fret !== -1 && !drawnNotes.has(noteKey)) {
            this.drawTriadShapeNote(ctx, fretboard, note);
            drawnNotes.add(noteKey);
          }
        });
      });
    });
  }

  /** Draws connecting lines between notes of a single triad shape. */
  private drawShapeConnections(
    ctx: CanvasRenderingContext2D,
    shape: TriadFingering,
    strokeColor: string
  ): void {
    // Filter for valid notes with coordinates
    const notesToConnect = shape.notes.filter(
      (n) => n.fret !== -1 && n.x !== undefined && n.y !== undefined
    );
    if (notesToConnect.length < 2) return;

    // Sort notes by string index primarily, then fret for consistent drawing order
    notesToConnect.sort((a, b) => {
      if (a.stringIndex !== b.stringIndex) return a.stringIndex - b.stringIndex;
      return a.fret - b.fret;
    });

    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    // Connect notes on adjacent strings
    ctx.beginPath();
    let lastNote = notesToConnect[0];
    ctx.moveTo(lastNote.x!, lastNote.y!);

    for (let i = 1; i < notesToConnect.length; i++) {
      const currentNote = notesToConnect[i];
      // Only connect if on adjacent strings OR if it's the next note in the sorted list
      // This prevents lines crossing over multiple strings unless necessary
      if (currentNote.stringIndex === lastNote.stringIndex + 1) {
        ctx.lineTo(currentNote.x!, currentNote.y!);
        lastNote = currentNote;
      } else if (i === 1) {
        // Connect first two notes regardless of string adjacency if needed
        ctx.lineTo(currentNote.x!, currentNote.y!);
        lastNote = currentNote;
      } else {
        // If strings aren't adjacent, move to the current note to start a new line segment
        // Only do this if it's not the second note overall to avoid breaking the first connection
        ctx.moveTo(currentNote.x!, currentNote.y!);
        lastNote = currentNote;
      }
    }
    // Close the shape? Connect last back to first if > 2 notes? Could be messy.
    // Let's leave it as connecting adjacent strings for now.
    ctx.stroke();

    ctx.setLineDash([]); // Reset line dash
    ctx.restore();
  }

  /** Draws a single note belonging to a triad shape with interval labeling. */
  private drawTriadShapeNote(
    ctx: CanvasRenderingContext2D,
    fretboard: Fretboard,
    note: TriadShapeNote
  ): void {
    if (note.fret === -1) return;

    const isRoot = note.isRoot;
    const label = note.intervalLabel;
    const bgColor = isRoot ? "#e74c3c" : "#555"; // Red for root, dark grey otherwise
    const fgColor = note.fret > 0 ? "#eee" : "#333";

    fretboard.renderFingering(
      ctx,
      note.fret,
      note.stringIndex,
      label,
      NOTE_RADIUS_PX,
      16, // Font size
      bgColor,
      fgColor,
      false, // Don't draw star (use color/label)
      "black",
      1
    );
  }
}

/* ts/guitar/features/triad_feature.ts */

import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
// Fretboard logic class is used internally by FretboardView
// import { Fretboard } from "../fretboard";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import {
  MUSIC_NOTES,
  getKeyIndex,
  addHeader, // Keep for main header
  clearAllChildren, // Keep for main container clear
} from "../guitar_utils";
import {
  TriadQuality,
  TriadInversion,
  findSpecificTriadShapes,
  TriadFingering, // Keep this type
  TriadShapeNote, // Keep this type
} from "../triads";
// Import the FretboardView and its data interfaces
import {
  FretboardView,
  NoteRenderData,
  LineData,
} from "../views/fretboard_view";
import { MetronomeView } from "../views/metronome_view";
import { View } from "../../view";

// Define distinct colors for connecting lines (can be moved to colors.ts later)
const SHAPE_LINE_COLORS = [
  "#3273dc",
  "#ff3860",
  "#48c774",
  "#ffdd57",
  "#b86bff",
  "#7a7a7a",
];

/** Displays common, movable triad shapes on the fretboard using FretboardView. */
export class TriadFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Triad Shapes";
  static readonly displayName = "Triad Shapes";
  static readonly description =
    "Displays common movable triad shapes (Major, Minor) for a given key and inversion(s).";

  readonly typeName = TriadFeature.typeName;
  private readonly rootNoteName: string;
  private readonly quality: TriadQuality;
  private readonly inversionSelection: TriadInversion | "All";
  private readonly headerText: string; // Keep main header text
  private fretboardViewInstance: FretboardView; // Hold the view instance

  constructor(
    config: ReadonlyArray<string>,
    rootNoteName: string,
    quality: TriadQuality,
    inversionSelection: TriadInversion | "All",
    headerText: string,
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
    this.rootNoteName = rootNoteName;
    this.quality = quality;
    this.inversionSelection = inversionSelection;
    this.headerText = headerText;

    const fretCount = 14; // Suitable range for triads

    // Create Views
    const views: View[] = [];

    // 1. Create FretboardView
    // Use 'interval' coloring scheme from config for the base notes
    this.fretboardViewInstance = new FretboardView(
      this.fretboardConfig,
      fretCount
    );
    views.push(this.fretboardViewInstance);

    // 2. Create MetronomeView (if applicable)
    if (this.metronomeBpm > 0 && this.audioController) {
      const metronomeAudioEl = document.getElementById(
        "metronome-sound"
      ) as HTMLAudioElement;
      if (metronomeAudioEl) {
        views.push(
          new MetronomeView(
            this.metronomeBpm,
            this.audioController,
            metronomeAudioEl
          )
        );
      } else {
        console.error("Metronome audio element not found for TriadFeature.");
      }
    } else if (this.metronomeBpm > 0 && !this.audioController) {
      console.warn(
        "Metronome requested for TriadFeature, but AudioController missing."
      );
    }

    // Assign views
    (this as { views: ReadonlyArray<View> }).views = views;

    // Calculate and set the triad notes and lines *after* creating the view instance
    this.calculateAndSetTriadData(fretCount);
  }

  // Static methods remain the same...
  static getConfigurationSchema(): ConfigurationSchema {
    const availableKeys = MUSIC_NOTES.flat();
    const qualities: TriadQuality[] = ["Major", "Minor"];
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
        {
          name: "Inversion",
          type: "enum",
          required: false,
          enum: inversions,
          description: "Inversion(s) to display (Root, 1st, 2nd, or All).",
        },
        {
          name: "Guitar Settings",
          type: "ellipsis",
          uiComponentType: "ellipsis",
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
    metronomeBpmOverride?: number,
    maxCanvasHeight?: number
  ): Feature {
    if (config.length < 2) {
      throw new Error(
        `Invalid config for ${this.typeName}. Expected [RootNote, Quality].`
      );
    }
    const rootNoteName = config[0];
    const quality = config[1] as TriadQuality;
    const inversionSelection = (
      config.length > 2 && config[2] ? config[2] : "All"
    ) as TriadInversion | "All";

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
      throw new Error(`Invalid triad quality: "${quality}"`);
    if (!validInversions.includes(inversionSelection))
      throw new Error(`Invalid inversion selection: "${inversionSelection}"`);

    let headerText = `${validRootName} ${quality} Triad Shapes`;
    if (inversionSelection !== "All") headerText += ` (${inversionSelection})`;
    else headerText += ` (All Inversions)`;

    // Pass relevant config args to constructor (Root, Quality, Inversion)
    const featureConfig = [
      rootNoteName,
      quality,
      inversionSelection === "All" ? "All" : inversionSelection,
    ];

    return new TriadFeature(
      featureConfig,
      validRootName,
      quality,
      inversionSelection,
      headerText,
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
  }

  /** Calculates triad notes and lines and passes them to the FretboardView. */
  private calculateAndSetTriadData(fretCount: number): void {
    const notesData: NoteRenderData[] = [];
    const linesData: LineData[] = [];
    const inversionsToDisplay: TriadInversion[] =
      this.inversionSelection === "All"
        ? ["Root", "1st", "2nd"]
        : [this.inversionSelection];

    // Get the internal Fretboard instance to calculate coordinates
    const fretboardLogic = this.fretboardViewInstance.getFretboard();
    const drawnNotes = new Set<string>(); // Keep track of drawn notes to avoid duplicates

    inversionsToDisplay.forEach((inversion) => {
      const triadShapes = findSpecificTriadShapes(
        this.rootNoteName,
        this.quality,
        inversion,
        this.fretboardConfig,
        fretCount
      );

      triadShapes.forEach((shape, shapeIndex) => {
        const lineColor =
          SHAPE_LINE_COLORS[shapeIndex % SHAPE_LINE_COLORS.length];
        const notesWithCoords: TriadShapeNote[] = []; // Store notes with calculated coords for line drawing

        // 1. Process notes for this shape
        shape.notes.forEach((note) => {
          if (note.fret !== -1) {
            const coords = fretboardLogic.getNoteCoordinates(
              note.stringIndex,
              note.fret
            );
            note.x = coords.x;
            note.y = coords.y;
            notesWithCoords.push(note); // Add to list for line drawing

            const noteKey = `${note.stringIndex}-${note.fret}`;
            if (!drawnNotes.has(noteKey)) {
              notesData.push({
                fret: note.fret,
                stringIndex: note.stringIndex,
                noteName: note.noteName,
                intervalLabel: note.intervalLabel,
                displayLabel: note.intervalLabel, // Display interval for triads
                colorSchemeOverride: "interval", // Force interval coloring
                isRoot: note.isRoot, // Pass root flag if available/needed
              });
              drawnNotes.add(noteKey);
            }
          }
        });

        // 2. Generate lines for this shape
        const notesToConnect = notesWithCoords.filter(
          (n) => n.x !== undefined && n.y !== undefined
        );
        if (notesToConnect.length >= 2) {
          notesToConnect.sort((a, b) => {
            // Sort for consistent line drawing
            if (a.stringIndex !== b.stringIndex)
              return a.stringIndex - b.stringIndex;
            return a.fret - b.fret;
          });

          let lastNote = notesToConnect[0];
          for (let i = 1; i < notesToConnect.length; i++) {
            const currentNote = notesToConnect[i];
            // Connect if on adjacent strings OR it's the very first connection segment
            if (
              currentNote.stringIndex === lastNote.stringIndex + 1 ||
              i === 1
            ) {
              linesData.push({
                startX: lastNote.x!,
                startY: lastNote.y!,
                endX: currentNote.x!,
                endY: currentNote.y!,
                color: lineColor,
                dashed: true,
                lineWidth: 2, // Example line width
              });
            }
            // Update lastNote regardless of whether a line was drawn to it,
            // ensuring subsequent adjacent connections are made correctly.
            lastNote = currentNote;
          }
        }
      });
    });

    this.fretboardViewInstance.setNotes(notesData);
    this.fretboardViewInstance.setLines(linesData);
  }

  /** Render method now just adds the header. Views are rendered by DisplayController. */
  render(container: HTMLElement): void {
    clearAllChildren(container);
    addHeader(container, this.headerText);
    // DisplayController will render the FretboardView (and MetronomeView if present)
  }
}

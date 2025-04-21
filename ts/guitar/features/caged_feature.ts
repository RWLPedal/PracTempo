import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
  ConfigurationSchemaArg,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { scales } from "../scales"; // We'll use the Major scale definition
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import { GuitarIntervalSettings } from "../guitar_interval_settings";
import { NoteIcon, NoteRenderData, FretboardConfig } from "../fretboard"; // Import necessary types
import {
  getKeyIndex,
  MUSIC_NOTES,
  getIntervalLabel,
  OPEN_NOTE_RADIUS_FACTOR,
  addHeader,
  clearAllChildren,
} from "../guitar_utils";
import { FretboardView } from "../views/fretboard_view";
import { getColor as getColorFromScheme } from "../colors"; // To get fill color based on scheme

// --- CAGED Definitions ---

// Define stroke colors for each CAGED shape
const CAGED_COLORS = {
  C: "#E74C3C", // Red
  A: "#3498DB", // Blue
  G: "#2ECC71", // Green
  E: "#F1C40F", // Yellow
  D: "#9B59B6", // Purple
  Default: "#333333", // Default stroke if needed
};
type CagedShapeName = keyof typeof CAGED_COLORS;

// Define the structure for a single note within a shape pattern
interface CagedNoteDefinition {
  string: number;        // String index (0-5)
  fretOffset: number;    // Fret offset relative to the root note *in this shape*
  interval: number;      // Major scale interval (0, 2, 4, 5, 7, 9, 11)
}

// Define the structure for a complete CAGED shape pattern
interface CagedShapePattern {
  shape: CagedShapeName;
  // The primary string/fret offset where the root note anchors this specific shape pattern
  rootAnchor: { string: number; fretOffset: 0 }; // Root is always fretOffset 0 relative to itself
  notes: CagedNoteDefinition[]; // Array of all notes in the pattern relative to the rootAnchor
}

// --- CAGED Definitions --- (More detailed, but *still requires careful verification*)
// These offsets define the *entire major scale pattern* associated with each CAGED form,
// relative to the lowest root note within that typical fingering pattern.

const CAGED_SHAPES_DATA: CagedShapePattern[] = [
  // --- C Shape Pattern (Root typically on A string or E string 8va) ---
  // Using A string root as the anchor for this example definition
  {
      shape: "C",
      rootAnchor: { string: 1, fretOffset: 0 }, // Anchor: Root on A string
      notes: [
          { string: 1, fretOffset: 0, interval: 0 },   // R (Anchor)
          { string: 1, fretOffset: 2, interval: 2 },   // 2
          { string: 1, fretOffset: 4, interval: 3 },   // 3 (or -1 on string 2)
          { string: 2, fretOffset: 0, interval: 4 },   // 4
          { string: 2, fretOffset: 2, interval: 5 },   // 5
          { string: 3, fretOffset: -1, interval: 5 }, // 5 (lower octave/alt finger)
          { string: 3, fretOffset: 1, interval: 6 },   // 6
          { string: 3, fretOffset: 3, interval: 7 },   // 7
          { string: 4, fretOffset: 0, interval: 0 },   // R (8va)
          { string: 4, fretOffset: 1, interval: 2 },   // 2 (8va) - B string adjust
          { string: 4, fretOffset: 3, interval: 3 },   // 3 (8va) - B string adjust
          { string: 5, fretOffset: 0, interval: 4 },   // 4 (8va)
          // ... Add potentially missing notes if standard C shape covers more
      ]
  },
  // --- A Shape Pattern (Root typically on E string or A string 8va) ---
  // Using E string root as the anchor
  /*{
      shape: "A",
      rootAnchor: { string: 0, fretOffset: 0 }, // Anchor: Root on E string
      notes: [
          { string: 0, fretOffset: 0, interval: 0 },   // R (Anchor)
          { string: 0, fretOffset: 2, interval: 2 },   // 2
          { string: 0, fretOffset: 4, interval: 3 },   // 3
          { string: 1, fretOffset: 0, interval: 4 },   // 4
          { string: 1, fretOffset: 2, interval: 5 },   // 5
          { string: 1, fretOffset: 4, interval: 6 },   // 6
          { string: 2, fretOffset: -1, interval: 6 }, // 6 (alt finger)
          { string: 2, fretOffset: 1, interval: 7 },   // 7
          { string: 2, fretOffset: 2, interval: 0 },   // R (8va)
          { string: 3, fretOffset: -1, interval: 2 }, // 2 (8va)
          { string: 3, fretOffset: 1, interval: 3 },   // 3 (8va)
          { string: 4, fretOffset: -1, interval: 4 }, // 4 (8va) - B string adjust? check standard fingering
          { string: 4, fretOffset: 1, interval: 5 },   // 5 (8va) - B string adjust
          // ... Add potentially missing high E string notes
      ]
  },
   // --- G Shape Pattern (Root typically on E string or G string 8va) ---
   // Using E string root as the anchor
   {
      shape: "G",
      rootAnchor: { string: 0, fretOffset: 0 }, // Anchor: Root on E string
      notes: [
          { string: 0, fretOffset: 0, interval: 0 },   // R (Anchor)
          { string: 0, fretOffset: 2, interval: 2 },   // 2
          { string: 1, fretOffset: -1, interval: 3 }, // 3
          { string: 1, fretOffset: 0, interval: 4 },   // 4
          { string: 1, fretOffset: 2, interval: 5 },   // 5
          { string: 2, fretOffset: -1, interval: 6 }, // 6
          { string: 2, fretOffset: 1, interval: 7 },   // 7
          { string: 3, fretOffset: -1, interval: 0 }, // R (8va)
          { string: 3, fretOffset: 0, interval: 2 },   // 2 (8va)
          { string: 4, fretOffset: -1, interval: 3 }, // 3 (8va) - B string adjust
          { string: 4, fretOffset: 1, interval: 5 },   // 5 (8va) - B string adjust
          { string: 5, fretOffset: 0, interval: 6 },   // 6 (8va)
          { string: 5, fretOffset: 2, interval: 7 },   // 7 (8va)
          { string: 5, fretOffset: 3, interval: 0 },   // R (15va)
      ]
  },
   // --- E Shape Pattern (Standard Barre Chord Shape - Root on E or A string) ---
   // Using E string root as the anchor
  {
      shape: "E",
      rootAnchor: { string: 0, fretOffset: 0 }, // Anchor: Root on E string
      notes: [
          { string: 0, fretOffset: 0, interval: 0 },   // R (Anchor)
          { string: 0, fretOffset: 2, interval: 2 },   // 2
          { string: 0, fretOffset: 4, interval: 3 },   // 3
          { string: 1, fretOffset: 0, interval: 4 },   // 4
          { string: 1, fretOffset: 2, interval: 5 },   // 5
          { string: 2, fretOffset: -1, interval: 5 }, // 5 (alt finger)
          { string: 2, fretOffset: 1, interval: 6 },   // 6
          { string: 2, fretOffset: 3, interval: 7 },   // 7
          { string: 3, fretOffset: 1, interval: 0 },   // R (8va)
          { string: 3, fretOffset: 3, interval: 2 },   // 2 (8va)
          { string: 4, fretOffset: 0, interval: 3 },   // 3 (8va) - B string adjust
          { string: 4, fretOffset: 1, interval: 4 },   // 4 (8va) - B string adjust
          { string: 5, fretOffset: 0, interval: 5 },   // 5 (8va)
          { string: 5, fretOffset: 2, interval: 6 },   // 6 (8va)
          { string: 5, fretOffset: 4, interval: 7 },   // 7 (8va)
          { string: 5, fretOffset: 5, interval: 0 },   // R (15va)
      ]
  },
  // --- D Shape Pattern (Root typically on D string or B string 8va) ---
  // Using D string root as the anchor
  {
      shape: "D",
      rootAnchor: { string: 2, fretOffset: 0 }, // Anchor: Root on D string
      notes: [
          { string: 2, fretOffset: 0, interval: 0 },   // R (Anchor)
          { string: 2, fretOffset: 2, interval: 2 },   // 2
          { string: 2, fretOffset: 4, interval: 3 },   // 3
          { string: 3, fretOffset: 0, interval: 4 },   // 4
          { string: 3, fretOffset: 2, interval: 5 },   // 5
          { string: 3, fretOffset: 4, interval: 6 },   // 6
          { string: 4, fretOffset: -1, interval: 6 }, // 6 (alt) - B string adjust
          { string: 4, fretOffset: 1, interval: 7 },   // 7 - B string adjust
          { string: 4, fretOffset: 2, interval: 0 },   // R (8va) - B string adjust
          { string: 5, fretOffset: 0, interval: 2 },   // 2 (8va)
          { string: 5, fretOffset: 2, interval: 3 },   // 3 (8va)
           // ... maybe more notes depending on common fingering extent
      ]
  },*/
];

/** Displays Major scale notes highlighting CAGED positions with stroke colors. */
export class CagedFeature extends GuitarFeature {
  // ... (static properties and constructor remain the same as previous response) ...
 static readonly category = FeatureCategoryName.Guitar;
 static readonly typeName = "CAGED";
 static readonly displayName = "CAGED Shapes";
 static readonly description =
  "Displays Major scale notes on the fretboard, coloring the note *stroke* based on the CAGED position(s) it belongs to.";

 readonly typeName = CagedFeature.typeName;
 private readonly keyIndex: number;
 private readonly rootNoteName: string;
 private readonly headerText: string;
 private fretboardViewInstance: FretboardView; // Hold the instance
 private fretCount: number; // Store fret count

 constructor(
  config: ReadonlyArray<string>, // Specific args: [Key]
  keyIndex: number,
  rootNoteName: string,
  headerText: string,
  settings: AppSettings,
  intervalSettings: GuitarIntervalSettings,
  audioController?: AudioController,
  maxCanvasHeight?: number
 ) {
  super(config, settings, intervalSettings, audioController, maxCanvasHeight);
  this.keyIndex = keyIndex;
  this.rootNoteName = rootNoteName;
  this.headerText = headerText;
  this.fretCount = 18; // Display enough frets

  // Create FretboardView instance
  this.fretboardViewInstance = new FretboardView(
   this.fretboardConfig,
   this.fretCount
  );
  this._views.push(this.fretboardViewInstance); // Add to views managed by base class

  this.calculateAndSetCagedNotes(); // Call calculation method
 }

 // --- Static Methods (remain the same as previous response) ---
 static getConfigurationSchema(): ConfigurationSchema {
  const availableKeys = MUSIC_NOTES.flat();
  const specificArgs: ConfigurationSchemaArg[] = [
   {
    name: "Key",
    type: "enum",
    required: true,
    enum: availableKeys,
    description: "Root note of the Major scale for CAGED shapes.",
   },
  ];
  return {
   description: `Config: ${this.typeName},Key[,GuitarSettings]`,
   args: [...specificArgs, GuitarFeature.BASE_GUITAR_SETTINGS_CONFIG_ARG],
  };
 }

 static createFeature(
  config: ReadonlyArray<string>, // Raw config [Key, ...]
  audioController: AudioController,
  settings: AppSettings,
  intervalSettings: GuitarIntervalSettings,
  maxCanvasHeight?: number
 ): Feature {
  if (config.length < 1) {
   throw new Error(
    `Invalid config for ${this.typeName}. Expected [Key].`
   );
  }
  const rootNoteName = config[0];
  const featureSpecificConfig = [rootNoteName];

  const keyIndex = getKeyIndex(rootNoteName);
  if (keyIndex === -1) throw new Error(`Unknown key: "${rootNoteName}"`);
  const validRootName = MUSIC_NOTES[keyIndex]?.[0] ?? rootNoteName;
  const headerText = `CAGED Shapes - Key of ${validRootName}`;

  return new CagedFeature(
   featureSpecificConfig,
   keyIndex,
   validRootName,
   headerText,
   settings,
   intervalSettings,
   audioController,
   maxCanvasHeight
  );
 }


 /** Calculates scale notes and their CAGED membership, passes them to FretboardView. */
 private calculateAndSetCagedNotes(): void {
  const notesData: NoteRenderData[] = [];
  const majorScale = scales["MAJOR"];
  if (!majorScale) {
   console.error("Major scale definition not found!");
   return;
  }
  const config = this.fretboardConfig;

  for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
   if (stringIndex >= config.tuning.tuning.length) continue;
   const stringTuning = config.tuning.tuning[stringIndex];

   for (let fretIndex = 0; fretIndex <= this.fretCount; fretIndex++) {
    const noteOffsetFromA = (stringTuning + fretIndex) % 12;
    const noteRelativeToKey = (noteOffsetFromA - this.keyIndex + 12) % 12;

    if (majorScale.degrees.includes(noteRelativeToKey)) {
     const noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
     const intervalLabel = getIntervalLabel(noteRelativeToKey);

     // Find shapes this specific note instance belongs to
     const shapeMembership: CagedShapeName[] = this.findCagedShapesForNote(
      stringIndex,
      fretIndex
     );

     let strokeColor: string | string[] = CAGED_COLORS.Default;
     if (shapeMembership.length === 1) {
      strokeColor = CAGED_COLORS[shapeMembership[0]] || CAGED_COLORS.Default;
     } else if (shapeMembership.length >= 2) {
      strokeColor = [
       CAGED_COLORS[shapeMembership[0]] || CAGED_COLORS.Default,
       CAGED_COLORS[shapeMembership[1]] || CAGED_COLORS.Default,
      ];
     }

     const fillColor = getColorFromScheme(
      config.colorScheme,
      noteName,
      intervalLabel
     );

     notesData.push({
      fret: fretIndex,
      stringIndex: stringIndex,
      noteName: noteName,
      intervalLabel: intervalLabel,
      displayLabel: intervalLabel,
      fillColor: fillColor,
      strokeColor: strokeColor,
      strokeWidth: 2.5,
      radiusOverride:
       fretIndex === 0
        ? config.noteRadiusPx * OPEN_NOTE_RADIUS_FACTOR
        : undefined,
     });
    }
   }
  }
  requestAnimationFrame(() => {
   if (this.fretboardViewInstance) {
    this.fretboardViewInstance.setNotes(notesData);
    this.fretboardViewInstance.setLines([]);
   }
  });
 }

  /**
   * Finds which CAGED shape(s) a specific note instance (string/fret) belongs to
   * by checking against potential shape instances anchored by the key's root note.
   * Returns an array of matching shape names (e.g., ['C', 'G']).
   */
  private findCagedShapesForNote(
    targetStringIndex: number,
    targetFretIndex: number
  ): CagedShapeName[] {
    const matchingShapes: CagedShapeName[] = [];
    const keyRootIndex = this.keyIndex; // Root note index (0-11) of the key
    const tuning = this.fretboardConfig.tuning.tuning;

    // Iterate through each defined CAGED shape pattern
    for (const shapePattern of CAGED_SHAPES_DATA) {
        const anchorStringIndex = shapePattern.rootAnchor.string;
        const anchorStringTuning = tuning[anchorStringIndex];

        // Iterate through possible anchor frets for this shape's root on its anchor string
        for (let anchorFret = 0; anchorFret <= this.fretCount; anchorFret++) {
            const noteAtAnchor = (anchorStringTuning + anchorFret) % 12;

            // Is this anchor fret the root note of our key?
            if (noteAtAnchor === keyRootIndex) {
                // Yes, this anchorFret represents a valid instance of shapePattern for the key.
                // Now, check if our target note (targetStringIndex, targetFretIndex)
                // exists within this specific instance of the shape pattern.

                // Find the definition of the target note within the shape pattern's notes array
                const targetNoteDefinition = shapePattern.notes.find(
                    (noteDef) => noteDef.string === targetStringIndex
                );

                if (targetNoteDefinition) {
                    // Calculate the *expected* absolute fret for the target note
                    // based on this shape instance anchored at anchorFret.
                    // The root note in the shape definition is always at fretOffset 0 *relative to itself*.
                    const expectedFret = anchorFret + targetNoteDefinition.fretOffset; // Simplified calculation

                     // Does the expected fret match the actual target fret?
                     if (expectedFret === targetFretIndex) {
                         // Check if the note's interval also matches (extra validation)
                         const targetNoteAbsolute = (tuning[targetStringIndex] + targetFretIndex) % 12;
                         const targetNoteInterval = (targetNoteAbsolute - keyRootIndex + 12) % 12;

                         if (targetNoteInterval === targetNoteDefinition.interval) {
                             // It's a match! Add this shape name if not already added.
                             if (!matchingShapes.includes(shapePattern.shape)) {
                                matchingShapes.push(shapePattern.shape);
                             }
                             // Optimization: If we already found 2 shapes, we don't need more for stroke coloring
                             if (matchingShapes.length >= 2) {
                                 return matchingShapes; // Early exit
                             }
                             // Since a note instance (string/fret) can only exist once per shape instance,
                             // we can break the inner anchorFret loop after finding a match for this shape.
                             // However, a single string/fret might be part of *different* instances
                             // of the *same* shape (e.g., different octaves).
                             // Let's continue the anchorFret loop for now to catch all possibilities,
                             // although the `!matchingShapes.includes` check prevents duplicates.
                             // break; // Optional: break inner loop if only one instance per shape is needed
                         }
                     }
                }
            }
        } // End anchorFret loop
         // Optimization: If we already found 2 shapes, we don't need to check other shape patterns
         if (matchingShapes.length >= 2) {
            break; // Exit the shapePattern loop
        }
    } // End shapePattern loop

    return matchingShapes;
  }


  // ... (render method remains the same) ...
  render(container: HTMLElement): void {
    clearAllChildren(container);
    addHeader(container, this.headerText);
    // FretboardView is rendered by DisplayController
 }
}

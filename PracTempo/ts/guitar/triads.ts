import { FretboardConfig } from "./fretboard";
import { MUSIC_NOTES, getKeyIndex, getIntervalLabel } from "./guitar_utils";

export type TriadQuality = "Major" | "Minor"; // Focusing on Major/Minor for shapes now
export type TriadInversion = "Root" | "1st" | "2nd";

/** Map of triad qualities to their intervals (in semitones relative to root). */
export const TRIAD_INTERVALS: { [key in TriadQuality]: number[] } = {
  Major: [0, 4, 7],
  Minor: [0, 3, 7],
};

/** Represents a note within a specific triad shape fingering. */
export interface TriadShapeNote {
  stringIndex: number; // Physical string index (0=E low, 5=e high)
  fret: number; // Fret number (0=open, -1=muted)
  noteName: string; // e.g., "C", "G#"
  intervalLabel: string; // e.g., "R", "3", "b3", "5"
  isRoot: boolean;
  x?: number;
  y?: number;
}

/** Represents a specific, playable triad shape/fingering at a certain position. */
export interface TriadFingering {
  name: string;
  quality: TriadQuality;
  inversion: TriadInversion;
  notes: TriadShapeNote[];
  baseFret: number;
  maxFret: number;
}

// Focus on DGB, GBe, ADG, EAD string groups.
// Fret offsets are relative to the calculated root fret on the rootString.
interface RelativeShape {
  quality: TriadQuality;
  inversion: TriadInversion;
  rootString: number; // String where the TRIAD root note lies for this pattern
  shapeName: string; // Description (e.g., "DGB Root Pos")
  /** Fret offsets relative to the calculated root fret on rootString. Use -1 for muted/unused strings. */
  fretOffsets: (number | -1)[]; // MUST represent exactly 3 notes.
}

// ==================================================================
// !! IMPORTANT !! This library needs careful checking and expansion!
// The offsets here are simplified examples. Real voicings vary.
// ==================================================================
const BASE_SHAPES: RelativeShape[] = [
  // === MAJOR - DGB Strings ===
  {
    quality: "Major",
    inversion: "Root",
    rootString: 2,
    shapeName: "Maj DGB Root",
    fretOffsets: [-1, -1, 0, -1, 1, -1],
  }, // Root on D, 3rd on B(fret+1) -> Check offsets! Needs root->3 = 4 st, root->5 = 7st. If D=R(0), G=(5) needs 7st(P5), B=(9) needs 4st(M3). OFFSETS: R=0(D), 5=0(G), 3= -1(B)? No, this is complex.

  // --- MAJOR ---
  // DGB Shapes
  {
    quality: "Major",
    inversion: "Root",
    rootString: 2,
    shapeName: "Maj DGB Root",
    fretOffsets: [-1, -1, 0, 0, -1, 0],
  }, // Example: D shape root (D:R, G:5, B:3relative) -> Offsets relative to D string root fret: [D:0, G:0, B:-1]? Requires validation!
  {
    quality: "Major",
    inversion: "1st",
    rootString: 4,
    shapeName: "Maj DGB 1st Inv",
    fretOffsets: [-1, -1, 0, 0, 1, -1],
  }, // Example: G shape based (B:R, D:b3->M3, G:5) -> Offsets relative to G string fret for 3rd: [D:0, G:0, B:1]
  {
    quality: "Major",
    inversion: "2nd",
    rootString: 3,
    shapeName: "Maj DGB 2nd Inv",
    fretOffsets: [-1, -1, -1, 0, 1, 2],
  }, // Example: C shape based (G:R, B:3, D:5) -> Offsets relative to D string fret for 5th: [D:2, G:0, B:1]?

  // GBE Shapes
  {
    quality: "Major",
    inversion: "Root",
    rootString: 3,
    shapeName: "Maj GBE Root",
    fretOffsets: [-1, -1, -1, 0, 1, 0],
  }, // Example: G shape (G:R, B:3, E:5) -> Offsets relative to G string root fret: [G:0, B:1, E:0]
  {
    quality: "Major",
    inversion: "1st",
    rootString: 5,
    shapeName: "Maj GBE 1st Inv",
    fretOffsets: [-1, -1, -1, 0, 0, 0],
  }, // Example: C shape (E:R, G:b3->M3, B:5) -> Offsets relative to B string fret for 3rd: [G:0, B:0, E:0]
  {
    quality: "Major",
    inversion: "2nd",
    rootString: 4,
    shapeName: "Maj GBE 2nd Inv",
    fretOffsets: [-1, -1, -1, -1, 1, 2],
  }, // Example: D shape (B:R, E:4->5, G:b7->R) -> Offsets relative to E string fret for 5th: [G:-1, B:1, E:2]?

  // ADG Shapes
  {
    quality: "Major",
    inversion: "Root",
    rootString: 1,
    shapeName: "Maj ADG Root",
    fretOffsets: [-1, 0, 2, 2, -1, -1],
  }, // A shape (A:R, D:5, G:M3) -> Offsets relative to A string root fret: [A:0, D:2, G:2]
  {
    quality: "Major",
    inversion: "1st",
    rootString: 3,
    shapeName: "Maj ADG 1st Inv",
    fretOffsets: [-1, 0, 2, 0, -1, -1],
  }, // F shape based (G:R, A:2->3, D:5) -> Offsets relative to D string fret for 3rd: [A:0, D:2, G:0]
  {
    quality: "Major",
    inversion: "2nd",
    rootString: 2,
    shapeName: "Maj ADG 2nd Inv",
    fretOffsets: [-1, 2, 0, 0, -1, -1],
  }, // C shape based (D:R, G:4->5, A:6->R) -> Offsets relative to A string fret for 5th: [A:2, D:0, G:0]

  // EAD Shapes (Lower strings, less common for melodic triads)
  {
    quality: "Major",
    inversion: "Root",
    rootString: 0,
    shapeName: "Maj EAD Root",
    fretOffsets: [0, 2, 2, -1, -1, -1],
  }, // E shape (E:R, A:5, D:M3) -> Offsets relative to E string root fret: [E:0, A:2, D:2]
  {
    quality: "Major",
    inversion: "1st",
    rootString: 2,
    shapeName: "Maj EAD 1st Inv",
    fretOffsets: [0, 2, 0, -1, -1, -1],
  }, // C shape based (D:R, E:2->3, A:5) -> Offsets relative to A string fret for 3rd: [E:0, A:2, D:0]
  {
    quality: "Major",
    inversion: "2nd",
    rootString: 1,
    shapeName: "Maj EAD 2nd Inv",
    fretOffsets: [2, 0, 0, -1, -1, -1],
  }, // G shape based (A:R, D:4->5, E:6->R) -> Offsets relative to E string fret for 5th: [E:2, A:0, D:0]

  // --- MINOR ---
  // DGB Shapes
  {
    quality: "Minor",
    inversion: "Root",
    rootString: 2,
    shapeName: "Min DGB Root",
    fretOffsets: [-1, -1, 0, 0, -1, -1],
  }, // Dm shape like Dmaj[R,5,3] -> Dm[R,5,b3]. Offset [D:0, G:0, B:-2]? Needs validation. Assume [D:0, G:0, B:-2] rel to D Fret.
  {
    quality: "Minor",
    inversion: "1st",
    rootString: 3,
    shapeName: "Min DGB 1st Inv",
    fretOffsets: [-1, -1, 0, 0, 0, -1],
  }, // Gm based. G=R(0), B=b3(3), D=5(7). Rel offsets to G Fret for b3: [D:0, G:0, B:0].
  {
    quality: "Minor",
    inversion: "2nd",
    rootString: 4,
    shapeName: "Min DGB 2nd Inv",
    fretOffsets: [-1, -1, -1, 0, 0, 1],
  }, // Bm based. B=R(0), D=b3(3), F#=5(6). Rel offsets to D Fret for 5: [D:0, G:0, B:1]?

  // GBE Shapes
  {
    quality: "Minor",
    inversion: "Root",
    rootString: 3,
    shapeName: "Min GBE Root",
    fretOffsets: [-1, -1, -1, 0, 0, 0],
  }, // Gm shape (G:R, Bb:b3, D:5). Rel offsets to G Fret: [G:0, B:0, E:0].
  {
    quality: "Minor",
    inversion: "1st",
    rootString: 4,
    shapeName: "Min GBE 1st Inv",
    fretOffsets: [-1, -1, -1, 0, 1, 1],
  }, // Cm shape (B:R(0), D:2(2), G:b5->5(7))? Rel offsets to B Fret for b3: [G:0, B:1, E:1]?
  {
    quality: "Minor",
    inversion: "2nd",
    rootString: 5,
    shapeName: "Min GBE 2nd Inv",
    fretOffsets: [-1, -1, -1, -1, 0, 1],
  }, // Dm shape (E:R(0), G:m3(3), B:d5->P5(7))? Rel offsets to E Fret for 5: [G:-1, B:0, E:1]? No, GBE 2nd Inv [G:-1, B:0, E:1] rel to B Fret seems right.

  // ADG Shapes
  {
    quality: "Minor",
    inversion: "Root",
    rootString: 1,
    shapeName: "Min ADG Root",
    fretOffsets: [-1, 0, 2, 1, -1, -1],
  }, // Am shape (A:R, D:5, G:b3). Rel offsets to A Fret: [A:0, D:2, G:1].
  {
    quality: "Minor",
    inversion: "1st",
    rootString: 2,
    shapeName: "Min ADG 1st Inv",
    fretOffsets: [-1, 0, 1, 0, -1, -1],
  }, // F#m shape (D:R(0), F#:2(2), A:4->5(5)). Rel to D Fret for b3: [A:0, D:1, G:0]?
  {
    quality: "Minor",
    inversion: "2nd",
    rootString: 3,
    shapeName: "Min ADG 2nd Inv",
    fretOffsets: [-1, 1, 0, 0, -1, -1],
  }, // Cm shape (G:R(0), C:4(5), Eb:b6->5(8)). Rel to A Fret for 5: [A:1, D:0, G:0]?

  // EAD Shapes
  {
    quality: "Minor",
    inversion: "Root",
    rootString: 0,
    shapeName: "Min EAD Root",
    fretOffsets: [0, 2, 2, -1, -1, -1],
  }, // Em shape (E:R, A:5, D:b3). Rel offsets to E Fret: [E:0, A:2, D:2].
  {
    quality: "Minor",
    inversion: "1st",
    rootString: 1,
    shapeName: "Min EAD 1st Inv",
    fretOffsets: [0, 1, 0, -1, -1, -1],
  }, // Cm shape (A:R(0), C:m3(3), E:P5(7)). Rel to A Fret for b3: [E:0, A:1, D:0]?
  {
    quality: "Minor",
    inversion: "2nd",
    rootString: 2,
    shapeName: "Min EAD 2nd Inv",
    fretOffsets: [1, 0, 0, -1, -1, -1],
  }, // Gm shape (D:R(0), F:m3(3), A:P5(7)). Rel to E Fret for 5: [E:1, A:0, D:0]?
];

/**
 * Finds specific, common triad fingerings by transposing base shapes.
 * It locates all occurrences of the root note on the shape's designated root string
 * within the fret limit, transposes the shape accordingly, and validates the result.
 *
 * @param rootNoteName The root note name (e.g., "C", "F#").
 * @param quality The triad quality.
 * @param inversion The specific inversion desired.
 * @param fretboardConfig The configuration of the fretboard (tuning).
 * @param maxFret The maximum fret to include shapes within.
 * @returns An array of valid TriadFingering objects.
 */
export function findSpecificTriadShapes(
  rootNoteName: string,
  quality: TriadQuality,
  inversion: TriadInversion,
  fretboardConfig: FretboardConfig,
  maxFret: number = 12
): TriadFingering[] {
  const rootNoteIndex = getKeyIndex(rootNoteName);
  if (rootNoteIndex === -1) return [];

  const triadIntervals = TRIAD_INTERVALS[quality];
  if (!triadIntervals) return [];
  // Create a Set for quick lookup of target note indices
  const targetNoteIndicesSet = new Set(
    triadIntervals.map((i) => (rootNoteIndex + i) % 12)
  );
  // Map interval offset back to note index for validation
  const targetNotesByInterval = new Map<number, number>();
  triadIntervals.forEach((interval) => {
    targetNotesByInterval.set(interval, (rootNoteIndex + interval) % 12);
  });

  const foundFingerings: TriadFingering[] = [];

  // Filter base shapes for the requested quality and inversion
  const relevantBaseShapes = BASE_SHAPES.filter(
    (s) => s.quality === quality && s.inversion === inversion
  );

  for (const baseShape of relevantBaseShapes) {
    const rootStringTuning =
      fretboardConfig.tuning.tuning[baseShape.rootString];

    // Find all frets on the rootString where the target root note occurs
    for (let rootTargetFret = 0; rootTargetFret <= maxFret; rootTargetFret++) {
      const noteAtRootTargetFret = (rootStringTuning + rootTargetFret) % 12;

      if (noteAtRootTargetFret === rootNoteIndex) {
        // Found an anchor point for this shape. Transpose and validate.
        let currentMaxFretInShape = 0;
        let currentMinFretInShape = maxFret + 1;
        const shapeNotes: TriadShapeNote[] = [];
        let isValidInstance = true;

        for (let stringIdx = 0; stringIdx < 6; stringIdx++) {
          const offset = baseShape.fretOffsets[stringIdx];
          if (offset === -1) continue; // Skip muted strings defined in the base shape

          let finalFret = rootTargetFret + offset;

          // === Validation 1: Fret Boundaries ===
          if (finalFret < 0 || finalFret > maxFret) {
            isValidInstance = false; // Note falls outside allowed range
            // console.log(`Debug: Shape ${baseShape.shapeName} instance at root ${rootTargetFret} invalid - fret ${finalFret} out of bounds [0-${maxFret}]`);
            break; // Stop processing this instance
          }

          // Calculate the resulting note
          const resultingNoteIndex =
            (fretboardConfig.tuning.tuning[stringIdx] + finalFret) % 12;

          // === Validation 2: Note Belongs to Triad ===
          if (!targetNoteIndicesSet.has(resultingNoteIndex)) {
            // This shape definition combined with this transposition produces a note not in the target triad.
            isValidInstance = false;
            // console.log(`Debug: Shape ${baseShape.shapeName} instance at root ${rootTargetFret} invalid - note ${MUSIC_NOTES[resultingNoteIndex]?.[0]} not in ${rootNoteName} ${quality}`);
            break; // Stop processing this instance
          }

          // Find the interval of the resulting note relative to the triad root
          let intervalSemitones = -1;
          for (const [interval, noteIdx] of targetNotesByInterval.entries()) {
            if (noteIdx === resultingNoteIndex) {
              intervalSemitones = interval;
              break;
            }
          }
          // Should always find an interval if it passed the Set check, but safety check:
          if (intervalSemitones === -1) {
            isValidInstance = false;
            console.error(
              `Logic Error: Could not determine interval for note ${resultingNoteIndex} in triad ${rootNoteName} ${quality}`
            );
            break;
          }

          const noteName = MUSIC_NOTES[resultingNoteIndex]?.[0] ?? "?";
          const intervalLabel = getIntervalLabel(intervalSemitones);
          const isRoot = intervalSemitones === 0;

          shapeNotes.push({
            stringIndex: stringIdx,
            fret: finalFret,
            noteName: noteName,
            intervalLabel: intervalLabel,
            isRoot: isRoot,
          });

          currentMinFretInShape = Math.min(currentMinFretInShape, finalFret);
          currentMaxFretInShape = Math.max(currentMaxFretInShape, finalFret);
        } // End loop through strings for this instance

        // === Validation 3: Correct Number of Notes ===
        // Ensure we generated exactly 3 notes (allow base shapes that define only 3 notes)
        if (isValidInstance && shapeNotes.length !== 3) {
          // This indicates the base shape definition itself is likely incorrect (not exactly 3 notes defined)
          console.warn(
            `Shape Definition Warning: Base shape "${baseShape.shapeName}" does not seem to define exactly 3 notes. Resulting notes: ${shapeNotes.length}`
          );
          // Decide whether to discard these shapes or allow them. For strict triads, discard:
          isValidInstance = false;
        }

        // Add the fingering if it passed all validations
        if (isValidInstance) {
          const baseFret = currentMinFretInShape;
          foundFingerings.push({
            name: `${baseShape.shapeName} (${rootNoteName}@${baseShape.rootString},${rootTargetFret})`,
            quality: quality,
            inversion: inversion,
            notes: shapeNotes,
            baseFret: baseFret,
            maxFret: currentMaxFretInShape,
          });
        }
      }
    }
  }

  return foundFingerings;
}

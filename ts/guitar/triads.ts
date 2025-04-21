import { FretboardConfig, Fretboard } from "./fretboard";
import { MUSIC_NOTES, getKeyIndex, getIntervalLabel, START_PX } from "./guitar_utils";
import { NoteRenderData, LineData } from "./views/fretboard_view";

export type TriadQuality = "Major" | "Minor" | "Diminished" | "Augmented";
export type TriadInversion = "Root" | "1st" | "2nd";

/** Map of triad qualities to their intervals (in semitones relative to root). */
export const TRIAD_INTERVALS: { [key in TriadQuality]: number[] } = {
  Major: [0, 4, 7], // R, M3, P5
  Minor: [0, 3, 7], // R, m3, P5
  Diminished: [0, 3, 6], // R, m3, m5
  Augmented: [0, 3, 8], // R, m3, m6
};

/** Defines a relative triad shape for a specific 3-string group. */
interface RelativeTriadShape {
  quality: TriadQuality;
  inversion: TriadInversion;
  stringGroup: [number, number, number]; // Absolute indices [low, mid, high]
  /** Fret offsets [low, mid, high] relative to the root note's fret. */
  relativeFrets: [number, number, number];
  /** Index within stringGroup (0, 1, or 2) where the root note lies. */
  rootStringIndexInGroup: 0 | 1 | 2;
}

// --- Revised Catalog of Relative Triad Shapes ---
const TRIAD_SHAPE_CATALOG: RelativeTriadShape[] = [
  // === MAJOR === (R=0, M3=4, P5=7)
  // --- EAD [0,1,2] ---
  { quality: "Major", inversion: "Root", stringGroup: [0, 1, 2], relativeFrets: [3, 2, 0], rootStringIndexInGroup: 0 },
  { quality: "Major", inversion: "2nd", stringGroup: [0, 1, 2], relativeFrets: [0, 0, -1], rootStringIndexInGroup: 1 },
  { quality: "Major", inversion: "1st", stringGroup: [0, 1, 2], relativeFrets: [2, 0, 0], rootStringIndexInGroup: 2 },

  // --- ADG [1,2,3] ---
  { quality: "Major", inversion: "Root", stringGroup: [1, 2, 3], relativeFrets: [3, 2, 0], rootStringIndexInGroup: 0 },
  { quality: "Major", inversion: "2nd", stringGroup: [1, 2, 3], relativeFrets: [0, 0, -1], rootStringIndexInGroup: 1 }, 
  { quality: "Major", inversion: "1st", stringGroup: [1, 2, 3], relativeFrets: [2, 0, 0], rootStringIndexInGroup: 2 },
 
  // --- DGB [2,3,4] ---
  { quality: "Major", inversion: "Root", stringGroup: [2, 3, 4], relativeFrets: [2, 1, 0], rootStringIndexInGroup: 0 }, 
  { quality: "Major", inversion: "2nd", stringGroup: [2, 3, 4], relativeFrets: [0, 0, 0], rootStringIndexInGroup: 1 },
  { quality: "Major", inversion: "1st", stringGroup: [2, 3, 4], relativeFrets: [1, -1, 0], rootStringIndexInGroup: 2 },

  // --- GBE [3,4,5] ---
  { quality: "Major", inversion: "Root", stringGroup: [3, 4, 5], relativeFrets: [2, 2, 0], rootStringIndexInGroup: 0 },
  { quality: "Major", inversion: "2nd", stringGroup: [3, 4, 5], relativeFrets: [-1, 0, -1], rootStringIndexInGroup: 1 },
  { quality: "Major", inversion: "1st", stringGroup: [3, 4, 5], relativeFrets: [1, 0, 0], rootStringIndexInGroup: 2 },
  

  // === MINOR === (R=0, m3=3, P5=7)
  // EAD [0,1,2]
  { quality: "Minor", inversion: "Root", stringGroup: [0, 1, 2], relativeFrets: [3, 1, 0], rootStringIndexInGroup: 0 },
  { quality: "Minor", inversion: "2nd",  stringGroup: [0, 1, 2], relativeFrets: [0, 0, -2], rootStringIndexInGroup: 1 },
  { quality: "Minor", inversion: "1st",  stringGroup: [0, 1, 2], relativeFrets: [1, 0, 0], rootStringIndexInGroup: 2 },

  // ADG [1,2,3]
  { quality: "Minor", inversion: "Root", stringGroup: [1, 2, 3], relativeFrets: [3, 1, 0], rootStringIndexInGroup: 0 },
  { quality: "Minor", inversion: "2nd",  stringGroup: [1, 2, 3], relativeFrets: [0, 0, -2], rootStringIndexInGroup: 1 },
  { quality: "Minor", inversion: "1st",  stringGroup: [1, 2, 3], relativeFrets: [1, 0, 0], rootStringIndexInGroup: 2 },

  // DGB [2,3,4] (B string adjusted)
  { quality: "Minor", inversion: "Root", stringGroup: [2, 3, 4], relativeFrets: [2, 0, 0], rootStringIndexInGroup: 0 },
  { quality: "Minor", inversion: "2nd",  stringGroup: [2, 3, 4], relativeFrets: [0, 0, -1], rootStringIndexInGroup: 1 },
  { quality: "Minor", inversion: "1st",  stringGroup: [2, 3, 4], relativeFrets: [0, -1, 0], rootStringIndexInGroup: 2 },

  // GBE [3,4,5] (B string adjusted)
  { quality: "Minor", inversion: "Root", stringGroup: [3, 4, 5], relativeFrets: [2, 1, 0], rootStringIndexInGroup: 0 }, 
  { quality: "Minor", inversion: "2nd",  stringGroup: [3, 4, 5], relativeFrets: [-1, 0, -2], rootStringIndexInGroup: 1 },
  { quality: "Minor", inversion: "1st",  stringGroup: [3, 4, 5], relativeFrets: [0, 0, 0], rootStringIndexInGroup: 2 }, 

    // === DIMINISHED === (R=0, m3=3, m5=6)
  // EAD [0,1,2]
  { quality: "Diminished", inversion: "Root", stringGroup: [0, 1, 2], relativeFrets: [4, 2, 0], rootStringIndexInGroup: 0 },
  { quality: "Diminished", inversion: "2nd",  stringGroup: [0, 1, 2], relativeFrets: [-1, 0, -2], rootStringIndexInGroup: 1 },
  { quality: "Diminished", inversion: "1st",  stringGroup: [0, 1, 2], relativeFrets: [1, -1, 0], rootStringIndexInGroup: 2 },

  // ADG [1,2,3]
  { quality: "Diminished", inversion: "Root", stringGroup: [1, 2, 3], relativeFrets: [4, 2, 0], rootStringIndexInGroup: 0 },
  { quality: "Diminished", inversion: "2nd",  stringGroup: [1, 2, 3], relativeFrets: [-1, 0, -2], rootStringIndexInGroup: 1 },
  { quality: "Diminished", inversion: "1st",  stringGroup: [1, 2, 3], relativeFrets: [1, -1, 0], rootStringIndexInGroup: 2 },

  // DGB [2,3,4] (B string adjusted)
  { quality: "Diminished", inversion: "Root", stringGroup: [2, 3, 4], relativeFrets: [2, 0, -1], rootStringIndexInGroup: 0 },
  { quality: "Diminished", inversion: "2nd",  stringGroup: [2, 3, 4], relativeFrets: [-1, 0, -1], rootStringIndexInGroup: 1 },
  { quality: "Diminished", inversion: "1st",  stringGroup: [2, 3, 4], relativeFrets: [0, -2, 0], rootStringIndexInGroup: 2 },

  // GBE [3,4,5] (B string adjusted)
  { quality: "Diminished", inversion: "Root", stringGroup: [3, 4, 5], relativeFrets: [2, 1, -1], rootStringIndexInGroup: 0 }, 
  { quality: "Diminished", inversion: "2nd",  stringGroup: [3, 4, 5], relativeFrets: [-2, 0, -2], rootStringIndexInGroup: 1 },
  { quality: "Diminished", inversion: "1st",  stringGroup: [3, 4, 5], relativeFrets: [0, -1, 0], rootStringIndexInGroup: 2 }, 

  // === Augmented === (R=0, m3=3, m6=8)
// EAD [0,1,2]
{ quality: "Augmented", inversion: "Root", stringGroup: [0, 1, 2], relativeFrets: [2, 1, 0], rootStringIndexInGroup: 0 },
{ quality: "Augmented", inversion: "2nd",  stringGroup: [0, 1, 2], relativeFrets: [2, 1, 0], rootStringIndexInGroup: 1 },
{ quality: "Augmented", inversion: "1st",  stringGroup: [0, 1, 2], relativeFrets: [2, 1, 0], rootStringIndexInGroup: 2 },

// ADG [1,2,3]
{ quality: "Augmented", inversion: "Root", stringGroup: [1, 2, 3], relativeFrets: [2, 1, 0], rootStringIndexInGroup: 0 },
{ quality: "Augmented", inversion: "2nd",  stringGroup: [1, 2, 3], relativeFrets: [2, 1, 0], rootStringIndexInGroup: 1 },
{ quality: "Augmented", inversion: "1st",  stringGroup: [1, 2, 3], relativeFrets: [2, 1, 0], rootStringIndexInGroup: 2 },

// DGB [2,3,4] (B string adjusted)
{ quality: "Augmented", inversion: "Root", stringGroup: [2, 3, 4], relativeFrets: [1, 0, 0], rootStringIndexInGroup: 0 },
{ quality: "Augmented", inversion: "2nd",  stringGroup: [2, 3, 4], relativeFrets: [1, 0, 0], rootStringIndexInGroup: 1 },
{ quality: "Augmented", inversion: "1st",  stringGroup: [2, 3, 4], relativeFrets: [1, 0, 0], rootStringIndexInGroup: 2 },

// GBE [3,4,5] (B string adjusted)
{ quality: "Augmented", inversion: "Root", stringGroup: [3, 4, 5], relativeFrets: [2, 2, 1], rootStringIndexInGroup: 0 }, 
{ quality: "Augmented", inversion: "2nd",  stringGroup: [3, 4, 5], relativeFrets: [2, 2, 1], rootStringIndexInGroup: 1 },
{ quality: "Augmented", inversion: "1st",  stringGroup: [3, 4, 5], relativeFrets: [2, 2, 1], rootStringIndexInGroup: 2 }, 
];


const INVERSION_LINE_COLORS: Record<TriadInversion, string> = {
    "Root": "#3273dc", "1st": "#48c774", "2nd": "#ff3860",
};

/**
 * Finds all occurrences of triads for a given key and quality on a specific 3-string group.
 * Uses the TRIAD_SHAPE_CATALOG for relative shapes.
 *
 * @returns An object containing arrays of notes and lines for the FretboardView.
 */
export function getTriadNotesAndLinesForGroup(
  rootNoteName: string,
  quality: TriadQuality,
  stringGroup: [number, number, number],
  fretCount: number,
  fretboardConfig: FretboardConfig
): { notes: NoteRenderData[], lines: LineData[] } {

  const rootNoteIndex = getKeyIndex(rootNoteName);
  if (rootNoteIndex === -1) return { notes: [], lines: [] };

  const triadIntervals = TRIAD_INTERVALS[quality];
  if (!triadIntervals) return { notes: [], lines: [] };

  const allNotesForGroup: NoteRenderData[] = [];
  const allLinesForGroup: LineData[] = [];
  const tuning = fretboardConfig.tuning.tuning;
  const scaledStartPx = START_PX * fretboardConfig.scaleFactor;

  const coordCalculator = new Fretboard(fretboardConfig, scaledStartPx, scaledStartPx, fretCount);

  const relevantShapes = TRIAD_SHAPE_CATALOG.filter(
      s => s.quality === quality &&
           s.stringGroup.every((val, index) => val === stringGroup[index])
  );

  const targetIntervalMap = new Map<number, number>();
  triadIntervals.forEach(interval => targetIntervalMap.set(((12+rootNoteIndex) + interval) % 12, interval));

  const addedInstances = new Set<string>(); // To prevent adding exact same shape at same location

  for (const shape of relevantShapes) {
      const anchorStringAbsoluteIndex = shape.stringGroup[shape.rootStringIndexInGroup];
      const anchorStringTuning = tuning[anchorStringAbsoluteIndex];
      const requiredNoteIndexForAnchor = (12+rootNoteIndex) % 12;

      for (let anchorFret = 0; anchorFret <= fretCount; anchorFret++) {
          const noteAtAnchorFret = (anchorStringTuning + anchorFret) % 12;

 

          if (noteAtAnchorFret === requiredNoteIndexForAnchor) {
              const instanceNotes: NoteRenderData[] = [];
              let isValidInstance = true;
              const absoluteFrets: number[] = [-1, -1, -1];

              for (let i = 0; i < 3; i++) {
                  const currentStringAbsoluteIndex = shape.stringGroup[i];
                  const currentStringTuning = tuning[currentStringAbsoluteIndex];
                  const absFret = anchorFret + shape.relativeFrets[i] - shape.relativeFrets[shape.rootStringIndexInGroup];
                  absoluteFrets[i] = absFret;

                  if (absFret < 0 || absFret > fretCount) {
                      isValidInstance = false; break;
                  }
                  const resultingNoteIndex = (currentStringTuning + absFret) % 12;

                  const noteName = MUSIC_NOTES[resultingNoteIndex]?.[0] ?? "?";
                  const intervalSemitones = Math.abs(resultingNoteIndex - rootNoteIndex) % 12;
                  const intervalLabel = getIntervalLabel(intervalSemitones);
                  const coords = coordCalculator.getNoteCoordinates(currentStringAbsoluteIndex, absFret);

                  instanceNotes.push({
                      fret: absFret, stringIndex: currentStringAbsoluteIndex,
                      noteName: noteName, intervalLabel: intervalLabel,
                      displayLabel: intervalLabel, colorSchemeOverride: "interval",
                      isRoot: intervalLabel === "R",
                      x: coords.x, y: coords.y
                  });
              }

              if (isValidInstance && instanceNotes.length === 3) {
                  // Create a unique key for this instance based on frets
                  const instanceKey = instanceNotes.map(n => `${n.stringIndex}:${n.fret}`).sort().join(',');
                  if (!addedInstances.has(instanceKey)) {
                      allNotesForGroup.push(...instanceNotes);
                      addedInstances.add(instanceKey); // Mark as added

                      // Add connecting lines
                      const lineColor = INVERSION_LINE_COLORS[shape.inversion] || 'grey';
                      instanceNotes.sort((a, b) => a.stringIndex - b.stringIndex);
                      for (let i = 0; i < 2; i++) {
                          allLinesForGroup.push({
                              startX: instanceNotes[i].x!, startY: instanceNotes[i].y!,
                              endX: instanceNotes[i+1].x!, endY: instanceNotes[i+1].y!,
                              color: lineColor, dashed: true, lineWidth: 1.5
                          });
                      }
                  }
              }
          }
      }
  }

  return { notes: allNotesForGroup, lines: allLinesForGroup };
}
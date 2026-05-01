import { Chord, BarreSpec } from "./chords";
import { Tuning } from "./fretboard";
import { getKeyIndex } from "./guitar_utils";

type MoveableQuality = "Major" | "Minor";

interface ShapeTemplate {
  name: string;
  quality: MoveableQuality;
  /** String index that holds the root note (0 = low E for guitar standard). */
  rootStringIndex: number;
  /** Per-string fret offset relative to root fret. -1 = muted. */
  stringOffsets: number[];
  fingers: number[];
  barres: Array<{ relativeFret: number; stringStart: number; stringEnd: number }>;
}

// E-shape: root on string 0 (low E). A-shape: root on string 1 (A).
// Both shapes apply to 6-string guitar in standard or similar tuning.
const GUITAR_SHAPE_TEMPLATES: ShapeTemplate[] = [
  {
    name: "E-Shape",
    quality: "Major",
    rootStringIndex: 0,
    stringOffsets: [0, 2, 2, 1, 0, 0],
    fingers: [1, 3, 4, 2, 1, 1],
    barres: [{ relativeFret: 0, stringStart: 0, stringEnd: 5 }],
  },
  {
    name: "E-Shape",
    quality: "Minor",
    rootStringIndex: 0,
    stringOffsets: [0, 2, 2, 0, 0, 0],
    fingers: [1, 3, 4, 1, 1, 1],
    barres: [{ relativeFret: 0, stringStart: 0, stringEnd: 5 }],
  },
  {
    name: "A-Shape",
    quality: "Major",
    rootStringIndex: 1,
    // Low E muted; index barres strings 1-5 at root fret;
    // ring finger covers strings 2-4 at root+2.
    stringOffsets: [-1, 0, 2, 2, 2, 0],
    fingers: [0, 1, 3, 3, 3, 1],
    barres: [{ relativeFret: 0, stringStart: 1, stringEnd: 5 }],
  },
  {
    name: "A-Shape",
    quality: "Minor",
    rootStringIndex: 1,
    // Like A major but B string (index 4) is one fret lower.
    stringOffsets: [-1, 0, 2, 2, 1, 0],
    fingers: [0, 1, 3, 4, 2, 1],
    barres: [{ relativeFret: 0, stringStart: 1, stringEnd: 5 }],
  },
];

export interface MoveableChordResult {
  chord: Chord;
  shapeName: string;
  title: string;
  rootFret: number;
  rootStringIndex: number;
}

/**
 * Infers Major vs Minor quality from a chord name string.
 * Dominant-7th chords (e.g. "G7") are treated as Major for shape selection purposes.
 */
function detectQuality(chordName: string): MoveableQuality {
  // Strip the root note (letter + optional accidental + optional space)
  const afterRoot = chordName.replace(/^[A-G][#b]?\s*/, "");
  // "m" or "min" indicates minor; "maj" is major (negative lookahead prevents matching "maj")
  if (/^(m(?!aj)|min)/i.test(afterRoot)) return "Minor";
  return "Major";
}

/**
 * Computes all applicable moveable barre chord shapes for a given chord name, using
 * the provided tuning. Only 6-string tunings are supported. Shapes where the root
 * fret would be 0 (open position) are omitted since they are not moveable barre chords.
 * Results are sorted by root fret ascending so the easiest (lowest-fret) shape comes first.
 */
export function getMoveableGuitarShapes(
  chordName: string,
  tuning: Tuning
): MoveableChordResult[] {
  const rootMatch = chordName.match(/^([A-G][#b]?)/);
  if (!rootMatch || tuning.tuning.length !== 6) return [];

  const rootNoteName = rootMatch[1];
  const rootNoteIndex = getKeyIndex(rootNoteName);
  if (rootNoteIndex === -1) return [];

  const quality = detectQuality(chordName);
  const results: MoveableChordResult[] = [];

  for (const template of GUITAR_SHAPE_TEMPLATES) {
    if (template.quality !== quality) continue;

    const openNote = tuning.tuning[template.rootStringIndex];
    const rootFret = ((rootNoteIndex - openNote) + 12) % 12;

    // Fret 0 means open position — not a moveable barre chord.
    if (rootFret === 0) continue;

    const strings = template.stringOffsets.map((offset) =>
      offset === -1 ? -1 : rootFret + offset
    );
    const barreSpecs: BarreSpec[] = template.barres.map((b) => ({
      fret: rootFret + b.relativeFret,
      stringStart: b.stringStart,
      stringEnd: b.stringEnd,
    }));

    const qualityLabel = quality === "Minor" ? "Minor" : "Major";
    const title = `${rootNoteName} ${qualityLabel} (${template.name})`;

    results.push({
      chord: new Chord(title, strings, [...template.fingers], barreSpecs),
      shapeName: template.name,
      title,
      rootFret,
      rootStringIndex: template.rootStringIndex,
    });
  }

  // Lower fret = easier to play physically.
  results.sort((a, b) => a.rootFret - b.rootFret);
  return results;
}

/** Returns the easiest (lowest root fret) moveable shape, or null if none apply. */
export function getEasiestMoveableGuitarShape(
  chordName: string,
  tuning: Tuning
): MoveableChordResult | null {
  return getMoveableGuitarShapes(chordName, tuning)[0] ?? null;
}

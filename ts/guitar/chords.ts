/** Specifies a barre across a contiguous range of strings at a given fret. */
export interface BarreSpec {
  fret: number;
  /** Lower string index (inclusive). */
  stringStart: number;
  /** Higher string index (inclusive). */
  stringEnd: number;
}

export class Chord {
  name: string;
  strings: Array<number>; // Fret number per string: -1 muted, 0 open, >0 fretted
  fingers: Array<number>; // Finger number: 0 open/muted, 1 index, 2 middle, 3 ring, 4 pinky
  barre?: BarreSpec[];

  constructor(name: string, strings: Array<number>, fingers: Array<number>, barre?: BarreSpec[]) {
    if (strings.length !== 6 || fingers.length !== 6) {
      throw new Error(
        `Chord ${name} must have 6 values for strings and fingers.`
      );
    }
    this.name = name;
    this.strings = strings;
    this.fingers = fingers;
    this.barre = barre;
  }
}

export const chord_library = {
  // --- Simple Majors ---
  A_MAJOR: new Chord("A Major", [-1, 0, 2, 2, 2, 0], [-1, 0, 2, 1, 3, 0]),
  C_MAJOR: new Chord("C Major", [-1, 3, 2, 0, 1, 0], [-1, 3, 2, 0, 1, 0]),
  D_MAJOR: new Chord("D Major", [-1, -1, 0, 2, 3, 2], [-1, -1, 0, 1, 3, 2]),
  E_MAJOR: new Chord("E Major", [0, 2, 2, 1, 0, 0], [0, 2, 3, 1, 0, 0]),
  F_MAJOR: new Chord(
    "F Major",
    [1, 3, 3, 2, 1, 1],
    [1, 3, 4, 2, 1, 1],
    [{ fret: 1, stringStart: 0, stringEnd: 5 }]
  ),
  G_MAJOR: new Chord("G Major", [3, 2, 0, 0, 0, 3], [2, 1, 0, 0, 0, 3]),

  // --- Simple Minors ---
  A_MINOR: new Chord("A Minor", [-1, 0, 2, 2, 1, 0], [-1, 0, 2, 3, 1, 0]),
  B_MINOR: new Chord(
    "B Minor",
    [-1, 2, 4, 4, 3, 2],
    [-1, 1, 3, 4, 2, 1],
    [{ fret: 2, stringStart: 1, stringEnd: 5 }]
  ),
  D_MINOR: new Chord("D Minor", [-1, -1, 0, 2, 3, 1], [-1, -1, 0, 2, 3, 1]),
  E_MINOR: new Chord("E Minor", [0, 2, 2, 0, 0, 0], [0, 2, 3, 0, 0, 0]),

  // --- Dominant 7th Chords ---
  A7: new Chord("A7", [-1, 0, 2, 0, 2, 0], [-1, 0, 2, 0, 3, 0]),
  B7: new Chord("B7", [-1, 2, 1, 2, 0, 2], [-1, 2, 1, 3, 0, 4]),
  C7: new Chord("C7", [-1, 3, 2, 3, 1, 0], [-1, 3, 2, 4, 1, 0]),
  D7: new Chord("D7", [-1, -1, 0, 2, 1, 2], [-1, -1, 0, 2, 1, 3]),
  E7: new Chord("E7", [0, 2, 0, 1, 0, 0], [0, 2, 0, 1, 0, 0]),
  F7: new Chord(
    "F7", // Barre chord
    [1, 3, 1, 2, 1, 1],
    [1, 3, 1, 2, 1, 1]
  ),
  G7: new Chord("G7", [3, 2, 0, 0, 0, 1], [3, 2, 0, 0, 0, 1]),

  // --- Major 7th Chords ---
  AMAJ7: new Chord("A Major 7", [-1, 0, 2, 1, 2, 0], [-1, 0, 2, 1, 3, 0]),
  CMAJ7: new Chord("C Major 7", [-1, 3, 2, 0, 0, 0], [-1, 3, 2, 0, 0, 0]),
  DMAJ7: new Chord("D Major 7", [-1, -1, 0, 2, 2, 2], [-1, -1, 0, 1, 2, 3]),
  FMAJ7: new Chord("F Major 7", [-1, -1, 3, 2, 1, 0], [-1, -1, 3, 2, 1, 0]),
  GMAJ7: new Chord("G Major 7", [3, 2, 0, 0, 0, 2], [2, 1, 0, 0, 0, 3]),

  // --- Minor 7th Chords ---
  AM7: new Chord("A Minor 7", [-1, 0, 2, 0, 1, 0], [-1, 0, 2, 0, 1, 0]),
  BM7: new Chord(
    "B Minor 7", // Barre chord
    [-1, 2, 4, 2, 3, 2],
    [-1, 1, 3, 1, 2, 1]
  ),
  CM7: new Chord(
    "C Minor 7", // Barre chord
    [-1, 3, 5, 3, 4, 3],
    [-1, 1, 3, 1, 2, 1]
  ),
  DM7: new Chord("D Minor 7", [-1, -1, 0, 2, 1, 1], [-1, -1, 0, 2, 1, 1]),
  EM7: new Chord("E Minor 7", [0, 2, 0, 0, 0, 0], [0, 2, 0, 0, 0, 0]),
  GM7: new Chord(
    "G Minor 7", // Barre chord
    [3, 5, 3, 3, 3, 3],
    [1, 3, 1, 1, 1, 1]
  ),

  // --- Suspended Chords ---
  ASUS2: new Chord("Asus2", [-1, 0, 2, 2, 0, 0], [-1, 0, 2, 3, 0, 0]),
  ASUS4: new Chord("Asus4", [-1, 0, 2, 2, 3, 0], [-1, 0, 1, 2, 4, 0]),
  DSUS2: new Chord("Dsus2", [-1, -1, 0, 2, 3, 0], [-1, -1, 0, 1, 3, 0]),
  DSUS4: new Chord("Dsus4", [-1, -1, 0, 2, 3, 3], [-1, -1, 0, 1, 2, 3]),
  ESUS4: new Chord("Esus4", [0, 2, 2, 2, 0, 0], [0, 1, 2, 3, 0, 0]),

  // --- Other Common Barre Chords ---
  B_MAJOR: new Chord("B Major", [-1, 2, 4, 4, 4, 2], [-1, 1, 3, 3, 3, 1]),
  Fsharp_MINOR: new Chord("F# Minor", [2, 4, 4, 2, 2, 2], [1, 3, 4, 1, 1, 1]),
  Csharp_MINOR: new Chord("C# Minor", [-1, 4, 6, 6, 5, 4], [-1, 1, 3, 4, 2, 1]),
};

// ---------------------------------------------------------------------------
// Comprehensive chord tones library (dynamically generated)
// ---------------------------------------------------------------------------
// Note names indexed from A=0, matching MUSIC_NOTES order in guitar_utils.ts.
// Uses a conventional mixed sharp/flat spelling: sharps for C#, F#, G#;
// flats for Bb, Eb, Ab.
const _TONE_NAMES = ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab'];

interface _ChordTypeSpec {
  key: string;
  name: string;
  intervals: number[]; // semitone offsets from root (may exceed 11 for extensions)
}

const _CHORD_TYPES: _ChordTypeSpec[] = [
  { key: 'MAJ',     name: 'Major',         intervals: [0, 4, 7] },
  { key: 'MIN',     name: 'Minor',         intervals: [0, 3, 7] },
  //{ key: 'DOM7',    name: 'Dom 7',         intervals: [0, 4, 7, 10] },
  { key: 'MAJ7',    name: 'Major 7',       intervals: [0, 4, 7, 11] },
  { key: 'MIN7',    name: 'Minor 7',       intervals: [0, 3, 7, 10] },
  { key: 'SUS2',    name: 'Sus2',          intervals: [0, 2, 7] },
  { key: 'SUS4',    name: 'Sus4',          intervals: [0, 5, 7] },
  //{ key: 'DIM',     name: 'Diminished',    intervals: [0, 3, 6] },
  //{ key: 'AUG',     name: 'Augmented',     intervals: [0, 4, 8] },
  //{ key: 'DIM7',    name: 'Dim 7',         intervals: [0, 3, 6, 9] },
  //{ key: 'HDIM7',   name: 'Half-Dim 7',    intervals: [0, 3, 6, 10] },
  //{ key: 'MINMAJ7', name: 'Minor-Maj 7',   intervals: [0, 3, 7, 11] },
  //{ key: 'DOM9',    name: 'Dom 9',         intervals: [0, 4, 7, 10, 14] },
  //{ key: 'MAJ9',    name: 'Major 9',       intervals: [0, 4, 7, 11, 14] },
  //{ key: 'MIN9',    name: 'Minor 9',       intervals: [0, 3, 7, 10, 14] },
  { key: 'ADD9',    name: 'Add 9',         intervals: [0, 4, 7, 14] },
  //{ key: 'MADD9',   name: 'Minor Add 9',   intervals: [0, 3, 7, 14] },
  //{ key: 'MAJ6',    name: 'Major 6',       intervals: [0, 4, 7, 9] },
  //{ key: 'MIN6',    name: 'Minor 6',       intervals: [0, 3, 7, 9] },
];

interface _RootNoteSpec {
  key: string;    // used in library key  (e.g. "C#")
  name: string;   // display name          (e.g. "C#")
  noteIndex: number; // index into _TONE_NAMES (A=0)
}

const _ROOT_NOTES: _RootNoteSpec[] = [
  { key: 'A',  name: 'A',  noteIndex: 0  },
  { key: 'Bb', name: 'Bb', noteIndex: 1  },
  { key: 'B',  name: 'B',  noteIndex: 2  },
  { key: 'C',  name: 'C',  noteIndex: 3  },
  { key: 'C#', name: 'C#', noteIndex: 4  },
  { key: 'D',  name: 'D',  noteIndex: 5  },
  { key: 'Eb', name: 'Eb', noteIndex: 6  },
  { key: 'E',  name: 'E',  noteIndex: 7  },
  { key: 'F',  name: 'F',  noteIndex: 8  },
  { key: 'F#', name: 'F#', noteIndex: 9  },
  { key: 'G',  name: 'G',  noteIndex: 10 },
  { key: 'Ab', name: 'Ab', noteIndex: 11 },
];

export interface ChordToneEntry {
  name: string;
  tones: string[]; // note names (enharmonics match via MUSIC_NOTES in guitar_utils)
}

/** Comprehensive chord tones library for all 12 roots × 19 chord types.
 *  Keys have the form "{Root}_{TYPE}", e.g. "C#_DOM7", "Eb_MIN7". */
export const chord_tones_library: Record<string, ChordToneEntry> = (() => {
  const lib: Record<string, ChordToneEntry> = {};
  for (const root of _ROOT_NOTES) {
    for (const type of _CHORD_TYPES) {
      const key = `${root.key}_${type.key}`;
      const tones = type.intervals.map(
        interval => _TONE_NAMES[(root.noteIndex + interval) % 12]
      );
      lib[key] = { name: `${root.name} ${type.name}`, tones };
    }
  }
  return lib;
})();

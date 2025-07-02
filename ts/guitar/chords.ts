export class Chord {
  name: string;
  strings: Array<number>; // Fret number per string: -1 muted, 0 open, >0 fretted
  fingers: Array<number>; // Finger number: 0 open/muted, 1 index, 2 middle, 3 ring, 4 pinky

  constructor(name: string, strings: Array<number>, fingers: Array<number>) {
    if (strings.length !== 6 || fingers.length !== 6) {
      throw new Error(
        `Chord ${name} must have 6 values for strings and fingers.`
      );
    }
    this.name = name;
    this.strings = strings;
    this.fingers = fingers;
  }
}

export const chord_library = {
  // --- Simple Majors ---
  A_MAJOR: new Chord("A Major", [-1, 0, 2, 2, 2, 0], [-1, 0, 2, 1, 3, 0]),
  C_MAJOR: new Chord("C Major", [-1, 3, 2, 0, 1, 0], [-1, 3, 2, 0, 1, 0]),
  D_MAJOR: new Chord("D Major", [-1, -1, 0, 2, 3, 2], [-1, -1, 0, 1, 3, 2]),
  E_MAJOR: new Chord("E Major", [0, 2, 2, 1, 0, 0], [0, 2, 3, 1, 0, 0]),
  F_MAJOR: new Chord(
    "F Major", // Barre chord
    [1, 3, 3, 2, 1, 1],
    [1, 3, 4, 2, 1, 1]
  ),
  G_MAJOR: new Chord("G Major", [3, 2, 0, 0, 0, 3], [2, 1, 0, 0, 0, 3]),

  // --- Simple Minors ---
  A_MINOR: new Chord("A Minor", [-1, 0, 2, 2, 1, 0], [-1, 0, 2, 3, 1, 0]),
  B_MINOR: new Chord(
    "B Minor", // Barre chord
    [-1, 2, 4, 4, 3, 2],
    [-1, 1, 3, 4, 2, 1]
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
  ASUS4: new Chord("Asus4", [-1, 0, 2, 2, 3, 0], [-1, 0, 1, 2, 4, 0]), // Adjusted finger 3->4
  DSUS2: new Chord("Dsus2", [-1, -1, 0, 2, 3, 0], [-1, -1, 0, 1, 3, 0]),
  DSUS4: new Chord("Dsus4", [-1, -1, 0, 2, 3, 3], [-1, -1, 0, 1, 2, 3]), // Corrected fingers
  ESUS4: new Chord("Esus4", [0, 2, 2, 2, 0, 0], [0, 1, 2, 3, 0, 0]), // Corrected fingers

  // --- Other Common Barre Chords ---
  B_MAJOR: new Chord("B Major", [-1, 2, 4, 4, 4, 2], [-1, 1, 3, 3, 3, 1]),
  Fsharp_MINOR: new Chord("F# Minor", [2, 4, 4, 2, 2, 2], [1, 3, 4, 1, 1, 1]),
  Csharp_MINOR: new Chord("C# Minor", [-1, 4, 6, 6, 5, 4], [-1, 1, 3, 4, 2, 1]),
};

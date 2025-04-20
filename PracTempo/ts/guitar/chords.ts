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
  A_MAJOR: new Chord("A", [-1, 0, 2, 2, 2, 0], [-1, 0, 2, 1, 3, 0]), // Can also use 1,2,3 fingers
  C_MAJOR: new Chord("C", [-1, 3, 2, 0, 1, 0], [-1, 3, 2, 0, 1, 0]),
  D_MAJOR: new Chord("D", [-1, -1, 0, 2, 3, 2], [-1, -1, 0, 1, 3, 2]), // Corrected finger 3->2
  E_MAJOR: new Chord("E", [0, 2, 2, 1, 0, 0], [0, 2, 3, 1, 0, 0]),
  F_MAJOR: new Chord(
    "F", // Barre chord
    [1, 3, 3, 2, 1, 1],
    [1, 3, 4, 2, 1, 1]
  ), // Finger 1 is barre
  G_MAJOR: new Chord("G", [3, 2, 0, 0, 0, 3], [2, 1, 0, 0, 0, 3]), // Common fingering
  // Alt G: [3, 2, 0, 0, 3, 3], [2, 1, 0, 0, 3, 4]

  // --- Simple Minors ---
  A_MINOR: new Chord(
    "Am", // Corrected name
    [-1, 0, 2, 2, 1, 0],
    [-1, 0, 2, 3, 1, 0]
  ),
  B_MINOR: new Chord(
    "Bm", // Barre chord, corrected name
    [-1, 2, 4, 4, 3, 2], // A-minor shape barre on 2nd fret
    [-1, 1, 3, 4, 2, 1]
  ), // Finger 1 is barre
  D_MINOR: new Chord(
    "Dm", // Corrected name
    [-1, -1, 0, 2, 3, 1],
    [-1, -1, 0, 2, 3, 1]
  ),
  E_MINOR: new Chord(
    "Em", // Corrected name
    [0, 2, 2, 0, 0, 0],
    [0, 2, 3, 0, 0, 0]
  ), // Can also use 1,2 fingers

  // --- Dominant 7th Chords (Added) ---
  A7: new Chord("A7", [-1, 0, 2, 0, 2, 0], [-1, 0, 2, 0, 3, 0]),
  B7: new Chord("B7", [-1, 2, 1, 2, 0, 2], [-1, 2, 1, 3, 0, 4]),
  C7: new Chord("C7", [-1, 3, 2, 3, 1, 0], [-1, 3, 2, 4, 1, 0]),
  D7: new Chord("D7", [-1, -1, 0, 2, 1, 2], [-1, -1, 0, 2, 1, 3]),
  E7: new Chord("E7", [0, 2, 0, 1, 0, 0], [0, 2, 0, 1, 0, 0]),
  F7: new Chord(
    "F7", // Barre chord
    [1, 3, 1, 2, 1, 1],
    [1, 3, 1, 2, 1, 1]
  ), // Finger 1 is barre
  G7: new Chord("G7", [3, 2, 0, 0, 0, 1], [3, 2, 0, 0, 0, 1]),

  // --- Major 7th Chords (Added) ---
  AMAJ7: new Chord("Amaj7", [-1, 0, 2, 1, 2, 0], [-1, 0, 2, 1, 3, 0]),
  CMAJ7: new Chord("Cmaj7", [-1, 3, 2, 0, 0, 0], [-1, 3, 2, 0, 0, 0]),
  DMAJ7: new Chord("Dmaj7", [-1, -1, 0, 2, 2, 2], [-1, -1, 0, 1, 2, 3]), // Often barred with finger 1
  FMAJ7: new Chord(
    "Fmaj7", // Common easier shape
    [-1, -1, 3, 2, 1, 0],
    [-1, -1, 3, 2, 1, 0]
  ),
  // Alt Fmaj7 (barre): [1, 3, 2, 2, 1, 1], [1, 3, 2, 2, 1, 1] - Finger 1 barre
  GMAJ7: new Chord(
    "Gmaj7", // Common open shape
    [3, 2, 0, 0, 0, 2],
    [2, 1, 0, 0, 0, 3]
  ),

  // --- Minor 7th Chords (Added) ---
  AM7: new Chord("Am7", [-1, 0, 2, 0, 1, 0], [-1, 0, 2, 0, 1, 0]),
  BM7: new Chord(
    "Bm7", // Barre chord
    [-1, 2, 4, 2, 3, 2],
    [-1, 1, 3, 1, 2, 1]
  ), // Finger 1 is barre
  CM7: new Chord(
    "Cm7", // Barre chord
    [-1, 3, 5, 3, 4, 3],
    [-1, 1, 3, 1, 2, 1]
  ), // Finger 1 is barre
  DM7: new Chord("Dm7", [-1, -1, 0, 2, 1, 1], [-1, -1, 0, 2, 1, 1]),
  EM7: new Chord("Em7", [0, 2, 0, 0, 0, 0], [0, 2, 0, 0, 0, 0]), // Simplest form
  // Alt Em7: [0, 2, 2, 0, 3, 0], [0, 1, 2, 0, 3, 0] or [0, 1, 2, 0, 4, 0]
  GM7: new Chord(
    "Gm7", // Barre chord
    [3, 5, 3, 3, 3, 3],
    [1, 3, 1, 1, 1, 1]
  ), // Finger 1 is barre

  // --- Suspended Chords (Added) ---
  ASUS2: new Chord("Asus2", [-1, 0, 2, 2, 0, 0], [-1, 0, 2, 3, 0, 0]),
  ASUS4: new Chord("Asus4", [-1, 0, 2, 2, 3, 0], [-1, 0, 1, 2, 3, 0]), // Often use pinky (4) for 3rd fret
  DSUS2: new Chord("Dsus2", [-1, -1, 0, 2, 3, 0], [-1, -1, 0, 1, 3, 0]),
  DSUS4: new Chord("Dsus4", [-1, -1, 0, 2, 3, 3], [-1, -1, 0, 1, 2, 3]), // Corrected finger 3->2, 4->3
  ESUS4: new Chord("Esus4", [0, 2, 2, 2, 0, 0], [0, 2, 3, 4, 0, 0]), // Using fingers 2,3,4
  // Alt Esus4: [0, 0, 2, 2, 0, 0], [0, 0, 2, 3, 0, 0]

  // --- Other Common Barre Chords (Added) ---
  B_MAJOR: new Chord(
    "B", // Barre chord (A-shape)
    [-1, 2, 4, 4, 4, 2],
    [-1, 1, 3, 3, 3, 1]
  ), // Finger 1 barre, Finger 3 mini-barre
  Fsharp_MINOR: new Chord(
    "F#m", // Barre chord (Em-shape)
    [2, 4, 4, 2, 2, 2],
    [1, 3, 4, 1, 1, 1]
  ), // Finger 1 is barre
  Csharp_MINOR: new Chord(
    "C#m", // Barre chord (Am-shape)
    [-1, 4, 6, 6, 5, 4],
    [-1, 1, 3, 4, 2, 1]
  ), // Finger 1 is barre
};

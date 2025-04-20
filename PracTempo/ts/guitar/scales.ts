export class Scale {
  name: string;
  // Degrees is also the semitones above root.
  degrees: Array<number>;

  constructor(name: string, degrees: Array<number>) {
    this.name = name;
    this.degrees = degrees;
  }
}

export const scale_names = {
  Blues: "MINOR_BLUES", // Default Blues alias to Minor Blues
  "Minor Blues": "MINOR_BLUES",
  "Major Blues": "MAJOR_BLUES",
  "Natural Minor": "NATURAL_MINOR",
  "Pure Minor": "NATURAL_MINOR",
  Minor: "NATURAL_MINOR",
  Major: "MAJOR",
  "Spanish Minor": "PHRYGIAN",
  "Dominant 7th": "MIXOLYDIAN",
  "Half-Diminished": "LOCRIAN",
  "Lydian Major": "LYDIAN",
  "Pentatonic Minor": "MINOR_PENTATONIC",
  "Pentatonic Major": "MAJOR_PENTATONIC",
  "Country & Western": "MAJOR_PENTATONIC",
  "Harmonic Minor": "HARMONIC_MINOR",
  "Melodic Minor": "MELODIC_MINOR", // Often refers to ascending form
  "Jazz Minor": "MELODIC_MINOR",
  "Phrygian Dominant": "PHRYGIAN_DOMINANT",
  "Spanish Gypsy": "PHRYGIAN_DOMINANT",
  "Jewish Scale": "PHRYGIAN_DOMINANT",
  "Whole Tone": "WHOLE_TONE",
  "Diminished WH": "DIMINISHED_WH",
  "Diminished HW": "DIMINISHED_HW",
  "Lydian Dominant": "LYDIAN_DOMINANT",
  "Lydian b7": "LYDIAN_DOMINANT",
  "Altered Scale": "ALTERED",
  "Super Locrian": "ALTERED",
  "Diminished Whole Tone": "ALTERED",
  "Bebop Dominant": "BEBOP_DOMINANT",
  "Hungarian Minor": "HUNGARIAN_MINOR",
  "Gypsy Minor": "HUNGARIAN_MINOR",

  // Modes
  "Ionian Mode": "MAJOR",
  "Dorian Mode": "DORIAN",
  "Dorian Minor": "DORIAN",
  "Phrygian Mode": "PHRYGIAN",
  "Lydian Mode": "LYDIAN",
  "Mixolydian Mode": "MIXOLYDIAN",
  "Aeolian Mode": "NATURAL_MINOR",
  "Locrian Mode": "LOCRIAN",
};

/**
 * As a reference, the interval qualities by semitone.
 * 0	Perfect Unison	P1
 * 1	Minor 2nd	m2
 * 2	Major 2nd	M2
 * 3	Minor 3rd	m3
 * 4	Major 3rd	M3
 * 5	Perfect 4th	P4
 * 6	Augmented 4th/Diminished 5th	A4/d5 (Tritone)
 * 7	Perfect 5th	P5
 * 8	Minor 6th	m6
 * 9	Major 6th	M6
 * 10	Minor 7th	m7
 * 11	Major 7th	M7
 * 12	Octave	P8
 */
export const scales = {
  // --- Existing Scales ---
  DORIAN: new Scale("Dorian Minor", [0, 2, 3, 5, 7, 9, 10]),
  PHRYGIAN: new Scale("Phrygian", [0, 1, 3, 5, 7, 8, 10]), // Corrected name from "Spanish Minor"
  LYDIAN: new Scale("Lydian", [0, 2, 4, 6, 7, 9, 11]),
  MIXOLYDIAN: new Scale("Mixolydian (Dominant 7th)", [0, 2, 4, 5, 7, 9, 10]),
  LOCRIAN: new Scale("Locrian", [0, 1, 3, 5, 6, 8, 10]),
  MAJOR: new Scale("Major (Ionian)", [0, 2, 4, 5, 7, 9, 11]),
  MAJOR_BLUES: new Scale("Major Blues", [0, 2, 3, 4, 7, 9]), // Added b3 to Major Pentatonic
  MAJOR_PENTATONIC: new Scale("Major Pentatonic", [0, 2, 4, 7, 9]),
  MINOR_BLUES: new Scale("Minor Blues", [0, 3, 5, 6, 7, 10]), // Minor Pentatonic + b5
  MINOR_PENTATONIC: new Scale("Minor Pentatonic", [0, 3, 5, 7, 10]),
  NATURAL_MINOR: new Scale("Natural Minor (Aeolian)", [0, 2, 3, 5, 7, 8, 10]),

  // --- Added Scales ---
  HARMONIC_MINOR: new Scale("Harmonic Minor", [0, 2, 3, 5, 7, 8, 11]), // Natural Minor with raised 7th
  MELODIC_MINOR: new Scale("Melodic Minor (Ascending)", [0, 2, 3, 5, 7, 9, 11]), // Natural Minor with raised 6th & 7th
  PHRYGIAN_DOMINANT: new Scale("Phrygian Dominant", [0, 1, 4, 5, 7, 8, 10]), // Phrygian with Major 3rd (5th mode of Harmonic Minor)
  WHOLE_TONE: new Scale("Whole Tone", [0, 2, 4, 6, 8, 10]), // Only whole steps
  DIMINISHED_WH: new Scale(
    "Diminished (Whole-Half)",
    [0, 2, 3, 5, 6, 8, 9, 11]
  ), // Symmetrical: W-H-W-H-W-H-W-H
  DIMINISHED_HW: new Scale(
    "Diminished (Half-Whole)",
    [0, 1, 3, 4, 6, 7, 9, 10]
  ), // Symmetrical: H-W-H-W-H-W-H-W
  LYDIAN_DOMINANT: new Scale(
    "Lydian Dominant (Lydian b7)",
    [0, 2, 4, 6, 7, 9, 10]
  ), // Lydian with b7 (4th mode of Melodic Minor)
  ALTERED: new Scale("Altered Scale (Super Locrian)", [0, 1, 3, 4, 6, 8, 10]), // Locrian with b4 (7th mode of Melodic Minor)
  BEBOP_DOMINANT: new Scale("Bebop Dominant", [0, 2, 4, 5, 7, 9, 10, 11]), // Mixolydian + passing Major 7th
  HUNGARIAN_MINOR: new Scale(
    "Hungarian Minor (Gypsy Minor)",
    [0, 2, 3, 6, 7, 8, 11]
  ), // Harmonic Minor with raised 4th
};

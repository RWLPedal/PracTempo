// ts/instrument/music_types.ts
// Shared music-theory enum types used across instrument features and view signals.

export enum KeyType {
  Major = 'Major',
  Minor = 'Minor',
}

export enum ChordQuality {
  Major      = 'Major',
  Minor      = 'Minor',
  Diminished = 'Diminished',
  Augmented  = 'Augmented',
  Dominant7th = 'Dominant7th',
  Major7th   = 'Major7th',
  Minor7th   = 'Minor7th',
  Unknown    = 'Unknown',
}

export enum NoteName {
  C      = 'C',
  CSharp = 'C#',
  Db     = 'Db',
  D      = 'D',
  DSharp = 'D#',
  Eb     = 'Eb',
  E      = 'E',
  F      = 'F',
  FSharp = 'F#',
  Gb     = 'Gb',
  G      = 'G',
  GSharp = 'G#',
  Ab     = 'Ab',
  A      = 'A',
  ASharp = 'A#',
  Bb     = 'Bb',
  B      = 'B',
}

// 12 chromatic semitones, C-indexed (0=C), sharps only — matches MIDI convention.
export const NOTE_NAMES: NoteName[] = [
  NoteName.C, NoteName.CSharp, NoteName.D, NoteName.DSharp,
  NoteName.E, NoteName.F, NoteName.FSharp, NoteName.G,
  NoteName.GSharp, NoteName.A, NoteName.ASharp, NoteName.B,
];

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

// ts/floating_views/drive_slots.ts
// Concrete drive source/target registrations. Import this file once at app startup
// (reference_main.ts) to wire all signal translations.

import { registerDriveSource, registerDriveTarget } from './drive_registry';
import { SignalKind, ChordSignal, KeySignal, DriveSignal } from './link_types';
import {
  resolveAbsoluteChordKey,
  resolveChordRootNote,
  isMajorChordSuffix,
  MAJOR_ROMANS,
  MINOR_ROMANS,
} from '../instrument/chord_key_resolver';

// ─── BackingTrackView as source ───────────────────────────────────────────────
// viewId must match the registered floating view id for the backing track.
// The BackingTrackView dispatches 'backing-track-tick' with:
//   { currentMeasure, currentChord, progRootNote, progKeyType }

registerDriveSource({
  viewId: 'drum_machine',
  extractSignals(detail: any): DriveSignal[] {
    const roman: string | null = detail?.currentChord ?? null;
    const root: string = detail?.progRootNote ?? 'C';
    const keyType: 'Major' | 'Minor' = detail?.progKeyType ?? 'Major';

    let chordKey: string | null = null;
    let chordRoot = root;
    let chordKeyType: 'Major' | 'Minor' = keyType;

    if (roman) {
      chordKey = resolveAbsoluteChordKey(roman, root, keyType);
      const resolvedRoot = resolveChordRootNote(roman, root, keyType);
      if (resolvedRoot) chordRoot = resolvedRoot;

      // Determine if this chord is major or minor quality
      const romans = keyType === 'Major' ? MAJOR_ROMANS : MINOR_ROMANS;
      const entry = romans.find(r => r.roman === roman);
      if (entry) chordKeyType = isMajorChordSuffix(entry.suffix) ? 'Major' : 'Minor';
    }

    const chordSignal: ChordSignal = {
      kind: SignalKind.Chord,
      chordKey,
      rootNote: chordRoot,
      keyType: chordKeyType,
      roman,
    };
    const keySignal: KeySignal = {
      kind: SignalKind.Key,
      rootNote: root,
      keyType,
    };
    return [chordSignal, keySignal];
  },
});

// ─── MultiSelectFretboard as source ──────────────────────────────────────────
// When the fretboard's config changes, emit one ChordSignal per chord layer.

registerDriveSource({
  viewId: 'configurable_instrument_feature',
  featureTypeName: 'MultiSelectFretboard',
  extractSignals(detail: any): ChordSignal[] {
    const config: string[] = detail?.config ?? [];
    const signals: ChordSignal[] = [];

    for (const layerStr of config) {
      const parts = layerStr.split('|');
      if (parts[0] === 'chord' && parts.length >= 3) {
        const chordKey = parts[1] || null;
        signals.push({
          kind: SignalKind.Chord,
          chordKey,
          rootNote: chordKey?.split('_')[0] ?? '',
          keyType: chordKey?.endsWith('MIN') || chordKey?.endsWith('MIN7') ? 'Minor' : 'Major',
          roman: null,
        });
      }
    }
    return signals;
  },
});

// ─── ScaleFeature as source ──────────────────────────────────────────────────
// When the scale config changes, emit a ChordSignal with the scale's root note.
// Using ChordSignal (not KeySignal) so drone targets can distinguish chord-level
// signals from overall-key signals and follow the scale root specifically.

registerDriveSource({
  viewId: 'configurable_instrument_feature',
  featureTypeName: 'Scale',
  extractSignals(detail: any): ChordSignal[] {
    const config: string[] = detail?.config ?? [];
    const rootNote: string = config[1] ?? 'C';
    const scaleName: string = config[0] ?? 'Major';
    const keyType: 'Major' | 'Minor' = scaleName.toLowerCase().includes('minor') ? 'Minor' : 'Major';
    return [{
      kind: SignalKind.Chord,
      chordKey: null,
      rootNote,
      keyType,
      roman: null,
    }];
  },
});

// ─── ChordFeature as target ───────────────────────────────────────────────────
// Drives the 'Root' and 'Type' args from any ChordSignal.

registerDriveTarget({
  featureTypeName: 'Chord',
  argName: 'Root',
  label: 'Root note (from linked source)',
  acceptedKinds: [SignalKind.Chord],
  resolveValue(signal: DriveSignal): string | null {
    if (signal.kind !== SignalKind.Chord) return null;
    return signal.rootNote || null;
  },
});

registerDriveTarget({
  featureTypeName: 'Chord',
  argName: 'Type',
  label: 'Chord type (from linked source)',
  acceptedKinds: [SignalKind.Chord],
  resolveValue(signal: DriveSignal): string | null {
    if (signal.kind !== SignalKind.Chord) return null;
    if (signal.chordKey) {
      const sep = signal.chordKey.indexOf('_');
      if (sep !== -1) {
        const suffix = signal.chordKey.slice(sep + 1);
        const suffixMap: Record<string, string> = {
          MAJ: 'Major', MIN: 'Minor', DOM7: '7', MAJ7: 'Maj7', MIN7: 'Min7',
        };
        const resolved = suffixMap[suffix];
        if (resolved) return resolved;
      }
    }
    return signal.keyType === 'Major' ? 'Major' : 'Minor';
  },
});

// ─── MultiSelectFretboard as target ──────────────────────────────────────────
// The 'Layers' arg uses a layer_list — driven layers are handled directly by
// MultiSelectFretboardFeature listening for 'drive-signal' on its container.
// This target slot is a placeholder so ConfigurableFeatureView knows to show
// 'Driven' options when a link points to a MultiSelectFretboard window.
// (The actual driven-layer resolution is done inside the feature itself.)

registerDriveTarget({
  featureTypeName: 'MultiSelectFretboard',
  argName: 'Layers',
  label: 'Driven layer (from linked source)',
  acceptedKinds: [SignalKind.Chord, SignalKind.Key],
  resolveValue(_signal: DriveSignal): string | null {
    // Resolution is delegated to MultiSelectFretboardFeature; return null here
    // so ConfigurableFeatureView does not rebuild unnecessarily.
    return null;
  },
});

// ─── ScaleFeature as target ───────────────────────────────────────────────────
// A KeySignal drives both the scale name (Major / Natural Minor) and root note.
// A ChordSignal also drives both, enabling MultiSelectFretboard → Scale links.
// When BackingTrack drives Scale both signals arrive; KeySignal (sent last) wins.

registerDriveTarget({
  featureTypeName: 'Scale',
  argName: 'ScaleName',
  label: 'Scale name (from linked source)',
  acceptedKinds: [SignalKind.Key, SignalKind.Chord],
  resolveValue(signal: DriveSignal): string | null {
    return signal.keyType === 'Major' ? 'Major' : 'Natural Minor';
  },
});

registerDriveTarget({
  featureTypeName: 'Scale',
  argName: 'Root Note',
  label: 'Root note (from linked source)',
  acceptedKinds: [SignalKind.Key, SignalKind.Chord],
  resolveValue(signal: DriveSignal): string | null {
    return signal.rootNote;
  },
});

// ─── TriadFeature as target ───────────────────────────────────────────────────
// Root Note is driven from any signal's root note.
// Qualities is driven from a KeySignal's key type (Major → 'Major', Minor → 'Minor').

registerDriveTarget({
  featureTypeName: 'Triad Shapes',
  argName: 'Root Note',
  label: 'Root note (from linked source)',
  acceptedKinds: [SignalKind.Chord, SignalKind.Key],
  resolveValue(signal: DriveSignal): string | null {
    return signal.rootNote || null;
  },
});

registerDriveTarget({
  featureTypeName: 'Triad Shapes',
  argName: 'Qualities',
  label: 'Quality (from linked key source)',
  acceptedKinds: [SignalKind.Key],
  transparent: true,
  resolveValue(signal: DriveSignal): string | null {
    if (signal.kind !== SignalKind.Key) return null;
    return signal.keyType === 'Major' ? 'Major' : 'Minor';
  },
});

// ─── ChordProgressionFeature as target ───────────────────────────────────────
// A KeySignal drives the root note and key type of the progression.

registerDriveTarget({
  featureTypeName: 'Chord Progression',
  argName: 'Root Note',
  label: 'Root note (from linked key source)',
  acceptedKinds: [SignalKind.Key],
  resolveValue(signal: DriveSignal): string | null {
    if (signal.kind !== SignalKind.Key) return null;
    return signal.rootNote;
  },
});

registerDriveTarget({
  featureTypeName: 'Chord Progression',
  argName: 'Key Type',
  label: 'Key type (from linked key source)',
  acceptedKinds: [SignalKind.Key],
  resolveValue(signal: DriveSignal): string | null {
    if (signal.kind !== SignalKind.Key) return null;
    return signal.keyType === 'Major' ? 'Major' : 'Minor';
  },
});

// ─── NotesFeature as target ───────────────────────────────────────────────────
// Drives the 'Root Note' arg to switch to interval-relative coloring.

registerDriveTarget({
  featureTypeName: 'Notes',
  argName: 'Root Note',
  label: 'Root note (from linked source)',
  acceptedKinds: [SignalKind.Chord, SignalKind.Key],
  resolveValue(signal: DriveSignal): string | null {
    return signal.rootNote || null;
  },
});

// ─── CagedFeature as target ───────────────────────────────────────────────────
// Drives the 'Root Note' arg to slide CAGED patterns to a new root.

registerDriveTarget({
  featureTypeName: 'CAGED',
  argName: 'Root Note',
  label: 'Root note (from linked source)',
  acceptedKinds: [SignalKind.Chord, SignalKind.Key],
  resolveValue(signal: DriveSignal): string | null {
    return signal.rootNote || null;
  },
});

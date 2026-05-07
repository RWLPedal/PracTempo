// ts/instrument/features/multi_select_fretboard_feature.ts

import { Feature, ConfigurationSchema, ConfigurationSchemaArg, ArgType, UiComponentType } from "../../feature";
import { InstrumentFeature } from "../instrument_base";
import { AppSettings } from "../../settings";
import { AudioController } from "../../audio_controller";
import { IntervalSettings } from "../../schedule/editor/interval/types";
import { InstrumentIntervalSettings } from "../instrument_interval_settings";
import { NoteRenderData } from "../fretboard";
import {
  NOTE_NAMES_FROM_A,
  NOTE_FLAT_ALIAS_FROM_A,
  getKeyIndex,
  getIntervalLabel,
  OPEN_NOTE_RADIUS_FACTOR,
  addHeader,
  clearAllChildren,
} from "../instrument_utils";
import { FretboardView } from "../views/fretboard_view";
import { scale_names, scales } from "../scales";
import { chord_tones_library } from "../chords";
import { NOTE_COLORS } from "../colors";
import {
  buildCagedLookup,
  compareCagedPositions,
  getCagedTuningOffset,
} from "./caged_feature";
import { DriveSignal, SignalKind } from "../../floating_views/link_types";
import { LayerType } from "./layer_types";

// --- Layer Spec Types ---

interface ScaleLayer {
  type: LayerType.Scale;
  scaleName: string;
  rootNote: string;
  color: string;
}

interface ChordLayer {
  type: LayerType.Chord;
  chordKey: string;
  color: string;
}

interface NotesLayer {
  type: LayerType.Notes;
  noteNames: string[];
  color: string;
}

interface CagedLayer {
  type: LayerType.Caged;
  scaleName: string;
  rootNote: string;
}

// A layer whose content is driven by a linked source window at runtime.
// subType: "chord" → show chord tones of the incoming chord
//          "scale" → show scale notes with the incoming root note (Major/Minor follows signal)
interface DrivenLayer {
  type: LayerType.Driven;
  subType: "chord" | "scale";
  color: string;
}

type LayerSpec = ScaleLayer | ChordLayer | NotesLayer | CagedLayer | DrivenLayer;

// --- Layer String Encoding ---
// Scale:   "scale|{scaleName}|{rootNote}|{hexColor}"
// Chord:   "chord|{chordKey}|{hexColor}"
// Notes:   "notes|{note1,note2,...}|{hexColor}"
// CAGED:   "caged|{scaleName}|{rootNote}"
// Driven:  "driven|chord|{hexColor}" or "driven|scale|{hexColor}"

function parseLayerString(layerStr: string): LayerSpec | null {
  const parts = layerStr.split("|");
  if (parts.length < 2) return null;

  const type = parts[0] as LayerType;

  if (type === LayerType.Caged && parts.length >= 3) {
    return { type: LayerType.Caged, scaleName: parts[1], rootNote: parts[2] };
  }

  if (type === LayerType.Driven && parts.length >= 3) {
    const subType = parts[1] === "scale" ? "scale" : "chord";
    return { type: LayerType.Driven, subType, color: parts[2] };
  }

  // All other types need at least 3 parts and have color as the last part
  if (parts.length < 3) return null;
  const color = parts[parts.length - 1];

  if (type === LayerType.Scale && parts.length >= 4) {
    return { type: LayerType.Scale, scaleName: parts[1], rootNote: parts[2], color };
  } else if (type === LayerType.Chord && parts.length >= 3) {
    return { type: LayerType.Chord, chordKey: parts[1], color };
  } else if (type === LayerType.Notes && parts.length >= 3) {
    const notesStr = parts[1];
    const noteNames = notesStr
      ? notesStr.split(",").map((n) => n.trim()).filter((n) => n.length > 0)
      : [];
    return { type: LayerType.Notes, noteNames, color };
  }
  return null;
}

// --- Feature Class ---

export class MultiSelectFretboardFeature extends InstrumentFeature {
  static readonly typeName = "MultiSelectFretboard";
  static readonly displayName = "Multi-Layer Fretboard";
  static readonly description =
    "Overlay multiple scales, chord tones, note sets, or CAGED patterns on a single fretboard. Each layer has its own color; layers listed first take precedence.";

  readonly typeName = MultiSelectFretboardFeature.typeName;
  private readonly layers: LayerSpec[];
  // Runtime overrides for driven layers: index into this.layers → resolved ChordSignal
  private drivenSignals = new Map<number, DriveSignal>();
  private fretboardViewInstance: FretboardView;
  private readonly fretCount = 18;
  private driveSignalHandler: ((e: Event) => void) | null = null;
  private featureContainer: HTMLElement | null = null;

  constructor(
    config: ReadonlyArray<string>,
    layers: LayerSpec[],
    settings: AppSettings,
    intervalSettings: InstrumentIntervalSettings,
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    super(config, settings, intervalSettings, audioController, maxCanvasHeight);
    this.layers = layers;

    this.fretboardViewInstance = new FretboardView(
      this.fretboardConfig,
      this.fretCount
    );
    this._views.unshift(this.fretboardViewInstance);

    this.calculateAndSetNotes();
  }

  public render(container: HTMLElement): void {
    this.featureContainer = container;
    clearAllChildren(container);
    const header = addHeader(container, "Multi-Layer Fretboard");
    header.classList.add("feature-main-title");

    // Listen for drive-signal events forwarded by ConfigurableFeatureView
    this.driveSignalHandler = (e: Event) => {
      const { signal } = (e as CustomEvent<{ signal: DriveSignal; linkId: string }>).detail;
      let changed = false;
      this.layers.forEach((layer, i) => {
        if (layer.type !== LayerType.Driven) return;
        const accepts =
          (layer.subType === 'chord' && signal.kind === SignalKind.Chord) ||
          (layer.subType === 'scale' && (signal.kind === SignalKind.Chord || signal.kind === SignalKind.Key));
        if (accepts) {
          this.drivenSignals.set(i, signal);
          changed = true;
        }
      });
      if (changed) {
        this.calculateAndSetNotes();
        // Relay so downstream windows (e.g. ChordDiagram, ScaleFeature) also receive the signal.
        container.dispatchEvent(new CustomEvent('feature-signal-relay', {
          bubbles: true,
          detail: { featureTypeName: MultiSelectFretboardFeature.typeName, signal },
        }));
      }
    };
    container.addEventListener('drive-signal', this.driveSignalHandler);
  }

  public destroy(): void {
    if (this.featureContainer && this.driveSignalHandler) {
      this.featureContainer.removeEventListener('drive-signal', this.driveSignalHandler);
    }
    super.destroy?.();
  }

  // --- Static Schema & Factory ---

  static getConfigurationSchema(): ConfigurationSchema {
    const availableScaleNames = Object.keys(scale_names).sort();
    const rootNoteOptions = NOTE_NAMES_FROM_A as string[];
    const chordEntries = Object.entries(chord_tones_library).map(([key, entry]) => ({
      key,
      label: entry.name,
    }));
    const noteNames = NOTE_NAMES_FROM_A as string[];

    const layersArg: ConfigurationSchemaArg = {
      name: "Layers",
      type: ArgType.String,
      isVariadic: true,
      uiComponentType: UiComponentType.LayerList,
      description:
        "Layers to display on the fretboard, top-to-bottom in the list equals highest-to-lowest precedence.",
      uiComponentData: {
        scaleNames: availableScaleNames,
        rootNoteOptions,
        chordEntries,
        noteNames,
      },
    };

    return {
      description: `Config: ${this.typeName}[,layer1][,layer2]...[,InstrumentSettings]`,
      args: [layersArg, InstrumentFeature.BASE_INSTRUMENT_SETTINGS_CONFIG_ARG],
    };
  }

  static createFeature(
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings,
    intervalSettings: IntervalSettings,
    maxCanvasHeight: number | undefined,
    _categoryName: string
  ): Feature {
    const layers: LayerSpec[] = [];
    for (const layerStr of config) {
      const parsed = parseLayerString(layerStr);
      if (parsed) layers.push(parsed);
    }
    return new MultiSelectFretboardFeature(
      config,
      layers,
      settings,
      intervalSettings as InstrumentIntervalSettings,
      audioController,
      maxCanvasHeight
    );
  }

  // --- Note Calculation ---

  private calculateAndSetNotes(): void {
    // Build a map keyed by "stringIndex-fret". Layers listed first win (highest precedence).
    const noteMap = new Map<string, NoteRenderData>();

    this.layers.forEach((layer, i) => {
      const drivenSignal = this.drivenSignals.get(i);
      const layerNotes = this.getLayerNotes(layer, drivenSignal);
      for (const note of layerNotes) {
        const key = `${note.stringIndex}-${note.fret}`;
        if (!noteMap.has(key)) {
          noteMap.set(key, note);
        }
      }
    });

    const notesData = Array.from(noteMap.values());
    requestAnimationFrame(() => {
      this.fretboardViewInstance.setNotes(notesData);
      this.fretboardViewInstance.setLines([]);
    });
  }

  private getLayerNotes(layer: LayerSpec, drivenSignal?: DriveSignal): NoteRenderData[] {
    switch (layer.type) {
      case LayerType.Scale:
        return this.getScaleLayerNotes(layer);
      case LayerType.Chord:
        return this.getChordLayerNotes(layer);
      case LayerType.Notes:
        return this.getNoteSetLayerNotes(layer.noteNames, layer.color);
      case LayerType.Caged:
        return this.getCagedLayerNotes(layer);
      case LayerType.Driven:
        return this.getDrivenLayerNotes(layer, drivenSignal);
      default:
        return [];
    }
  }

  private getDrivenLayerNotes(layer: DrivenLayer, signal?: DriveSignal): NoteRenderData[] {
    if (!signal) return [];
    if (layer.subType === "chord") {
      if (signal.kind !== SignalKind.Chord || !signal.chordKey) return [];
      return this.getChordLayerNotes({ type: LayerType.Chord, chordKey: signal.chordKey, color: layer.color });
    } else {
      // scale subType: driven by either a KeySignal or a ChordSignal (using rootNote/keyType)
      if (signal.kind !== SignalKind.Chord && signal.kind !== SignalKind.Key) return [];
      const scaleName = signal.keyType === "Major" ? "Major" : "Natural Minor";
      return this.getScaleLayerNotes({ type: LayerType.Scale, scaleName, rootNote: signal.rootNote, color: layer.color });
    }
  }

  private getScaleLayerNotes(layer: ScaleLayer): NoteRenderData[] {
    const scaleKey =
      scale_names[layer.scaleName as keyof typeof scale_names] ??
      layer.scaleName.toUpperCase().replace(/ /g, "_");
    const scale = scales[scaleKey as keyof typeof scales];
    if (!scale) return [];

    const keyIndex = getKeyIndex(layer.rootNote);
    if (keyIndex === -1) return [];

    const tuning = this.fretboardConfig.tuning.tuning;
    const notes: NoteRenderData[] = [];

    for (let stringIndex = 0; stringIndex < tuning.length; stringIndex++) {
      for (let fretIndex = 0; fretIndex <= this.fretCount; fretIndex++) {
        const noteOffset = (tuning[stringIndex] + fretIndex) % 12;
        const relativeOffset = (noteOffset - keyIndex + 12) % 12;
        if (!scale.degrees.includes(relativeOffset)) continue;

        const noteName = NOTE_NAMES_FROM_A[noteOffset] ?? "?";
        const intervalLabel = getIntervalLabel(relativeOffset);
        const isRoot = relativeOffset === 0;

        notes.push({
          fret: fretIndex,
          stringIndex,
          noteName,
          intervalLabel,
          displayLabel: intervalLabel,
          fillColor: layer.color,
          strokeColor: isRoot ? "#333" : "rgba(50,50,50,0.7)",
          strokeWidth: isRoot ? 2.0 : 1,
          radiusOverride:
            fretIndex === 0
              ? this.fretboardConfig.noteRadiusPx * OPEN_NOTE_RADIUS_FACTOR
              : undefined,
        });
      }
    }
    return notes;
  }

  private getChordLayerNotes(layer: ChordLayer): NoteRenderData[] {
    const entry = chord_tones_library[layer.chordKey];
    if (!entry || entry.tones.length === 0) return [];
    return this.getNoteSetLayerNotes(entry.tones, layer.color);
  }

  private getNoteSetLayerNotes(
    toneNames: string[],
    color: string
  ): NoteRenderData[] {
    const toneSet = new Set(toneNames);
    const tuning = this.fretboardConfig.tuning.tuning;
    const notes: NoteRenderData[] = [];

    for (let stringIndex = 0; stringIndex < tuning.length; stringIndex++) {
      for (let fretIndex = 0; fretIndex <= this.fretCount; fretIndex++) {
        const noteOffset = (tuning[stringIndex] + fretIndex) % 12;
        const noteName = NOTE_NAMES_FROM_A[noteOffset] ?? "?";
        const alias = NOTE_FLAT_ALIAS_FROM_A[noteOffset];
        if (!toneSet.has(noteName) && !(alias && toneSet.has(alias))) continue;

        notes.push({
          fret: fretIndex,
          stringIndex,
          noteName,
          intervalLabel: noteName,
          displayLabel: noteName,
          fillColor: color,
          strokeColor: "rgba(50,50,50,0.7)",
          strokeWidth: 1.5,
          radiusOverride:
            fretIndex === 0
              ? this.fretboardConfig.noteRadiusPx * OPEN_NOTE_RADIUS_FACTOR
              : undefined,
        });
      }
    }
    return notes;
  }

  private getCagedLayerNotes(layer: CagedLayer): NoteRenderData[] {
    // CAGED patterns are only defined for 6-string guitar.
    if (this.fretboardConfig.tuning.tuning.length !== 6) return [];

    const scaleKey =
      scale_names[layer.scaleName as keyof typeof scale_names] ??
      layer.scaleName.toUpperCase().replace(/ /g, "_");
    const scale = scales[scaleKey as keyof typeof scales];
    if (!scale) return [];

    const keyIndex = getKeyIndex(layer.rootNote);
    if (keyIndex === -1) return [];

    const isMinor = layer.scaleName.toLowerCase().includes("minor");
    const relativeMajorKeyIndex = isMinor ? (keyIndex + 3) % 12 : keyIndex;
    const tuningOffset = getCagedTuningOffset(this.fretboardConfig.tuning);
    const cagedLookup = buildCagedLookup(relativeMajorKeyIndex, this.fretCount, tuningOffset);

    const tuning = this.fretboardConfig.tuning.tuning;
    const notes: NoteRenderData[] = [];

    for (let stringIndex = 0; stringIndex < tuning.length; stringIndex++) {
      for (let fretIndex = 0; fretIndex <= this.fretCount; fretIndex++) {
        const noteOffset = (tuning[stringIndex] + fretIndex) % 12;
        const relativeOffset = (noteOffset - keyIndex + 12) % 12;
        if (!scale.degrees.includes(relativeOffset)) continue;

        const noteName = NOTE_NAMES_FROM_A[noteOffset] ?? "?";
        const intervalLabel = getIntervalLabel(relativeOffset);

        const lookupKey = `${stringIndex}:${fretIndex}`;
        const shapeMembership = cagedLookup.get(lookupKey) ?? [];
        const sorted =
          shapeMembership.length >= 2
            ? [...shapeMembership].sort((a, b) =>
                compareCagedPositions(a.position, b.position)
              )
            : shapeMembership;

        const cagedColor1 =
          sorted.length >= 1 ? (NOTE_COLORS[sorted[0].shape] ?? "#888888") : "#909090";
        const cagedColor2 =
          sorted.length >= 2 ? (NOTE_COLORS[sorted[1].shape] ?? "#888888") : null;

        const fillColor: string | string[] =
          sorted.length === 0
            ? "#909090"
            : sorted.length === 1
            ? cagedColor1
            : [cagedColor1, cagedColor2!];

        notes.push({
          fret: fretIndex,
          stringIndex,
          noteName,
          intervalLabel,
          displayLabel: intervalLabel,
          fillColor,
          strokeColor: "rgba(40, 40, 40, 0.6)",
          strokeWidth: 1,
          radiusOverride:
            fretIndex === 0
              ? this.fretboardConfig.noteRadiusPx * OPEN_NOTE_RADIUS_FACTOR
              : undefined,
        });
      }
    }
    return notes;
  }

}

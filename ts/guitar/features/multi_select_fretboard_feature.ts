// ts/guitar/features/multi_select_fretboard_feature.ts

import { Feature, ConfigurationSchema, ConfigurationSchemaArg } from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { AppSettings } from "../../settings";
import { AudioController } from "../../audio_controller";
import { IntervalSettings } from "../../schedule/editor/interval/types";
import { GuitarIntervalSettings } from "../guitar_interval_settings";
import { NoteRenderData } from "../fretboard";
import {
  MUSIC_NOTES,
  getKeyIndex,
  getIntervalLabel,
  OPEN_NOTE_RADIUS_FACTOR,
  addHeader,
  clearAllChildren,
} from "../guitar_utils";
import { FretboardView } from "../views/fretboard_view";
import { scale_names, scales } from "../scales";
import { chord_tones_library } from "../chords";
import { NOTE_COLORS } from "../colors";
import {
  buildCagedLookup,
  compareCagedPositions,
  getCagedTuningOffset,
} from "./caged_feature";

// --- Layer Spec Types ---

interface ScaleLayer {
  type: "scale";
  scaleName: string;
  rootNote: string;
  color: string;
}

interface ChordLayer {
  type: "chord";
  chordKey: string;
  color: string;
}

interface NotesLayer {
  type: "notes";
  noteNames: string[];
  color: string;
}

interface CagedLayer {
  type: "caged";
  scaleName: string;
  rootNote: string;
}

type LayerSpec = ScaleLayer | ChordLayer | NotesLayer | CagedLayer;

// --- Layer String Encoding ---
// Scale:  "scale|{scaleName}|{rootNote}|{hexColor}"
// Chord:  "chord|{chordKey}|{hexColor}"
// Notes:  "notes|{note1,note2,...}|{hexColor}"
// CAGED:  "caged|{scaleName}|{rootNote}"

function parseLayerString(layerStr: string): LayerSpec | null {
  const parts = layerStr.split("|");
  if (parts.length < 2) return null;

  const type = parts[0];

  if (type === "caged" && parts.length >= 3) {
    return { type: "caged", scaleName: parts[1], rootNote: parts[2] };
  }

  // All other types need at least 3 parts and have color as the last part
  if (parts.length < 3) return null;
  const color = parts[parts.length - 1];

  if (type === "scale" && parts.length >= 4) {
    return { type: "scale", scaleName: parts[1], rootNote: parts[2], color };
  } else if (type === "chord" && parts.length >= 3) {
    return { type: "chord", chordKey: parts[1], color };
  } else if (type === "notes" && parts.length >= 3) {
    const notesStr = parts[1];
    const noteNames = notesStr
      ? notesStr.split(",").map((n) => n.trim()).filter((n) => n.length > 0)
      : [];
    return { type: "notes", noteNames, color };
  }
  return null;
}

// --- Feature Class ---

export class MultiSelectFretboardFeature extends GuitarFeature {
  static readonly typeName = "MultiSelectFretboard";
  static readonly displayName = "Multi-Layer Fretboard";
  static readonly description =
    "Overlay multiple scales, chord tones, note sets, or CAGED patterns on a single fretboard. Each layer has its own color; layers listed first take precedence.";

  readonly typeName = MultiSelectFretboardFeature.typeName;
  private readonly layers: LayerSpec[];
  private fretboardViewInstance: FretboardView;
  private readonly fretCount = 18;

  constructor(
    config: ReadonlyArray<string>,
    layers: LayerSpec[],
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings,
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

  // --- Static Schema & Factory ---

  static getConfigurationSchema(): ConfigurationSchema {
    const availableScaleNames = Object.keys(scale_names).sort();
    const rootNoteOptions = ([] as string[]).concat(...MUSIC_NOTES);
    const chordEntries = Object.entries(chord_tones_library).map(([key, entry]) => ({
      key,
      label: entry.name,
    }));
    const noteNames = MUSIC_NOTES.map((n) => n[0]);

    const layersArg: ConfigurationSchemaArg = {
      name: "Layers",
      type: "string",
      isVariadic: true,
      uiComponentType: "layer_list",
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
      description: `Config: ${this.typeName}[,layer1][,layer2]...[,GuitarSettings]`,
      args: [layersArg, GuitarFeature.BASE_GUITAR_SETTINGS_CONFIG_ARG],
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
      intervalSettings as GuitarIntervalSettings,
      audioController,
      maxCanvasHeight
    );
  }

  // --- Note Calculation ---

  private calculateAndSetNotes(): void {
    // Build a map keyed by "stringIndex-fret". Layers listed first win (highest precedence).
    const noteMap = new Map<string, NoteRenderData>();

    for (const layer of this.layers) {
      const layerNotes = this.getLayerNotes(layer);
      for (const note of layerNotes) {
        const key = `${note.stringIndex}-${note.fret}`;
        if (!noteMap.has(key)) {
          noteMap.set(key, note);
        }
      }
    }

    const notesData = Array.from(noteMap.values());
    requestAnimationFrame(() => {
      this.fretboardViewInstance.setNotes(notesData);
      this.fretboardViewInstance.setLines([]);
    });
  }

  private getLayerNotes(layer: LayerSpec): NoteRenderData[] {
    switch (layer.type) {
      case "scale":
        return this.getScaleLayerNotes(layer);
      case "chord":
        return this.getChordLayerNotes(layer);
      case "notes":
        return this.getNoteSetLayerNotes(layer.noteNames, layer.color);
      case "caged":
        return this.getCagedLayerNotes(layer);
      default:
        return [];
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

        const noteName = MUSIC_NOTES[noteOffset]?.[0] ?? "?";
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
        const noteGroup = MUSIC_NOTES[noteOffset] ?? [];
        if (!noteGroup.some((n) => toneSet.has(n))) continue;

        const noteName = noteGroup[0] ?? "?";
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

        const noteName = MUSIC_NOTES[noteOffset]?.[0] ?? "?";
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

  render(container: HTMLElement): void {
    clearAllChildren(container);
    const header = addHeader(container, "Multi-Layer Fretboard");
    header.classList.add("feature-main-title");
  }
}

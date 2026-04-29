/* ts/guitar/features/caged_feature.ts */

import {
  Feature,
  ConfigurationSchema,
  ConfigurationSchemaArg,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Scale, scales, scale_names } from "../scales";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import { IntervalSettings } from "../../schedule/editor/interval/types";
import { GuitarIntervalSettings } from "../guitar_interval_settings";
import { NoteRenderData, FretboardConfig, Tuning } from "../fretboard";
import {
  getKeyIndex,
  MUSIC_NOTES,
  getIntervalLabel,
  OPEN_NOTE_RADIUS_FACTOR,
  addHeader,
  clearAllChildren,
} from "../guitar_utils";
import { FretboardView } from "../views/fretboard_view";
import { getColor as getColorFromScheme, NOTE_COLORS } from "../colors";
import { volumeManager } from "../../sounds/volume_manager";

// --- CAGED Definitions ---
export type CagedShapeName = "C" | "A" | "G" | "E" | "D";
type LabelDisplayType = "Note Name" | "Interval";
type FillDisplayType = "Filled" | "Note" | "Empty";

// --- Reference CAGED Pattern Structure ---
interface CagedReferenceNote {
  string: number; // 0-5 (0=Low E)
  fret: number;   // Absolute fret number for the reference key (A Major)
}
interface CagedReferencePattern {
  shape: CagedShapeName;
  position: number; // Position number (1-5)
  notes: CagedReferenceNote[];
}

// Helper function to compare CAGED positions (5 < 1 < 2 < 3 < 4)
export function compareCagedPositions(a: number, b: number): number {
  if (a === 5 && b === 1) return -1;
  if (b === 5 && a === 1) return 1;
  return a - b;
}

// --- Reference CAGED Pattern Data (Key of A Major) ---
// NOTE: This data MUST be accurately populated for the A Major scale notes
// within the bounds of each visual CAGED shape across the fretboard.
export const CAGED_REFERENCE_PATTERNS: CagedReferencePattern[] = [
  // A-Shape (Position 4)
  {
    shape: "A",
    position: 4,
    notes: [
      { string: 0, fret: 10 },
      { string: 0, fret: 12 },
      { string: 0, fret: 14 }, // Low E root and 2nd
      { string: 1, fret: 11 },
      { string: 1, fret: 12 },
      { string: 1, fret: 14 }, // A string
      { string: 2, fret: 11 },
      { string: 2, fret: 12 },
      { string: 2, fret: 14 }, // D string
      { string: 3, fret: 11 },
      { string: 3, fret: 13 },
      { string: 3, fret: 14 }, // G string
      { string: 4, fret: 12 },
      { string: 4, fret: 14 },
      { string: 4, fret: 15 }, // B string
      { string: 5, fret: 12 },
      { string: 5, fret: 14 }, // High E string
    ],
  },
  // G-Shape (Position 5)
  {
    shape: "G",
    position: 5,
    notes: [
      { string: 0, fret: 2 },
      { string: 0, fret: 4 },
      { string: 0, fret: 5 }, // Low E root and 2nd
      { string: 1, fret: 2 },
      { string: 1, fret: 4 },
      { string: 1, fret: 5 }, // A string
      { string: 2, fret: 2 },
      { string: 2, fret: 4 }, // D string
      { string: 3, fret: 1 },
      { string: 3, fret: 2 },
      { string: 3, fret: 4 }, // G string
      { string: 4, fret: 2 },
      { string: 4, fret: 3 },
      { string: 4, fret: 5 }, // B string
      { string: 5, fret: 2 },
      { string: 5, fret: 4 },
      { string: 5, fret: 5 }, // High E string
    ],
  },
  // E-Shape (Position 1)
  {
    shape: "E",
    position: 1,
    notes: [
      { string: 0, fret: 4 },
      { string: 0, fret: 5 },
      { string: 0, fret: 7 }, // Low E
      { string: 1, fret: 4 },
      { string: 1, fret: 5 },
      { string: 1, fret: 7 }, // A string
      { string: 2, fret: 4 },
      { string: 2, fret: 6 },
      { string: 2, fret: 7 }, // D string
      { string: 3, fret: 4 },
      { string: 3, fret: 6 },
      { string: 3, fret: 7 }, // G string
      { string: 4, fret: 5 },
      { string: 4, fret: 7 }, // B string
      { string: 5, fret: 4 },
      { string: 5, fret: 5 },
      { string: 5, fret: 7 }, // High E string
    ],
  },
  // D-Shape (Position 2)
  {
    shape: "D",
    position: 2,
    notes: [
      { string: 0, fret: 7 },
      { string: 0, fret: 9 },
      { string: 0, fret: 10 }, // Low E
      { string: 1, fret: 7 },
      { string: 1, fret: 9 }, // A string
      { string: 2, fret: 6 },
      { string: 2, fret: 7 },
      { string: 2, fret: 9 }, // D string
      { string: 3, fret: 6 },
      { string: 3, fret: 7 },
      { string: 3, fret: 9 }, // G string
      { string: 4, fret: 7 },
      { string: 4, fret: 9 },
      { string: 4, fret: 10 }, // B string
      { string: 5, fret: 7 },
      { string: 5, fret: 9 },
      { string: 5, fret: 10 }, // High E string
    ],
  },
  // C-Shape (Position 3)
  {
    shape: "C",
    position: 3,
    notes: [
      { string: 0, fret: 9 },
      { string: 0, fret: 10 },
      { string: 0, fret: 12 }, // Low E
      { string: 1, fret: 9 },
      { string: 1, fret: 11 },
      { string: 1, fret: 12 }, // A string
      { string: 2, fret: 9 },
      { string: 2, fret: 11 },
      { string: 2, fret: 12 }, // D string
      { string: 3, fret: 9 },
      { string: 3, fret: 11 }, // G string
      { string: 4, fret: 9 },
      { string: 4, fret: 10 },
      { string: 4, fret: 12 }, // B string
      { string: 5, fret: 9 },
      { string: 5, fret: 10 },
      { string: 5, fret: 12 }, // High E string
    ],
  },
];

/**
 * Returns the number of frets to add to standard-tuning CAGED reference positions
 * to account for a tuning that is uniformly shifted from standard E tuning.
 * Returns 0 for non-uniform tunings like Drop D (which only detunes one string),
 * because the uniform-shift model doesn't apply there.
 */
export function getCagedTuningOffset(tuning: Tuning): number {
  const STANDARD_INTERVALS = [5, 5, 5, 4, 5]; // P4-P4-P4-M3-P4
  for (let i = 0; i < 5; i++) {
    const interval = ((tuning.tuning[i + 1] - tuning.tuning[i]) + 12) % 12;
    if (interval !== STANDARD_INTERVALS[i]) return 0;
  }
  // All intervals match standard guitar structure; compute offset from low E (index 7)
  return (7 - tuning.tuning[0] + 12) % 12;
}

/**
 * Builds a lookup map from "string:fret" to the CAGED shapes (up to 2) that
 * contain that position, transposed from the A-major reference to the given
 * relative-major key index and tuning offset.
 * Pass tuningOffset from getCagedTuningOffset() for non-standard (e.g. baritone) tunings.
 */
export function buildCagedLookup(
  relativeMajorKeyIndex: number,
  fretCount: number,
  tuningOffset: number = 0
): Map<string, { shape: CagedShapeName; position: number }[]> {
  const lookup = new Map<string, { shape: CagedShapeName; position: number }[]>();
  // Reference patterns are in A major (index 0 in our offset system) on standard tuning
  const slideOffset = (relativeMajorKeyIndex + 12) % 12;

  for (const pattern of CAGED_REFERENCE_PATTERNS) {
    for (const refNote of pattern.notes) {
      for (let octave = -2; octave <= 2; octave++) {
        const expectedFret = refNote.fret + slideOffset + tuningOffset + octave * 12;
        if (expectedFret < 0 || expectedFret > fretCount) continue;

        const key = `${refNote.string}:${expectedFret}`;
        const existing = lookup.get(key) ?? [];
        if (existing.length < 2 && !existing.some(s => s.shape === pattern.shape)) {
          existing.push({ shape: pattern.shape, position: pattern.position });
          lookup.set(key, existing);
        }
      }
    }
  }

  return lookup;
}

export class CagedFeature extends GuitarFeature {
  static readonly typeName = "CAGED";
  static readonly displayName = "CAGED Scale Shapes";
  static readonly requiredInstruments = ["Guitar"] as const;
  static readonly description =
    "Displays notes for a selected scale (Major, Minor, Pentatonics) in a given key. Highlights notes based on the standard Major scale CAGED patterns using stroke colors.";

  readonly typeName = CagedFeature.typeName;
  private readonly keyIndex: number;
  private readonly rootNoteName: string;
  private readonly scaleType: string;
  private readonly scale: Scale;
  private readonly labelDisplay: LabelDisplayType;
  private readonly fillDisplay: FillDisplayType;
  private readonly headerText: string;
  private fretboardViewInstance: FretboardView;
  private fretCount: number;

  // Drone state
  private _droneActive = false;
  private _droneOsc: OscillatorNode | null = null;
  private _droneGain: GainNode | null = null;
  private _droneVolumeUnsubscribe: (() => void) | null = null;

  constructor(
    config: ReadonlyArray<string>,
    keyIndex: number,
    rootNoteName: string,
    scaleType: string,
    scale: Scale,
    labelDisplay: LabelDisplayType,
    fillDisplay: FillDisplayType,
    headerText: string,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings,
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    super(config, settings, intervalSettings, audioController, maxCanvasHeight);
    this.keyIndex = keyIndex;
    this.rootNoteName = rootNoteName;
    this.scaleType = scaleType;
    this.scale = scale;
    this.labelDisplay = labelDisplay;
    this.fillDisplay = fillDisplay;
    this.headerText = headerText;
    this.fretCount = 18;

    this.fretboardViewInstance = new FretboardView(
      this.fretboardConfig,
      this.fretCount
    );
    this._views.unshift(this.fretboardViewInstance);

    this.calculateAndSetCagedNotes();
  }

  static getConfigurationSchema(): ConfigurationSchema {
    const availableKeys = MUSIC_NOTES.flat();
    const availableScales = [
      "Major",
      "Minor",
      "Major Pentatonic",
      "Minor Pentatonic",
    ];
    const labelOptions: LabelDisplayType[] = ["Interval", "Note Name"];
    const fillOptions: FillDisplayType[] = ["Filled", "Note", "Empty"];
    const specificArgs: ConfigurationSchemaArg[] = [
      {
        name: "Root Note",
        type: "enum",
        required: true,
        enum: availableKeys,
        description: "Root note of the scale.",
      },
      {
        name: "Scale Type",
        type: "enum",
        required: true,
        enum: availableScales.sort(),
        description: "Select the scale to display.",
      },
      {
        name: "Label Display",
        type: "enum",
        required: true,
        enum: labelOptions,
        description: "Display intervals or note names on the dots.",
      },
      {
        name: "Fill Display",
        type: "enum",
        required: true,
        enum: fillOptions,
        description:
          "Filled: color circles by CAGED shape. Note: color by interval. Empty: grey circles with CAGED outline.",
      },
    ];
    return {
      description: `Config: ${this.typeName},Key,ScaleType,LabelDisplay,FillDisplay[,GuitarSettings]`,
      args: [...specificArgs, GuitarFeature.BASE_GUITAR_SETTINGS_CONFIG_ARG],
    };
  }

  static createFeature(
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings,
    intervalSettings: IntervalSettings,
    maxCanvasHeight: number | undefined,
    categoryName: string
  ): Feature {
    if (config.length < 3) {
      throw new Error(
        `[${this.typeName}] Invalid config. Expected [Key, ScaleType, LabelDisplay].`
      );
    }
    const rootNoteName = config[0];
    const scaleTypeName = config[1];
    const labelDisplay = config[2] as LabelDisplayType;
    // config[3] is FillDisplay; default to "Filled" for backward compatibility
    const rawFill = config[3] as FillDisplayType | undefined;
    const fillDisplay: FillDisplayType =
      rawFill === "Note" || rawFill === "Empty" ? rawFill : "Filled";

    const featureSpecificConfig = [rootNoteName, scaleTypeName, labelDisplay, fillDisplay];
    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1)
      throw new Error(`[${this.typeName}] Unknown key: "${rootNoteName}"`);
    const validRootName = MUSIC_NOTES[keyIndex]?.[0] ?? rootNoteName;

    let scaleKey = scale_names[scaleTypeName as keyof typeof scale_names];
    if (!scaleKey) {
      scaleKey = scaleTypeName.toUpperCase().replace(/ /g, "_");
    }
    const scale = scales[scaleKey as keyof typeof scales];
    if (!scale) {
      throw new Error(
        `[${this.typeName}] Unsupported or unknown scale type: "${scaleTypeName}" (mapped to key "${scaleKey}")`
      );
    }

    const validLabelDisplay =
      labelDisplay === "Note Name" || labelDisplay === "Interval"
        ? labelDisplay
        : "Interval";
    const headerText = `${validRootName} ${scale.name} (${this.displayName})`;
    const guitarIntervalSettings = intervalSettings as GuitarIntervalSettings;

    return new CagedFeature(
      featureSpecificConfig,
      keyIndex,
      validRootName,
      scaleTypeName,
      scale,
      validLabelDisplay,
      fillDisplay,
      headerText,
      settings,
      guitarIntervalSettings,
      audioController,
      maxCanvasHeight
    );
  }

  /** Calculates scale notes and their CAGED membership using reference patterns. */
  private calculateAndSetCagedNotes(): void {
    const notesData: NoteRenderData[] = [];
    const config = this.fretboardConfig;
    const tuning = config.tuning.tuning;
    const fretCount = this.fretCount;

    // For minor scales use the relative major key for CAGED lookup
    const isMinorScale = this.scaleType.toLowerCase().includes("minor");
    const relativeMajorKeyIndex = isMinorScale
      ? (this.keyIndex + 3) % 12
      : this.keyIndex;

    const tuningOffset = getCagedTuningOffset(config.tuning);
    const cagedLookup = buildCagedLookup(relativeMajorKeyIndex, fretCount, tuningOffset);

    for (let stringIndex = 0; stringIndex < tuning.length; stringIndex++) {
      const stringTuning = tuning[stringIndex];

      for (let fretIndex = 0; fretIndex <= fretCount; fretIndex++) {
        const noteOffsetFromA = (stringTuning + fretIndex) % 12;
        const noteRelativeToKey = (noteOffsetFromA - this.keyIndex + 12) % 12;

        if (!this.scale.degrees.includes(noteRelativeToKey)) continue;

        const noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
        const intervalLabel = getIntervalLabel(noteRelativeToKey);

        const lookupKey = `${stringIndex}:${fretIndex}`;
        const shapeMembership = cagedLookup.get(lookupKey) ?? [];

        // Sort overlap pairs consistently (5 < 1 < 2 < 3 < 4)
        const sorted =
          shapeMembership.length >= 2
            ? [...shapeMembership].sort((a, b) =>
                compareCagedPositions(a.position, b.position)
              )
            : shapeMembership;

        const cagedColor1 =
          sorted.length >= 1 ? (NOTE_COLORS[sorted[0].shape] ?? "#888888") : "#888888";
        const cagedColor2 =
          sorted.length >= 2 ? (NOTE_COLORS[sorted[1].shape] ?? "#888888") : null;

        let fillColor: string | string[];
        let strokeColor: string | string[];
        let strokeWidth: number;

        if (this.fillDisplay === "Filled") {
          // Fill circles with CAGED shape color(s); thin neutral outline
          if (sorted.length === 0) {
            fillColor = "#909090";
          } else if (sorted.length === 1) {
            fillColor = cagedColor1;
          } else {
            fillColor = [cagedColor1, cagedColor2!];
          }
          strokeColor = "rgba(40, 40, 40, 0.6)";
          strokeWidth = 1;

        } else if (this.fillDisplay === "Note") {
          // Fill by interval color; CAGED colors on the stroke (existing behavior)
          fillColor = getColorFromScheme("interval", noteName, intervalLabel);
          if (sorted.length === 0) {
            strokeColor = "rgba(50, 50, 50, 0.7)";
            strokeWidth = 1;
          } else if (sorted.length === 1) {
            strokeColor = cagedColor1;
            strokeWidth = 3;
          } else {
            strokeColor = [cagedColor1, cagedColor2!];
            strokeWidth = 3;
          }

        } else {
          // "Empty" — grey fill; CAGED colors on the stroke
          fillColor = "#a0a0a0";
          if (sorted.length === 0) {
            strokeColor = "rgba(50, 50, 50, 0.7)";
            strokeWidth = 1;
          } else if (sorted.length === 1) {
            strokeColor = cagedColor1;
            strokeWidth = 3;
          } else {
            strokeColor = [cagedColor1, cagedColor2!];
            strokeWidth = 3;
          }
        }

        const displayLabel =
          this.labelDisplay === "Interval" ? intervalLabel : noteName;

        notesData.push({
          fret: fretIndex,
          stringIndex,
          noteName,
          intervalLabel,
          displayLabel,
          fillColor,
          strokeColor,
          strokeWidth,
          radiusOverride:
            fretIndex === 0
              ? config.noteRadiusPx * OPEN_NOTE_RADIUS_FACTOR
              : undefined,
        });
      }
    }

    requestAnimationFrame(() => {
      if (this.fretboardViewInstance) {
        this.fretboardViewInstance.setNotes(notesData);
        this.fretboardViewInstance.setLines([]);
      }
    });
  }

  render(container: HTMLElement): void {
    clearAllChildren(container);
    const titleRow = document.createElement('div');
    titleRow.classList.add('feature-title-row');
    const header = addHeader(titleRow, this.headerText);
    header.classList.add('feature-main-title');
    titleRow.appendChild(this.buildDroneButton());
    container.appendChild(titleRow);
  }

  private buildDroneButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.classList.add('drone-icon-btn');
    btn.title = 'Toggle root-note drone';
    const icon = document.createElement('span');
    icon.classList.add('material-icons');
    icon.textContent = 'graphic_eq';
    btn.appendChild(icon);
    if (this._droneActive) btn.classList.add('is-active');
    btn.addEventListener('click', () => {
      this._droneActive = !this._droneActive;
      btn.classList.toggle('is-active', this._droneActive);
      if (this._droneActive) this.startDrone();
      else this.stopDrone();
    });
    return btn;
  }

  destroy(): void {
    this.stopDrone();
  }

  /** freq = 440 * 2^((keyIndex + 12*(octave-4)) / 12), MUSIC_NOTES A-indexed */
  private getRootFrequency(): number {
    return 440 * Math.pow(2, (this.keyIndex + 12 * (3 - 4)) / 12);
  }

  private startDrone(): void {
    this.stopDrone();
    try {
      const ctx = volumeManager.getAudioContext();
      const now = ctx.currentTime;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = this.getRootFrequency();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const vol = 0.15 * volumeManager.getVolume();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.3);
      osc.start(now);
      this._droneOsc  = osc;
      this._droneGain = gain;
      this._droneVolumeUnsubscribe = volumeManager.onChange(v => {
        if (this._droneGain) {
          this._droneGain.gain.setTargetAtTime(0.15 * v, ctx.currentTime, 0.05);
        }
      });
    } catch (e) {
      console.warn('CagedFeature: could not start drone', e);
    }
  }

  private stopDrone(): void {
    if (this._droneVolumeUnsubscribe) {
      this._droneVolumeUnsubscribe();
      this._droneVolumeUnsubscribe = null;
    }
    if (this._droneOsc && this._droneGain) {
      try {
        const ctx = volumeManager.getAudioContext();
        const now = ctx.currentTime;
        this._droneGain.gain.cancelScheduledValues(now);
        this._droneGain.gain.setValueAtTime(this._droneGain.gain.value, now);
        this._droneGain.gain.linearRampToValueAtTime(0, now + 0.3);
        this._droneOsc.stop(now + 0.35);
      } catch (_) { /* ignore */ }
      this._droneOsc  = null;
      this._droneGain = null;
    }
  }
}

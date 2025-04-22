// ts/guitar/features/caged_feature.ts

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
import { NoteRenderData, FretboardConfig } from "../fretboard"; // NoteIcon removed as it's not used here now
import {
  getKeyIndex,
  MUSIC_NOTES,
  getIntervalLabel,
  OPEN_NOTE_RADIUS_FACTOR,
  addHeader,
  clearAllChildren,
} from "../guitar_utils";
import { FretboardView } from "../views/fretboard_view";
import { getColor as getColorFromScheme } from "../colors";

// --- CAGED Definitions ---

const CAGED_COLORS = {
  C: "#90EE90", A: "#FF6B6B", G: "#E67E22", E: "#9B59B6", D: "#4ECDC4", Default: "#333333",
};
type CagedShapeName = keyof typeof CAGED_COLORS;
type LabelDisplayType = "Note Name" | "Interval";

// --- Reference CAGED Pattern Structure ---
// Defines the absolute string/fret coordinates for the A Major scale (baseKeyOffset=0) within each CAGED shape pattern.
interface CagedReferenceNote {
    string: number; // 0-5 (0=Low E)
    fret: number;   // Absolute fret number for the reference key (A Major)
}
interface CagedReferencePattern {
    shape: CagedShapeName;
    notes: CagedReferenceNote[];
    baseKeyOffset: number; // Semitones from A (0 for A)
}

// --- Reference CAGED Pattern Data (Key of A Major, baseKeyOffset = 0) ---
// NOTE: This data MUST be accurately populated for the A Major scale notes
// within the bounds of each visual CAGED shape across the fretboard.
// Example partial data:
const CAGED_REFERENCE_PATTERNS: CagedReferencePattern[] = [
    // A-Shape (Position 4)
    { shape: 'A', baseKeyOffset: 0, notes: [
      { string: 0, fret: 10 }, { string: 0, fret: 12 }, { string: 0, fret: 14 }, // Low E root and 2nd
      { string: 1, fret: 11 }, { string: 1, fret: 12 }, { string: 1, fret: 14 }, // A string
      { string: 2, fret: 11 }, { string: 2, fret: 12 }, { string: 2, fret: 14 }, // D string
      { string: 3, fret: 11 }, { string: 3, fret: 13 }, { string: 3, fret: 14 }, // G string
      { string: 4, fret: 12 }, { string: 4, fret: 14 }, { string: 4, fret: 15 }, // B string
      { string: 5, fret: 12 }, { string: 5, fret: 14 }, // High E string
    ]},
    // G-Shape (Position 5)
    { shape: 'G', baseKeyOffset: 0, notes: [
        { string: 0, fret: 2 }, { string: 0, fret: 4 }, { string: 0, fret: 5 }, // Low E root and 2nd
        { string: 1, fret: 2 }, { string: 1, fret: 4 }, { string: 1, fret: 5 }, // A string
        { string: 2, fret: 2 }, { string: 2, fret: 4 }, // D string
        { string: 3, fret: 1 }, { string: 3, fret: 2 }, { string: 3, fret: 4 }, // G string
        { string: 4, fret: 2 }, { string: 4, fret: 3 }, { string: 4, fret: 5 }, // B string
        { string: 5, fret: 2 }, { string: 5, fret: 4 }, { string: 5, fret: 5 }, // High E string
    ]},
     // E-Shape (Position 1)
    { shape: 'E', baseKeyOffset: 0, notes: [
        { string: 0, fret: 4 }, { string: 0, fret: 5 }, { string: 0, fret: 7 }, // Low E
        { string: 1, fret: 4 }, { string: 1, fret: 5 }, { string: 1, fret: 7 }, // A string
        { string: 2, fret: 4 }, { string: 2, fret: 6 }, { string: 2, fret: 7 }, // D string
        { string: 3, fret: 4 }, { string: 3, fret: 6 }, { string: 3, fret: 7 }, // G string
        { string: 4, fret: 5 }, { string: 4, fret: 7 }, // B string
        { string: 5, fret: 4 }, { string: 5, fret: 5 }, { string: 5, fret: 7 },// High E string
    ]},
    // D-Shape (Position 2)
     { shape: 'D', baseKeyOffset: 0, notes: [
      { string: 0, fret: 7 }, { string: 0, fret: 9 }, { string: 0, fret: 10 }, // Low E
      { string: 1, fret: 7 }, { string: 1, fret: 9 }, // A string
      { string: 2, fret: 6 }, { string: 2, fret: 7 }, { string: 2, fret: 9 }, // D string
      { string: 3, fret: 6 }, { string: 3, fret: 7 }, { string: 3, fret: 9 }, // G string
      { string: 4, fret: 7 }, { string: 4, fret: 9 }, { string: 4, fret: 10 }, // B string
      { string: 5, fret: 7 }, { string: 5, fret: 9 }, { string: 5, fret: 10 },// High E string
    ]},
    // C-Shape (Position 3)
    { shape: 'C', baseKeyOffset: 0, notes: [
      { string: 0, fret: 9 }, { string: 0, fret: 10 }, { string: 0, fret: 12 }, // Low E
      { string: 1, fret: 9 }, { string: 1, fret: 11 }, { string: 1, fret: 12 }, // A string
      { string: 2, fret: 9 }, { string: 2, fret: 11 }, { string: 2, fret: 12 }, // D string
      { string: 3, fret: 9 }, { string: 3, fret: 11 }, // G string
      { string: 4, fret: 9 }, { string: 4, fret: 10 }, { string: 4, fret: 12 }, // B string
      { string: 5, fret: 9 }, { string: 5, fret: 10 }, { string: 5, fret: 12 },// High E string
    ]},
];
// --- End CAGED Definitions ---


export class CagedFeature extends GuitarFeature {
  static readonly typeName = "CAGED";
  static readonly displayName = "CAGED Scale Shapes";
  static readonly description =
    "Displays notes for a selected scale (Major, Minor, Pentatonics) in a given key. Highlights notes based on the standard Major scale CAGED patterns using stroke colors.";

  readonly typeName = CagedFeature.typeName;
  private readonly keyIndex: number;
  private readonly rootNoteName: string;
  private readonly scaleType: string;
  private readonly scale: Scale;
  private readonly labelDisplay: LabelDisplayType;
  private readonly headerText: string;
  private fretboardViewInstance: FretboardView;
  private fretCount: number;

  constructor(
    config: ReadonlyArray<string>,
    keyIndex: number,
    rootNoteName: string,
    scaleType: string,
    scale: Scale,
    labelDisplay: LabelDisplayType,
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
    this.headerText = headerText;
    this.fretCount = 18;

    this.fretboardViewInstance = new FretboardView( this.fretboardConfig, this.fretCount );
    this._views.unshift(this.fretboardViewInstance); // Add FretboardView first

    this.calculateAndSetCagedNotes();
  }

  // --- Static Methods (getConfigurationSchema, createFeature remain same as previous version) ---
  static getConfigurationSchema(): ConfigurationSchema {
    const availableKeys = MUSIC_NOTES.flat();
    const availableScales = [ "Major", "Minor", "Major Pentatonic", "Minor Pentatonic", "Major Blues", "Minor Blues", ];
    const labelOptions: LabelDisplayType[] = ["Interval", "Note Name"];
    const specificArgs: ConfigurationSchemaArg[] = [
      { name: "Key", type: "enum", required: true, enum: availableKeys, description: "Root note of the scale.", },
      { name: "Scale Type", type: "enum", required: true, enum: availableScales.sort(), description: "Select the scale to display.", },
      { name: "Label Display", type: "enum", required: true, enum: labelOptions, description: "Display intervals or note names on the dots.", },
    ];
    return { description: `Config: ${this.typeName},Key,ScaleType,LabelDisplay[,GuitarSettings]`, args: [...specificArgs, GuitarFeature.BASE_GUITAR_SETTINGS_CONFIG_ARG], };
  }
  static createFeature( config: ReadonlyArray<string>, audioController: AudioController, settings: AppSettings, intervalSettings: IntervalSettings, maxCanvasHeight: number | undefined, categoryName: string ): Feature {
    if (config.length < 3) { throw new Error(`[${this.typeName}] Invalid config. Expected [Key, ScaleType, LabelDisplay].`); }
    const rootNoteName = config[0];
    const scaleTypeName = config[1];
    const labelDisplay = config[2] as LabelDisplayType;
    const featureSpecificConfig = [rootNoteName, scaleTypeName, labelDisplay];
    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1) throw new Error(`[${this.typeName}] Unknown key: "${rootNoteName}"`);
    const validRootName = MUSIC_NOTES[keyIndex]?.[0] ?? rootNoteName;
    let scaleKey = scale_names[scaleTypeName as keyof typeof scale_names];
    if (!scaleKey) { scaleKey = scaleTypeName.toUpperCase().replace(/ /g, "_"); }
    const scale = scales[scaleKey as keyof typeof scales];
    if (!scale) { throw new Error(`[${this.typeName}] Unsupported or unknown scale type: "${scaleTypeName}"`); }
    const validLabelDisplay = (labelDisplay === "Note Name" || labelDisplay === "Interval") ? labelDisplay : "Interval";
    const headerText = `${validRootName} ${scale.name} (${this.displayName})`;
    const guitarIntervalSettings = intervalSettings as GuitarIntervalSettings;
    return new CagedFeature( featureSpecificConfig, keyIndex, validRootName, scaleTypeName, scale, validLabelDisplay, headerText, settings, guitarIntervalSettings, audioController, maxCanvasHeight );
  }

  /** Calculates scale notes and their CAGED membership using the new logic. */
  private calculateAndSetCagedNotes(): void {
    const notesData: NoteRenderData[] = [];
    const config = this.fretboardConfig;
    const tuning = config.tuning.tuning;

    // --- Pre-calculate expected fret positions for CAGED patterns in the target key ---
    const expectedFretLookup = new Map<string, CagedShapeName[]>(); // Key: "string:fret", Value: Shape names
    const slideOffset = (this.keyIndex - 0 + 12) % 12; // Offset from reference key A (index 0)

    CAGED_REFERENCE_PATTERNS.forEach(pattern => {
        // Assume baseKeyOffset is 0 for A Major reference patterns
        // const patternSlideOffset = (this.keyIndex - pattern.baseKeyOffset + 12) % 12; // More general if reference !== A
        pattern.notes.forEach(refNote => {
            const expectedFret = refNote.fret + slideOffset;
            // Optionally add check: if (expectedFret < 0 || expectedFret > this.fretCount) return;
            const lookupKey = `${refNote.string}:${expectedFret}`;
            const shapes = expectedFretLookup.get(lookupKey) || [];
            if (!shapes.includes(pattern.shape)) {
                shapes.push(pattern.shape);
            }
            // Limit to max 2 shapes for stroke splitting
            if (shapes.length <= 2) {
                expectedFretLookup.set(lookupKey, shapes);
            }
        });
    });
    // --- End pre-calculation ---


    // Iterate through fretboard to find notes in the SELECTED scale/key
    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      if (stringIndex >= tuning.length) continue;
      const stringTuning = tuning[stringIndex];
      for (let fretIndex = 0; fretIndex <= this.fretCount; fretIndex++) {
        const noteOffsetFromA = (stringTuning + fretIndex) % 12;
        const noteRelativeToKey = (noteOffsetFromA - this.keyIndex + 12) % 12;

        // Check if the note is part of the *selected* scale
        if (this.scale.degrees.includes(noteRelativeToKey)) {
          const noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
          const intervalLabel = getIntervalLabel(noteRelativeToKey);

          // Determine CAGED membership by looking up this note's position
          const lookupKey = `${stringIndex}:${fretIndex}`;
          const shapeMembership = expectedFretLookup.get(lookupKey) || [];

          // Determine stroke color based on CAGED membership
          let strokeColor: string | string[] = CAGED_COLORS.Default;
          if (shapeMembership.length === 1) {
            strokeColor = CAGED_COLORS[shapeMembership[0]] ?? CAGED_COLORS.Default;
          } else if (shapeMembership.length >= 2) {
            strokeColor = [
              CAGED_COLORS[shapeMembership[0]] ?? CAGED_COLORS.Default,
              CAGED_COLORS[shapeMembership[1]] ?? CAGED_COLORS.Default,
            ];
          }

          const fillColor = getColorFromScheme("interval", noteName, intervalLabel);
          const displayLabel = this.labelDisplay === "Interval" ? intervalLabel : noteName;

          notesData.push({
            fret: fretIndex,
            stringIndex: stringIndex,
            noteName: noteName,
            intervalLabel: intervalLabel,
            displayLabel: displayLabel,
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWidth: shapeMembership.length > 0 ? 2.5 : 1,
            radiusOverride: fretIndex === 0 ? config.noteRadiusPx * OPEN_NOTE_RADIUS_FACTOR : undefined,
          });
        }
      }
    }

    // Update the view
    requestAnimationFrame(() => {
      if (this.fretboardViewInstance) {
        this.fretboardViewInstance.setNotes(notesData);
        this.fretboardViewInstance.setLines([]);
      }
    });
  }

  // Removed the old findCagedShapesForNote method

  render(container: HTMLElement): void {
    clearAllChildren(container);
    addHeader(container, this.headerText);
    const info = document.createElement('p');
    info.classList.add('is-size-7', 'has-text-grey', 'has-text-centered', 'mb-2');
    // Keep the note about highlighting limitation
    info.textContent = '(Note highlighting shows Major scale CAGED patterns)';
    container.appendChild(info);
  }
}
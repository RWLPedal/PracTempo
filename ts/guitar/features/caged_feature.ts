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
import { NoteRenderData, FretboardConfig } from "../fretboard";
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

// --- CAGED Definitions ---
type CagedShapeName = "C" | "A" | "G" | "E" | "D";
type LabelDisplayType = "Note Name" | "Interval";

// --- Reference CAGED Pattern Structure ---
interface CagedReferenceNote {
  string: number; // 0-5 (0=Low E)
  fret: number; // Absolute fret number for the reference key (A Major)
}
interface CagedReferencePattern {
  shape: CagedShapeName;
  position: number; // Position number (1-5)
  notes: CagedReferenceNote[];
  // baseKeyOffset removed
}

// Helper function to compare CAGED positions (5 < 1 < 2 < 3 < 4)
function compareCagedPositions(a: number, b: number): number {
  if (a === 5 && b === 1) return -1; // 5 always comes first unless compared with itself
  if (b === 5 && a === 1) return 1; // 5 always comes first unless compared with itself
  return a - b; // Normal sort order for 1, 2, 3, 4
}

// --- Reference CAGED Pattern Data (Key of A Major) ---
// NOTE: This data MUST be accurately populated for the A Major scale notes
// within the bounds of each visual CAGED shape across the fretboard.
const CAGED_REFERENCE_PATTERNS: CagedReferencePattern[] = [
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

export class CagedFeature extends GuitarFeature {
  static readonly typeName = "CAGED";
  static readonly displayName = "CAGED Scale Shapes";
  static readonly description =
    "Displays notes for a selected scale (Major, Minor, Pentatonics) in a given key. Highlights notes based on the standard Major scale CAGED patterns using stroke colors.";

  readonly typeName = CagedFeature.typeName;
  private readonly keyIndex: number;
  private readonly rootNoteName: string;
  private readonly scaleType: string; // Keep the original user selection string
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

    this.fretboardViewInstance = new FretboardView(
      this.fretboardConfig,
      this.fretCount
    );
    this._views.unshift(this.fretboardViewInstance); // Add FretboardView first

    this.calculateAndSetCagedNotes();
  }

  // Static methods (getConfigurationSchema, createFeature) remain the same
  static getConfigurationSchema(): ConfigurationSchema {
    const availableKeys = MUSIC_NOTES.flat();
    const availableScales = [
      "Major",
      "Minor",
      "Major Pentatonic",
      "Minor Pentatonic",
    ];
    const labelOptions: LabelDisplayType[] = ["Interval", "Note Name"];
    const specificArgs: ConfigurationSchemaArg[] = [
      {
        name: "Key",
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
    ];
    return {
      description: `Config: ${this.typeName},Key,ScaleType,LabelDisplay[,GuitarSettings]`,
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
    const scaleTypeName = config[1]; // Keep original name for header/minor check
    const labelDisplay = config[2] as LabelDisplayType;
    const featureSpecificConfig = [rootNoteName, scaleTypeName, labelDisplay];
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
      scaleTypeName, // Pass original user-selected name
      scale,
      validLabelDisplay,
      headerText,
      settings,
      guitarIntervalSettings,
      audioController,
      maxCanvasHeight
    );
  }

  /** Calculates scale notes and their CAGED membership using reference patterns. */
  /** Calculates scale notes and their CAGED membership using reference patterns. */
  private calculateAndSetCagedNotes(): void {
    const notesData: NoteRenderData[] = [];
    const config = this.fretboardConfig;
    const tuning = config.tuning.tuning;
    const fretCount = this.fretCount;

    // Determine if the selected scale is minor to find the relative major
    // Use the selected scaleType string for robust checking
    const isMinorScale = this.scaleType.toLowerCase().includes("minor");
    const relativeMajorKeyIndex = isMinorScale ? (this.keyIndex + 3) % 12 : this.keyIndex;

    // Pre-calculate expected fret positions based on the RELATIVE MAJOR key
    // Map key: "string:fret", Value: Array of { shape: CagedShapeName; position: number }
    const expectedFretLookup = new Map<string, { shape: CagedShapeName; position: number }[]>();
    const referenceKeyIndex = 0; // Reference key is A
    // Calculate slide offset from reference A to the relative major key
    const slideOffset = (relativeMajorKeyIndex - referenceKeyIndex + 12) % 12;

    CAGED_REFERENCE_PATTERNS.forEach(pattern => {
        pattern.notes.forEach(refNote => {
            // Calculate all expected frets for this reference note in the target relative major key
            for (let octave = -2; octave <= 2; octave++) {
                const expectedFret = refNote.fret + slideOffset + (octave * 12);
                if (expectedFret >= 0 && expectedFret <= fretCount) {
                    const lookupKey = `${refNote.string}:${expectedFret}`;
                    const shapes = expectedFretLookup.get(lookupKey) || [];
                    const newShapeInfo = { shape: pattern.shape, position: pattern.position };
                    if (!shapes.some(s => s.shape === newShapeInfo.shape)) {
                        shapes.push(newShapeInfo);
                        if (shapes.length <= 2) { // Only keep up to 2 shapes
                            expectedFretLookup.set(lookupKey, shapes);
                        }
                    }
                }
            }
        });
    });

    // Iterate through fretboard to find notes in the SELECTED scale (major or minor)
    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      if (stringIndex >= tuning.length) continue;
      const stringTuning = tuning[stringIndex];

      for (let fretIndex = 0; fretIndex <= fretCount; fretIndex++) {
        const noteOffsetFromA = (stringTuning + fretIndex) % 12;
        // Calculate note relative to the SELECTED key (this.keyIndex)
        const noteRelativeToKey = (noteOffsetFromA - this.keyIndex + 12) % 12;

        // Check if the note is part of the *selected* scale (this.scale)
        if (this.scale.degrees.includes(noteRelativeToKey)) {
          const noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
          const intervalLabel = getIntervalLabel(noteRelativeToKey);

          // Determine CAGED membership by looking up this note's position
          // in the lookup map (which is based on the relative major key)
          const lookupKey = `${stringIndex}:${fretIndex}`;
          const shapeMembershipInfo = expectedFretLookup.get(lookupKey) || []; // Array of {shape, position}

          // Determine stroke color based on CAGED membership using NOTE_COLORS
          let strokeColor: string | string[] = "rgba(50, 50, 50, 0.7)"; // Default subtle stroke
          if (shapeMembershipInfo.length === 1) {
            const shapeName = shapeMembershipInfo[0].shape;
            strokeColor = NOTE_COLORS[shapeName] ?? strokeColor;
          } else if (shapeMembershipInfo.length >= 2) {
            // Sort the shapes based on position (5 < 1 < 2 < 3 < 4)
            const sortedShapes = shapeMembershipInfo.sort((a, b) => compareCagedPositions(a.position, b.position));
            strokeColor = [
              NOTE_COLORS[sortedShapes[0].shape] ?? "grey",
              NOTE_COLORS[sortedShapes[1].shape] ?? "grey",
            ];
          }

          // Determine fill color (based on interval relative to the selected key)
          const fillColor = getColorFromScheme("interval", noteName, intervalLabel);
          // Determine display label
          const displayLabel = this.labelDisplay === "Interval" ? intervalLabel : noteName;
          // Determine stroke width
          const strokeWidth = shapeMembershipInfo.length > 0 ? 3 : 1;

          notesData.push({
            fret: fretIndex,
            stringIndex: stringIndex,
            noteName: noteName,
            intervalLabel: intervalLabel,
            displayLabel: displayLabel,
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWidth: strokeWidth,
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

  render(container: HTMLElement): void {
    clearAllChildren(container);
    addHeader(container, this.headerText);
  }
}
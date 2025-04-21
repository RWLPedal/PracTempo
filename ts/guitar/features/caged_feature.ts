// ts/guitar/features/caged_feature.ts

import {
  Feature,
  // FeatureCategoryName removed
  ConfigurationSchema,
  ConfigurationSchemaArg,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { scales } from "../scales";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
// Import generic and specific interval settings types
import { IntervalSettings } from "../../schedule/editor/interval/types";
import { GuitarIntervalSettings } from "../guitar_interval_settings";
import { NoteIcon, NoteRenderData, FretboardConfig } from "../fretboard";
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
  C: "#E74C3C",
  A: "#3498DB",
  G: "#2ECC71",
  E: "#F1C40F",
  D: "#9B59B6",
  Default: "#333333",
};
type CagedShapeName = keyof typeof CAGED_COLORS;

interface CagedNoteDefinition {
  string: number;
  fretOffset: number;
  interval: number;
}
interface CagedShapePattern {
  shape: CagedShapeName;
  rootAnchor: { string: number; fretOffset: 0 };
  notes: CagedNoteDefinition[];
}

// --- Placeholder CAGED_SHAPES_DATA (Needs accurate data) ---
const CAGED_SHAPES_DATA: CagedShapePattern[] = [
  {
    shape: "C",
    rootAnchor: { string: 1, fretOffset: 0 },
    notes: [
      { string: 1, fretOffset: 0, interval: 0 },
      { string: 2, fretOffset: 0, interval: 4 },
      { string: 4, fretOffset: 0, interval: 0 } /*...*/,
    ],
  },
  {
    shape: "A",
    rootAnchor: { string: 0, fretOffset: 0 },
    notes: [
      { string: 0, fretOffset: 0, interval: 0 },
      { string: 1, fretOffset: 0, interval: 4 },
      { string: 2, fretOffset: 1, interval: 7 } /*...*/,
    ],
  },
  {
    shape: "G",
    rootAnchor: { string: 0, fretOffset: 0 },
    notes: [
      { string: 0, fretOffset: 0, interval: 0 },
      { string: 1, fretOffset: 2, interval: 5 },
      { string: 3, fretOffset: -1, interval: 0 } /*...*/,
    ],
  },
  {
    shape: "E",
    rootAnchor: { string: 0, fretOffset: 0 },
    notes: [
      { string: 0, fretOffset: 0, interval: 0 },
      { string: 1, fretOffset: 2, interval: 5 },
      { string: 3, fretOffset: 1, interval: 0 } /*...*/,
    ],
  },
  {
    shape: "D",
    rootAnchor: { string: 2, fretOffset: 0 },
    notes: [
      { string: 2, fretOffset: 0, interval: 0 },
      { string: 3, fretOffset: 0, interval: 4 },
      { string: 4, fretOffset: 2, interval: 0 } /*...*/,
    ],
  },
];
// --- End CAGED Definitions ---

/** Displays Major scale notes highlighting CAGED positions with stroke colors. */
export class CagedFeature extends GuitarFeature {
  // Static properties (category removed, others unchanged)
  // static readonly category = FeatureCategoryName.Guitar; // Removed
  static readonly typeName = "CAGED";
  static readonly displayName = "CAGED Shapes";
  static readonly description =
    "Displays Major scale notes on the fretboard, coloring the note *stroke* based on the CAGED position(s) it belongs to.";

  readonly typeName = CagedFeature.typeName;
  private readonly keyIndex: number;
  private readonly rootNoteName: string;
  private readonly headerText: string;
  private fretboardViewInstance: FretboardView;
  private fretCount: number;

  constructor(
    config: ReadonlyArray<string>, // Specific args: [Key]
    keyIndex: number,
    rootNoteName: string,
    headerText: string,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings, // Constructor still expects specific type
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    super(config, settings, intervalSettings, audioController, maxCanvasHeight); // Pass specific type
    this.keyIndex = keyIndex;
    this.rootNoteName = rootNoteName;
    this.headerText = headerText;
    this.fretCount = 18;

    this.fretboardViewInstance = new FretboardView(
      this.fretboardConfig,
      this.fretCount
    );
    this._views.push(this.fretboardViewInstance);

    this.calculateAndSetCagedNotes();
  }

  // --- Static Methods ---
  static getConfigurationSchema(): ConfigurationSchema {
    // Unchanged
    const availableKeys = MUSIC_NOTES.flat();
    const specificArgs: ConfigurationSchemaArg[] = [
      {
        name: "Key",
        type: "enum",
        required: true,
        enum: availableKeys,
        description: "Root note of the Major scale for CAGED shapes.",
      },
    ];
    return {
      description: `Config: ${this.typeName},Key[,GuitarSettings]`,
      args: [...specificArgs, GuitarFeature.BASE_GUITAR_SETTINGS_CONFIG_ARG],
    };
  }

  // **** UPDATED createFeature Signature ****
  static createFeature(
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings,
    intervalSettings: IntervalSettings, // <<< CHANGED: Accept generic base type
    maxCanvasHeight: number | undefined,
    categoryName: string // <<< ADDED: Accept category name string
  ): Feature {
    if (config.length < 1) {
      throw new Error(`Invalid config for ${this.typeName}. Expected [Key].`);
    }
    const rootNoteName = config[0];
    const featureSpecificConfig = [rootNoteName]; // Only the key is specific

    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1)
      throw new Error(`[${this.typeName}] Unknown key: "${rootNoteName}"`);
    const validRootName = MUSIC_NOTES[keyIndex]?.[0] ?? rootNoteName;
    const headerText = `CAGED Shapes - Key of ${validRootName}`;

    // --- Type Assertion for Constructor ---
    const guitarIntervalSettings = intervalSettings as GuitarIntervalSettings;
    // --- End Type Assertion ---

    return new CagedFeature(
      featureSpecificConfig,
      keyIndex,
      validRootName,
      headerText,
      settings,
      guitarIntervalSettings, // Pass asserted specific type
      audioController,
      maxCanvasHeight
    );
  }

  /** Calculates scale notes and their CAGED membership, passes them to FretboardView. */
  private calculateAndSetCagedNotes(): void {
    // Unchanged
    // ... (Implementation from previous response) ...
    const notesData: NoteRenderData[] = [];
    const majorScale = scales["MAJOR"];
    if (!majorScale) return;
    const config = this.fretboardConfig;
    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      if (stringIndex >= config.tuning.tuning.length) continue;
      const stringTuning = config.tuning.tuning[stringIndex];
      for (let fretIndex = 0; fretIndex <= this.fretCount; fretIndex++) {
        const noteOffsetFromA = (stringTuning + fretIndex) % 12;
        const noteRelativeToKey = (noteOffsetFromA - this.keyIndex + 12) % 12;
        if (majorScale.degrees.includes(noteRelativeToKey)) {
          const noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
          const intervalLabel = getIntervalLabel(noteRelativeToKey);
          const shapeMembership: CagedShapeName[] = this.findCagedShapesForNote(
            stringIndex,
            fretIndex
          );
          let strokeColor: string | string[] = CAGED_COLORS.Default;
          if (shapeMembership.length === 1)
            strokeColor =
              CAGED_COLORS[shapeMembership[0]] || CAGED_COLORS.Default;
          else if (shapeMembership.length >= 2)
            strokeColor = [
              CAGED_COLORS[shapeMembership[0]] || CAGED_COLORS.Default,
              CAGED_COLORS[shapeMembership[1]] || CAGED_COLORS.Default,
            ];
          const fillColor = getColorFromScheme(
            config.colorScheme,
            noteName,
            intervalLabel
          );
          notesData.push({
            fret: fretIndex,
            stringIndex: stringIndex,
            noteName: noteName,
            intervalLabel: intervalLabel,
            displayLabel: intervalLabel,
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWidth: 2.5,
            radiusOverride:
              fretIndex === 0
                ? config.noteRadiusPx * OPEN_NOTE_RADIUS_FACTOR
                : undefined,
          });
        }
      }
    }
    requestAnimationFrame(() => {
      if (this.fretboardViewInstance) {
        this.fretboardViewInstance.setNotes(notesData);
        this.fretboardViewInstance.setLines([]);
      }
    });
  }

  /** Finds which CAGED shape(s) a specific note instance belongs to. */
  private findCagedShapesForNote(
    targetStringIndex: number,
    targetFretIndex: number
  ): CagedShapeName[] {
    // Unchanged
    // ... (Implementation from previous response) ...
    const matchingShapes: CagedShapeName[] = [];
    const keyRootIndex = this.keyIndex;
    const tuning = this.fretboardConfig.tuning.tuning;
    for (const shapePattern of CAGED_SHAPES_DATA) {
      const anchorStringIndex = shapePattern.rootAnchor.string;
      const anchorStringTuning = tuning[anchorStringIndex];
      for (let anchorFret = 0; anchorFret <= this.fretCount; anchorFret++) {
        const noteAtAnchor = (anchorStringTuning + anchorFret) % 12;
        if (noteAtAnchor === keyRootIndex) {
          const targetNoteDefinition = shapePattern.notes.find(
            (noteDef) => noteDef.string === targetStringIndex
          );
          if (targetNoteDefinition) {
            const expectedFret = anchorFret + targetNoteDefinition.fretOffset;
            if (expectedFret === targetFretIndex) {
              const targetNoteAbsolute =
                (tuning[targetStringIndex] + targetFretIndex) % 12;
              const targetNoteInterval =
                (targetNoteAbsolute - keyRootIndex + 12) % 12;
              if (targetNoteInterval === targetNoteDefinition.interval) {
                if (!matchingShapes.includes(shapePattern.shape))
                  matchingShapes.push(shapePattern.shape);
                if (matchingShapes.length >= 2) return matchingShapes;
              }
            }
          }
        }
      }
      if (matchingShapes.length >= 2) break;
    }
    return matchingShapes;
  }

  render(container: HTMLElement): void {
    // Unchanged
    clearAllChildren(container);
    addHeader(container, this.headerText);
  }
}

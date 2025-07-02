import {
  Feature,
  ConfigurationSchema,
  ConfigurationSchemaArg,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Scale, scale_names, scales } from "../scales";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
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
} from "../guitar_utils"; // getNotesInScale removed
import { FretboardView } from "../views/fretboard_view";
import { getColor as getColorFromScheme, NOTE_COLORS } from "../colors";

// Color for non-highlighted scale notes when highlighting is active
const NON_HIGHLIGHTED_SCALE_COLOR = "#CCCCCC"; // Lighter grey for contrast
const OUT_OF_SCALE_HIGHLIGHT_STROKE = "#E74C3C"; // Red for out-of-scale highlights
const IN_SCALE_HIGHLIGHT_STROKE = "#333333"; // Dark grey/black for in-scale highlights
const DEFAULT_STROKE = "rgba(50, 50, 50, 0.7)"; // Subtle stroke for default interval view

/** Displays scale diagrams on the fretboard using FretboardView. */
export class ScaleFeature extends GuitarFeature {
  static readonly typeName = "Scale";
  static readonly displayName = "Scale Diagram";
  static readonly description =
    "Displays a specified scale on the fretboard in a given key. Optionally highlight specific notes (highlighted notes outside the scale get a red border).";

  readonly typeName = ScaleFeature.typeName;
  private readonly scale: Scale;
  private readonly keyIndex: number;
  private readonly rootNoteName: string;
  private readonly highlightNotes: Set<string>; // Store notes to highlight
  private readonly headerText: string;
  private fretboardViewInstance: FretboardView;
  private fretCount: number;

  constructor(
    config: ReadonlyArray<string>, // [ScaleName, RootNote, ...HighlightNotes]
    scale: Scale,
    keyIndex: number,
    rootNoteName: string,
    highlightNotes: Set<string>,
    headerText: string,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings,
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    super(config, settings, intervalSettings, audioController, maxCanvasHeight);
    this.scale = scale;
    this.keyIndex = keyIndex;
    this.rootNoteName = rootNoteName;
    this.highlightNotes = highlightNotes;
    this.headerText = headerText;
    this.fretCount = 18;

    this.fretboardViewInstance = new FretboardView(
      this.fretboardConfig,
      this.fretCount
    );
    this._views.unshift(this.fretboardViewInstance);

    this.calculateAndSetScaleNotes();
  }

  // --- Static Methods ---
  static getConfigurationSchema(): ConfigurationSchema {
    const availableScaleNames = [
      ...new Set([...Object.keys(scales), ...Object.keys(scale_names)]),
    ].sort();
    const availableKeys = MUSIC_NOTES.flat();
    // Static list of all notes for the toggle buttons
    const allNoteNames = MUSIC_NOTES.map((n) => n[0]); // Use primary sharp names

    const specificArgs: ConfigurationSchemaArg[] = [
      {
        name: "ScaleName",
        type: "enum",
        required: true,
        enum: availableScaleNames,
        description: "Name of the scale.",
      },
      {
        name: "Root Note",
        type: "enum",
        required: true,
        enum: availableKeys,
        description: "Root note of the scale.",
      },
      {
        name: "Highlight Notes",
        type: "enum", // Use enum type
        required: false,
        enum: allNoteNames, // Use the static list of all notes
        uiComponentType: "toggle_button_selector",
        isVariadic: true,
        uiComponentData: { buttonLabels: allNoteNames }, // Provide static labels
        description:
          "Select notes to highlight. Notes outside the scale get a red border. If none selected, colors based on interval.",
      },
    ];
    return {
      description: `Config: ${this.typeName},ScaleName,RootNote[,HighlightNote1,...][,GuitarSettings]`,
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
    if (config.length < 2) {
      throw new Error(
        `[${
          this.typeName
        }] Invalid config. Expected [ScaleName, RootNote, ...HighlightNotes]. Received: [${config.join(
          ", "
        )}]`
      );
    }
    const scaleNameOrAlias = config[0];
    const rootNoteName = config[1];
    const highlightNotesArray = config.slice(2);
    const highlightNotesSet = new Set(highlightNotesArray);

    const scaleKey =
      scale_names[scaleNameOrAlias as keyof typeof scale_names] ??
      scaleNameOrAlias.toUpperCase().replace(/ /g, "_");
    const scale = scales[scaleKey as keyof typeof scales];
    if (!scale)
      throw new Error(
        `[${this.typeName}] Unknown scale: "${scaleNameOrAlias}" (tried key "${scaleKey}")`
      );

    const keyIndex = getKeyIndex(rootNoteName);
    if (keyIndex === -1)
      throw new Error(`[${this.typeName}] Unknown key: "${rootNoteName}"`);
    const validRootName = MUSIC_NOTES[keyIndex]?.[0] ?? rootNoteName;

    const headerText = `${validRootName} ${scale.name}`;
    const guitarIntervalSettings = intervalSettings as GuitarIntervalSettings;
    const featureSpecificConfig = [
      scaleNameOrAlias,
      rootNoteName,
      ...highlightNotesArray,
    ];

    return new ScaleFeature(
      featureSpecificConfig,
      scale,
      keyIndex,
      validRootName,
      highlightNotesSet,
      headerText,
      settings,
      guitarIntervalSettings,
      audioController,
      maxCanvasHeight
    );
  }

  /** Calculates scale notes and passes them to the FretboardView. */
  private calculateAndSetScaleNotes(): void {
    const notesData: NoteRenderData[] = [];
    const config = this.fretboardConfig;
    const tuning = config.tuning.tuning;
    const fretCount = this.fretCount;
    const highlightingActive = this.highlightNotes.size > 0;

    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      if (stringIndex >= tuning.length) continue;
      const stringTuning = tuning[stringIndex];

      for (let fretIndex = 0; fretIndex <= fretCount; fretIndex++) {
        const noteOffsetFromA = (stringTuning + fretIndex) % 12;
        const noteRelativeToKey = (noteOffsetFromA - this.keyIndex + 12) % 12;
        const noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
        const isNoteInScale = this.scale.degrees.includes(noteRelativeToKey);
        const isNoteHighlighted = this.highlightNotes.has(noteName);

        let shouldRender = false;
        let fillColor: string = NOTE_COLORS.DEFAULT;
        let strokeColor: string | string[] = DEFAULT_STROKE;
        let strokeWidth: number = 1;
        let colorSchemeOverride: "note" | "interval" | undefined = undefined;
        let displayLabel = noteName;

        if (highlightingActive) {
          if (isNoteHighlighted) {
            shouldRender = true;
            fillColor = NOTE_COLORS[noteName] || NOTE_COLORS.DEFAULT;
            strokeWidth = 1.5; // Slightly thicker stroke for highlighted
            strokeColor = isNoteInScale
              ? IN_SCALE_HIGHLIGHT_STROKE
              : OUT_OF_SCALE_HIGHLIGHT_STROKE;
          } else if (isNoteInScale) {
            shouldRender = true;
            fillColor = NON_HIGHLIGHTED_SCALE_COLOR;
            strokeColor = DEFAULT_STROKE;
            strokeWidth = 1;
            displayLabel = ""; // Hide label for non-highlighted scale notes in highlight mode
          }
        } else {
          // No highlighting, default interval coloring
          if (isNoteInScale) {
            shouldRender = true;
            const intervalLabel = getIntervalLabel(noteRelativeToKey);
            fillColor = getColorFromScheme("interval", noteName, intervalLabel);
            colorSchemeOverride = "interval";
            strokeColor =
              intervalLabel === "R"
                ? IN_SCALE_HIGHLIGHT_STROKE
                : DEFAULT_STROKE;
            strokeWidth = intervalLabel === "R" ? 2.0 : 1;
            displayLabel = intervalLabel; // Show interval label in this mode
          }
        }

        if (shouldRender) {
          notesData.push({
            fret: fretIndex,
            stringIndex: stringIndex,
            noteName: noteName,
            intervalLabel: getIntervalLabel(noteRelativeToKey), // Keep interval for potential future use
            displayLabel: displayLabel,
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWidth: strokeWidth,
            colorSchemeOverride: colorSchemeOverride,
            radiusOverride:
              fretIndex === 0
                ? config.noteRadiusPx * OPEN_NOTE_RADIUS_FACTOR
                : undefined,
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

/* ts/guitar/features/notes_feature.ts */

import {
  Feature,
  FeatureCategoryName,
  ConfigurationSchema,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
// Removed Fretboard import
import { AppSettings } from "../../settings";
import { AudioController } from "../../audio_controller";
import {
  MUSIC_NOTES,
  getKeyIndex,
  getIntervalLabel,
  START_PX,
  clearAllChildren,
  addHeader,
  OPEN_NOTE_RADIUS_FACTOR, // Keep START_PX if needed for header/spacing calcs maybe
} from "../guitar_utils";
import { FretboardColorScheme } from "../colors";
// Import the new FretboardView and its data interface
import { FretboardView, NoteRenderData } from "../views/fretboard_view";
import { MetronomeView } from "../views/metronome_view";
import { View } from "../../view";

/** A guitar feature for displaying all notes on the fretboard using FretboardView. */
export class NotesFeature extends GuitarFeature {
  static readonly category = FeatureCategoryName.Guitar;
  static readonly typeName = "Notes";
  static readonly displayName = "Fretboard Notes";
  static readonly description =
    "Displays all notes on the fretboard. Select 'None' for note-based colors, or a root note for interval-based colors.";
  readonly typeName = NotesFeature.typeName;
  private readonly rootNoteName: string | null;
  private fretboardViewInstance: FretboardView; // Hold the instance

  constructor(
    config: ReadonlyArray<string>,
    settings: AppSettings,
    rootNoteName: string | null, // Accept optional root note
    metronomeBpmOverride?: number,
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    super(
      config,
      settings,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
    this.rootNoteName = rootNoteName;

    const fretCount = 18; // Or determine dynamically if needed

    const views: View[] = [];

    // 1. Create FretboardView
    this.fretboardViewInstance = new FretboardView(
      this.fretboardConfig,
      fretCount
    );
    views.push(this.fretboardViewInstance);

    // 2. Create MetronomeView (if applicable)
    if (this.metronomeBpm > 0 && this.audioController) {
      const metronomeAudioEl = document.getElementById(
        "metronome-sound"
      ) as HTMLAudioElement;
      if (metronomeAudioEl) {
        views.push(
          new MetronomeView(
            this.metronomeBpm,
            this.audioController
          )
        );
      } else {
        console.error("Metronome audio element not found for NotesFeature.");
      }
    } else if (this.metronomeBpm > 0 && !this.audioController) {
      console.warn(
        "Metronome requested for NotesFeature, but AudioController missing."
      );
    }

    // Assign views
    (this as { views: ReadonlyArray<View> }).views = views;

    // Calculate and set the notes *after* creating the view instance
    this.calculateAndSetNotes(fretCount);
  }

  // Static methods remain the same...
  static getConfigurationSchema(): ConfigurationSchema {
    const availableKeys = ["None", ...MUSIC_NOTES.flat()];
    return {
      description: `Config: ${this.typeName}[,RootNote][,GuitarSettings]`,
      args: [
        {
          name: "RootNote",
          type: "enum",
          required: false,
          enum: availableKeys,
          description:
            "Select 'None' (default) to color by note name, or a root note to color by interval.",
        },
        {
          name: "Guitar Settings",
          type: "ellipsis",
          uiComponentType: "ellipsis",
          description: "Configure interval-specific guitar settings.",
          nestedSchema: [
            {
              name: "metronomeBpm",
              type: "number",
              description: "Metronome BPM (0=off)",
            },
          ],
        },
      ],
    };
  }

  static createFeature(
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    maxCanvasHeight?: number
  ): Feature {
    let rootNoteName: string | null = null;
    let processedConfig = config; // Keep track of config args excluding the root note if used

    if (config.length > 0 && config[0]) {
      const potentialRoot = config[0];
      if (potentialRoot.toLowerCase() === "none") {
        rootNoteName = null;
        processedConfig = config.slice(1); // Remove "None" from config passed to constructor
      } else if (getKeyIndex(potentialRoot) !== -1) {
        rootNoteName = potentialRoot;
        processedConfig = config.slice(1); // Remove RootNote from config passed to constructor
      } else {
        // If first arg is not 'None' or a valid key, assume it's part of other config (if any)
        // and default to note-based coloring.
        console.warn(
          `[NotesFeature.createFeature] Invalid or ambiguous RootNote value "${potentialRoot}", defaulting to note-based coloring.`
        );
        rootNoteName = null;
        // Keep original config if the first arg wasn't meant to be RootNote
        // processedConfig = config; // This line might be needed depending on how base constructor uses config
      }
    } else {
      rootNoteName = null; // No root note specified
    }

    return new NotesFeature(
      processedConfig, // Pass potentially modified config
      settings,
      rootNoteName,
      metronomeBpmOverride,
      audioController,
      maxCanvasHeight
    );
  }

  /** Calculates all note data and passes it to the FretboardView instance. */
  private calculateAndSetNotes(fretCount: number): void {
    const notesData: NoteRenderData[] = [];
    const rootNoteIndex = this.rootNoteName
      ? getKeyIndex(this.rootNoteName)
      : -1;
    // Determine color scheme override based on whether a root note was provided
    const schemeOverride: FretboardColorScheme = this.rootNoteName
      ? "interval"
      : "note";
    const config = this.fretboardConfig; // Use instance config

    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      if (stringIndex >= config.tuning.tuning.length) continue;
      for (let fretIndex = 0; fretIndex <= fretCount; fretIndex++) {
        const noteOffsetFromA =
          (config.tuning.tuning[stringIndex] + fretIndex) % 12;
        const noteName = MUSIC_NOTES[noteOffsetFromA]?.[0] ?? "?";
        let intervalLabel = "?";
        if (rootNoteIndex !== -1) {
          const noteRelativeToKey = (noteOffsetFromA - rootNoteIndex + 12) % 12;
          intervalLabel = getIntervalLabel(noteRelativeToKey);
        }
        // For NotesFeature, display the note name inside the dot
        const displayLabel = noteName;

        notesData.push({
          fret: fretIndex,
          stringIndex: stringIndex,
          noteName: noteName,
          intervalLabel: intervalLabel,
          displayLabel: displayLabel,
          colorSchemeOverride: schemeOverride, // Apply the determined scheme
          // Set other properties like radiusOverride for open strings if needed
          radiusOverride:
            fretIndex === 0
              ? config.noteRadiusPx * OPEN_NOTE_RADIUS_FACTOR
              : undefined,
        });
      }
    }
    this.fretboardViewInstance.setNotes(notesData);
  }

  /** Render method now just adds the header. Views are rendered by DisplayController. */
  render(container: HTMLElement): void {
    clearAllChildren(container);
    const headerText = this.rootNoteName
      ? `Notes (Interval Colors Relative to ${this.rootNoteName})`
      : "Notes (Note Name Colors)";
    addHeader(container, headerText);
    // DisplayController will render the FretboardView (and MetronomeView if present)
  }
}

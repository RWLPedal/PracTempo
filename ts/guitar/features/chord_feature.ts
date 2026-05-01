// ts/guitar/features/chord_feature.ts
import {
  Feature,
  // FeatureCategoryName removed
  ConfigurationSchema,
  ConfigurationSchemaArg,
} from "../../feature";
import { GuitarFeature } from "../guitar_base";
import { Chord, chord_library, ukulele_chord_library, mandolin_chord_library, mandola_chord_library, getChordLibraryForInstrument } from "../chords";
import { AudioController } from "../../audio_controller";
import { AppSettings, getCategorySettings } from "../../settings";
import { ChordDiagramView } from "../views/chord_diagram_view";
import { MoveableToggleView } from "../views/moveable_toggle_view";
import { addHeader, clearAllChildren } from "../guitar_utils";
import { GuitarSettings, GUITAR_SETTINGS_KEY, DEFAULT_GUITAR_SETTINGS } from "../guitar_settings";
// Import generic and specific interval settings types
import { IntervalSettings } from "../../schedule/editor/interval/types";
import { GuitarIntervalSettings } from "../guitar_interval_settings";

/** A feature for displaying mulitple chord diagrams and a metronome. */
export class ChordFeature extends GuitarFeature {
  // Static properties (category removed, others unchanged)
  // static readonly category = FeatureCategoryName.Guitar; // Removed
  static readonly typeName = "Chord";
  static readonly displayName = "Chord Diagram";
  static readonly requiredInstruments = ["Guitar", "Ukulele", "Mandolin", "Mandola"] as const;
  static readonly description = "Displays one or more chord diagrams.";
  readonly typeName = ChordFeature.typeName;

  private static readonly MOVEABLE_PREF_KEY = "guitar-moveable-chord-pref";

  private readonly chords: ReadonlyArray<Chord>;
  private moveableView: MoveableToggleView | null = null;
  private readonly isMoveable: boolean;

  constructor(
    config: ReadonlyArray<string>, // Chord keys specific to this feature
    chords: ReadonlyArray<Chord>,
    settings: AppSettings,
    intervalSettings: GuitarIntervalSettings, // Constructor still expects specific type from base class
    audioController?: AudioController,
    maxCanvasHeight?: number
  ) {
    // Pass intervalSettings up to the base constructor
    super(
      config,
      settings,
      intervalSettings, // Pass specific type here
      audioController,
      maxCanvasHeight
    );

    this.chords = chords;
    this.isMoveable = localStorage.getItem(ChordFeature.MOVEABLE_PREF_KEY) === "true";

    const guitarSettings = getCategorySettings<GuitarSettings>(settings, GUITAR_SETTINGS_KEY) ?? DEFAULT_GUITAR_SETTINGS;

    if (guitarSettings.instrument === "Guitar") {
      this.moveableView = new MoveableToggleView(chords, this.fretboardConfig, this.isMoveable);
      this._views.push(this.moveableView);
    } else {
      // Other instruments: static chord diagrams only.
      chords.forEach((chord) => {
        this._views.push(new ChordDiagramView(chord, chord.name, this.fretboardConfig));
      });
    }
  }

  // --- Static Methods ---
  static getConfigurationSchema(): ConfigurationSchema {
    const allChordKeys = [
      ...new Set([
        ...Object.keys(chord_library),
        ...Object.keys(ukulele_chord_library),
        ...Object.keys(mandolin_chord_library),
        ...Object.keys(mandola_chord_library),
      ]),
    ];
    const specificArgs: ConfigurationSchemaArg[] = [
      {
        name: "Chord",
        type: "enum",
        required: true,
        enum: allChordKeys,
        description: "Select one or more chords. Available chords depend on the selected instrument.",
        isVariadic: true,
      },
      {
        name: "Moveable",
        type: "boolean",
        uiComponentType: "checkbox",
        description: "Show moveable barre chord shapes instead of standard open shapes. (Guitar only)",
      },
    ];
    return {
      description: `Config: ${this.typeName},ChordName1[,ChordName2,...][,GuitarSettings]`,
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
    // The last config value is 'true'/'false' (Moveable checkbox) in new-format configs.
    // Old configs contain only chord names, so we check before consuming.
    const lastVal = config.length > 0 ? config[config.length - 1] : null;
    const hasMode = lastVal === 'true' || lastVal === 'false';
    const chordKeys = hasMode ? config.slice(0, -1) : config;

    if (chordKeys.length < 1) {
      throw new Error(
        `Invalid config for ${this.typeName}. Expected at least one ChordName.`
      );
    }
    const guitarSettings = getCategorySettings<GuitarSettings>(settings, GUITAR_SETTINGS_KEY) ?? DEFAULT_GUITAR_SETTINGS;
    const library = getChordLibraryForInstrument(guitarSettings.instrument);
    const chords: Chord[] = [];
    chordKeys.forEach((chordKey) => {
      const chord = library[chordKey];
      if (chord) {
        chords.push(chord);
      } else {
        console.warn(
          `[${this.typeName}] Unknown chord key for ${guitarSettings.instrument}: "${chordKey}". Skipping.`
        );
      }
    });
    if (chords.length === 0) {
      throw new Error(
        `[${this.typeName}] No valid chords found in config: ${config.join(
          ","
        )}`
      );
    }

    // --- Type Assertion for Constructor ---
    // We assert that the intervalSettings object passed in is actually
    // GuitarIntervalSettings because the ScheduleBuilder should have used the
    // correct parser registered by the GuitarCategory.
    const guitarIntervalSettings = intervalSettings as GuitarIntervalSettings;
    // --- End Type Assertion ---

    return new ChordFeature(
      chordKeys, // Pass only the chord keys as the specific config
      chords,
      settings,
      guitarIntervalSettings, // Pass the asserted specific type
      audioController,
      maxCanvasHeight
    );
  }

  render(container: HTMLElement): void {
    clearAllChildren(container);
    const uniqueNames = [...new Set(this.chords.map((c) => c.name))];
    let headerText = "Chord Diagram";
    if (uniqueNames.length === 1) {
      headerText = `${uniqueNames[0]} Chord`;
    } else if (uniqueNames.length > 1) {
      headerText = uniqueNames.slice(0, 3).join(" / ") + " Chords";
    }
    const header = addHeader(container, headerText);
    header.classList.add("feature-main-title");

    const outerContainer = container.parentElement;
    const movField = outerContainer?.querySelector<HTMLElement>('[data-arg-name="Moveable"]');
    if (this.moveableView) {
      if (movField) movField.style.display = '';
      const movCb = movField?.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (movCb) {
        const freshCb = movCb.cloneNode(true) as HTMLInputElement;
        freshCb.checked = this.isMoveable;
        movCb.parentNode!.replaceChild(freshCb, movCb);
        freshCb.addEventListener('change', () => {
          localStorage.setItem(ChordFeature.MOVEABLE_PREF_KEY, String(freshCb.checked));
          this.moveableView!.setIsMoveable(freshCb.checked);
        });
      }
    } else {
      if (movField) movField.style.display = 'none';
    }
  }
}

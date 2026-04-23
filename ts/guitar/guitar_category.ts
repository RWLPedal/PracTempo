// ts/guitar/guitar_category.ts
import { Category } from "../feature"; // Use Category from feature.ts
import { FeatureTypeDescriptor, SettingsUISchemaItem } from "../feature";
import {
  IntervalSettings,
  IntervalSettingsJSON,
  ScheduleRowData,
} from "../schedule/editor/interval/types";

// Import Guitar Features
import { NotesFeature } from "./features/notes_feature";
import { ScaleFeature } from "./features/scale_feature";
import { ChordFeature } from "./features/chord_feature";
import { ChordProgressionFeature } from "./features/chord_progression_feature";
import { TriadFeature } from "./features/triad_feature";
import { MetronomeFeature } from "./features/metronome_feature";
import { registerFloatingView } from "../floating_views/floating_view_registry";
import { FretboardFloatingViewDescriptor } from "../floating_views/floating_view_types";
import { ColorLegendView } from "./views/color_legend_view";
import { FloatingMetronomeView } from "./views/floating_metronome_view";
import { ConfigurableFeatureView } from '../views/configurable_feature_view';
import { AppSettings } from "../settings";
import { AudioController } from "../audio_controller";

// Import Guitar Settings related items
import { DEFAULT_GUITAR_SETTINGS, GuitarSettings } from "./guitar_settings";
import {
  GuitarIntervalSettings,
  GuitarIntervalSettingsJSON,
} from "./guitar_interval_settings";

// Helper function imports (for settings UI schema)
import { INSTRUMENT_TUNINGS, InstrumentName } from "./fretboard";
import { FretboardColorScheme } from "./colors";
import { CagedFeature } from "./features/caged_feature";
import { MultiSelectFretboardFeature } from "./features/multi_select_fretboard_feature";

// Helper function to generate UI Schema
function getGuitarGlobalSettingsUISchema(): SettingsUISchemaItem[] {
  const instrumentOptions: { value: InstrumentName; text: string }[] = [
    { value: "Guitar",          text: "Guitar" },
    { value: "Bass",            text: "Bass (4-string, EADG)" },
    { value: "Ukulele",         text: "Ukulele (4-string, GCEA)" },
    { value: "Mandola",         text: "Mandola (4-string, CGDA)" },
    { value: "Mandolin",        text: "Mandolin (4-string, GDAE)" },
    { value: "7-String Guitar", text: "7-String Guitar (BEADGBE)" },
    { value: "8-String Guitar", text: "8-String Guitar (F#BEADGBE)" },
  ];
  const handednessOptions = [
    { value: "right", text: "Right-Handed" },
    { value: "left", text: "Left-Handed" },
  ];
  const orientationOptions = [
    { value: "vertical", text: "Vertical (Default)" },
    { value: "horizontal", text: "Horizontal" },
  ];
  const colorSchemeOptions: { value: FretboardColorScheme; text: string }[] = [
    { value: "interval", text: "Interval Colors (Default)" },
    { value: "note", text: "Note Name Colors" },
    { value: "simplified", text: "Simplified (Root Only)" },
  ];
  return [
    {
      key: "instrument",
      label: "Instrument",
      type: "select",
      options: instrumentOptions,
      triggersRebuild: true,
      description: "Select the instrument type. Changes the available tunings and features.",
    },
    {
      key: "handedness",
      label: "Diagram Handedness",
      type: "select",
      options: handednessOptions,
      description: "Orientation of fretboard diagrams.",
    },
    {
      key: "orientation",
      label: "Fretboard Layout",
      type: "select",
      options: orientationOptions,
      description: "Display the fretboard vertically or horizontally.",
    },
    {
      key: "tuning",
      label: "Tuning",
      type: "select",
      getDynamicOptions: (draft) => {
        const instrument = (draft.instrument as InstrumentName) ?? "Guitar";
        const tunings = INSTRUMENT_TUNINGS[instrument] ?? INSTRUMENT_TUNINGS["Guitar"];
        return Object.keys(tunings).map((key) => ({ value: key, text: key }));
      },
      description: "Select the tuning (options depend on the selected instrument).",
    },
    {
      key: "colorScheme",
      label: "Fretboard Color Scheme",
      type: "select",
      options: colorSchemeOptions,
      description: "How notes on the fretboard are colored.",
    },
  ];
}

export class GuitarCategory implements Category {
  private readonly name = "Guitar";
  private readonly displayName = "Guitar Tools";
  private readonly featureTypes: Map<string, FeatureTypeDescriptor>;

  constructor() {
    // Instantiate the map of features provided by this category
    this.featureTypes = new Map<string, FeatureTypeDescriptor>([
      [NotesFeature.typeName, NotesFeature as unknown as FeatureTypeDescriptor],
      [ScaleFeature.typeName, ScaleFeature as unknown as FeatureTypeDescriptor],
      [ChordFeature.typeName, ChordFeature as unknown as FeatureTypeDescriptor],
      [
        ChordProgressionFeature.typeName,
        ChordProgressionFeature as unknown as FeatureTypeDescriptor,
      ],
      [TriadFeature.typeName, TriadFeature as unknown as FeatureTypeDescriptor],
      [CagedFeature.typeName, CagedFeature as unknown as FeatureTypeDescriptor],
      [
        MetronomeFeature.typeName,
        MetronomeFeature as unknown as FeatureTypeDescriptor,
      ],
      [
        MultiSelectFretboardFeature.typeName,
        MultiSelectFretboardFeature as unknown as FeatureTypeDescriptor,
      ],
    ]);

    this.registerFloatingViews();
  }

  private registerFloatingViews(): void {
    registerFloatingView({
      viewId: "guitar_color_legend", // Unique ID
      displayName: "Color Legend", // User-facing name
      categoryName: this.getName(), // Associate with Guitar category
      defaultWidth: 180, // Example default size
      // Factory needs access to AppSettings to get current scheme
      createView: (initialState?: any, appSettings?: AppSettings) => {
        if (!appSettings) {
          console.error("AppSettings not provided to ColorLegendView factory!");
          // Return a dummy view or throw error
          return {
            render: (c) => (c.textContent = "Error: Settings unavailable."),
            start() {},
            stop() {},
            destroy() {},
          };
        }
        return new ColorLegendView(appSettings);
      },
    });

    registerFloatingView({
      viewId: "configurable_guitar_feature", // New ID
      displayName: "Configurable Feature",  // Generic name
      categoryName: this.getName(),
      defaultWidth: 420,
      defaultHeight: 550,
      showInMenu: false,
      isFretboardView: true,
      supportsRotate: true,
      supportsZoom: true,
      createView: (initialState, appSettings) => {
        return new ConfigurableFeatureView(initialState, appSettings);
      },
    } as FretboardFloatingViewDescriptor);

    registerFloatingView({
        viewId: "guitar_notes_reference",
        displayName: "Fretboard Notes",
        categoryName: this.getName(),
        defaultWidth: 340,
        defaultHeight: 550,
        showInMenu: true,
        isFretboardView: true,
        supportsRotate: true,
        supportsZoom: true,
        createView: (initialState, appSettings) => {
          // This view will just create and render a NotesFeature with default config
          const feature = NotesFeature.createFeature(
              ['None'], // Config for showing all notes
              new AudioController(null,null,null,null),
              appSettings,
              new GuitarIntervalSettings(),
              650,
              'Guitar'
          );
  
          // We need a view object that wraps the feature.
          return {
              render: (container: HTMLElement) => {
                  feature.render(container);
                  if (feature.views) {
                    feature.views.forEach(v => v.render(container));
                  }
              },
              start: () => feature.start?.(),
              stop: () => feature.stop?.(),
              destroy: () => feature.destroy?.()
          };
        },
      } as FretboardFloatingViewDescriptor);

    registerFloatingView({
      viewId: "guitar_chord_progression",
      displayName: "Chord Progression",
      categoryName: this.getName(),
      defaultWidth: 420,
      defaultHeight: 600,
      showInMenu: true,
      isFretboardView: true,
      supportsRotate: true,
      supportsZoom: true,
      createView: (initialState, appSettings) => {
        return new ConfigurableFeatureView(
          { ...initialState, featureTypeName: ChordProgressionFeature.typeName },
          appSettings
        );
      },
    } as FretboardFloatingViewDescriptor);

    registerFloatingView({
      viewId: "guitar_floating_metronome",
      displayName: "Metronome",
      categoryName: this.getName(),
      defaultWidth: 280,
      defaultHeight: 150,
      createView: (initialState?: any, appSettings?: AppSettings) => {
        return new FloatingMetronomeView(appSettings);
      },
    });
  }

  getName(): string {
    return this.name;
  }

  getDisplayName(): string {
    return this.displayName;
  }

  getFeatureTypes(): ReadonlyMap<string, FeatureTypeDescriptor> {
    return this.featureTypes;
  }

  getDefaultGlobalSettings(): GuitarSettings {
    // Return a copy to prevent modification of the original default
    return { ...DEFAULT_GUITAR_SETTINGS };
  }

  getIntervalSettingsFactory(): () => GuitarIntervalSettings {
    // Return a function that creates a new default instance
    return () => new GuitarIntervalSettings();
  }

  createIntervalSettingsFromJSON(
    json: IntervalSettingsJSON | undefined | null
  ): GuitarIntervalSettings {
    // Use the static method on the specific class
    // Cast the input json; the registry ensures this method is called for the correct category.
    return GuitarIntervalSettings.fromJSON(
      json as GuitarIntervalSettingsJSON | undefined | null
    );
  }

  getGlobalSettingsUISchema(): SettingsUISchemaItem[] {
    // Return the schema for the Guitar category's global settings
    return getGuitarGlobalSettingsUISchema();
  }

  /** Returns a default set of intervals for a simple guitar schedule */
  getDefaultIntervals(): ScheduleRowData[] | null {
    // Use the factory to get default settings for these intervals
    const defaultIntervalSettings = this.getIntervalSettingsFactory()();

    return [
      {
        rowType: "interval",
        duration: "5:00",
        task: "Warmup",
        categoryName: this.getName(), // Use own name
        featureTypeName: "Notes",
        featureArgsList: [],
        intervalSettings: defaultIntervalSettings, // Assign instance
      },
      { rowType: "group", level: 1, name: "Scale Practice" },
      {
        rowType: "interval",
        duration: "3:00",
        task: "C Major Scale",
        categoryName: this.getName(),
        featureTypeName: "Scale",
        featureArgsList: ["Major", "C"],
        intervalSettings: defaultIntervalSettings, // Assign instance
      },
      {
        rowType: "interval",
        duration: "3:00",
        task: "G Major Scale",
        categoryName: this.getName(),
        featureTypeName: "Scale",
        featureArgsList: ["Major", "G"],
        intervalSettings: defaultIntervalSettings, // Assign instance
      },
    ];
  }
}

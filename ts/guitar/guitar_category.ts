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
import { ColorLegendView } from "./views/color_legend_view";
import { FretboardReferenceView } from './views/fretboard_reference_view';
import { AppSettings } from "../settings";

// Import Guitar Settings related items
import { DEFAULT_GUITAR_SETTINGS, GuitarSettings } from "./guitar_settings";
import {
  GuitarIntervalSettings,
  GuitarIntervalSettingsJSON,
} from "./guitar_interval_settings";

// Helper function imports (for settings UI schema)
import { AVAILABLE_TUNINGS } from "./fretboard";
import { FretboardColorScheme } from "./colors";
import { CagedFeature } from "./features/caged_feature";

// Helper function to generate UI Schema (can be kept here or imported)
function getGuitarGlobalSettingsUISchema(): SettingsUISchemaItem[] {
  const tuningOptions = Object.keys(AVAILABLE_TUNINGS).map((key) => ({
    value: key,
    text: key,
  }));
  const handednessOptions = [
    { value: "right", text: "Right-Handed" },
    { value: "left", text: "Left-Handed" },
  ];
  // Updated color scheme options
  const colorSchemeOptions: { value: FretboardColorScheme; text: string }[] = [
    { value: "interval", text: "Interval Colors (Default)" }, // Interval is default
    { value: "note", text: "Note Name Colors" },
    { value: "simplified", text: "Simplified (Root Only)" }, // Renamed from "Default"
  ];
  return [
    {
      key: "handedness",
      label: "Diagram Handedness",
      type: "select",
      options: handednessOptions,
      description: "Orientation of fretboard diagrams.",
    },
    {
      key: "tuning",
      label: "Tuning",
      type: "select",
      options: tuningOptions,
      description: "Select the guitar tuning.",
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
      viewId: "guitar_fretboard_reference", // Unique ID
      displayName: "Fretboard Reference",  // Name for the dropdown menu
      categoryName: this.getName(),
      defaultWidth: 180, // A bit wider to accommodate the fretboard
      defaultHeight: 550, // Taller to show more frets
      createView: (initialState?: any, appSettings?: AppSettings) => {
        return new FretboardReferenceView(appSettings);
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

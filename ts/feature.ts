import { View } from "./view";
import { AudioController } from "./audio_controller";
import { AppSettings } from "./settings";
import {
  IntervalSettings,
  IntervalSettingsJSON,
  ScheduleRowData, // <-- Add ScheduleRowData import
} from "./schedule/editor/interval/types";

/**
 * Represents a category of features (e.g., Guitar, Piano).
 * Encapsulates category-specific features, settings, and factories.
 */
export interface Category {
  /** Unique identifier string for the category (e.g., "Guitar") */
  getName(): string;

  /** User-friendly display name (e.g., "Guitar Tools") */
  getDisplayName(): string;

  /** Returns a map of FeatureTypeDescriptors belonging to this category */
  getFeatureTypes(): ReadonlyMap<string, FeatureTypeDescriptor>;

  /** Returns the default *global* settings data object for this category */
  getDefaultGlobalSettings(): any;

  /** Returns a factory function to create a default *interval-specific* settings object */
  getIntervalSettingsFactory(): () => IntervalSettings;

  /**
   * Creates an interval-specific settings object from parsed JSON data.
   * Handles potential undefined/null input.
   * @param json - The parsed JSON object for interval settings, or undefined/null.
   * @returns An instance implementing IntervalSettings.
   */
  createIntervalSettingsFromJSON(
    json: IntervalSettingsJSON | undefined | null
  ): IntervalSettings;

  /** Optional: Returns a schema for the category's *global* settings UI */
  getGlobalSettingsUISchema?(): SettingsUISchemaItem[];

  /** Optional: Returns a default array of schedule row data for this category */
  getDefaultIntervals?(): ScheduleRowData[] | null; // <-- Added method signature
}

// --- Feature Interface --- (Category property removed)
export interface Feature {
  readonly typeName: string;
  readonly config: ReadonlyArray<string>; // Feature-specific config args
  readonly views?: ReadonlyArray<View>;
  readonly maxCanvasHeight?: number;
  // render, prepare, start, stop, destroy methods remain
  render(container: HTMLElement): void;
  prepare?(): void;
  start?(): void;
  stop?(): void;
  destroy?(): void;
}

// --- Feature Type Descriptor --- (Category property removed, createFeature updated)
// Describes a specific type of feature within a category (e.g., "Scale" within "Guitar")
export interface FeatureTypeDescriptor {
  // readonly category: FeatureCategoryName; // Removed
  readonly typeName: string; // Unique name within the category (e.g., "Scale", "Chord")
  readonly displayName: string; // User-friendly name (e.g., "Scale Diagram")
  readonly description: string;
  /**
   * If set, this feature is only available when the active instrument is one of
   * the listed instrument names. Omit for features that work on all instruments.
   */
  readonly requiredInstruments?: ReadonlyArray<string>;
  getConfigurationSchema(): ConfigurationSchema; // How to configure this feature type
  /**
   * Factory method to create an instance of the feature.
   * @param config - Feature-specific configuration arguments from the schedule editor.
   * @param audioController - Global audio controller.
   * @param settings - Global application settings (contains global category settings).
   * @param intervalSettings - The specific interval settings instance for this feature instance.
   * @param maxCanvasHeight - Optional maximum height for rendering.
   * @param categoryName - The name of the category this feature belongs to. (Added for context)
   * @returns A new Feature instance.
   */
  createFeature(
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings,
    intervalSettings: IntervalSettings, // Use the generic base type
    maxCanvasHeight: number | undefined,
    categoryName: string // Pass category name for context if needed by features
  ): Feature;
}

export interface ConfigurationSchemaArg {
  name: string;
  type: "string" | "number" | "boolean" | "enum" | "ellipsis";
  uiComponentType?:
    | "text"
    | "number"
    | "enum"
    | "toggle_button_selector"
    | "ellipsis"
    | "checkbox"
    | "layer_list";
  uiComponentData?: {
    buttonLabels?: string[];
    /** Advanced (7th chord) labels — hidden until the Advanced checkbox is checked. */
    advancedButtonLabels?: string[];
    /** Basic labels used when Key type is Minor. */
    minorButtonLabels?: string[];
    /** Advanced labels used when Key type is Minor. */
    minorAdvancedButtonLabels?: string[];
    /** Layer list data for MultiSelectFretboard feature. */
    scaleNames?: string[];
    rootNoteOptions?: string[];
    chordEntries?: { key: string; label: string }[];
    noteNames?: string[];
  };
  required?: boolean;
  enum?: string[];
  description?: string;
  example?: string;
  isVariadic?: boolean;
  nestedSchema?: ConfigurationSchemaArg[];
  /**
   * Name of another arg in the same schema that this arg controls.
   * Used to wire up dynamic UI updates (e.g. a Key dropdown rebuilding
   * a toggle-button selector, or an Advanced checkbox showing hidden buttons).
   */
  controlsArgName?: string;
}

export type ConfigurationSchema =
  | { description: string; args: ConfigurationSchemaArg[] }
  | string; // Can be just a description string if no args

/** Describes a single UI element for the *global* settings modal for a category */
export interface SettingsUISchemaItem {
  key: string;
  label: string;
  type: "select" | "number" | "text" | "checkbox";
  options?: { value: string; text: string }[];
  /**
   * When present, options are computed from the current draft settings for this
   * category. Takes precedence over `options`. Used for fields whose choices
   * depend on other fields (e.g. tuning depends on instrument).
   */
  getDynamicOptions?: (draft: Record<string, any>) => { value: string; text: string }[];
  /**
   * When true, changing this field triggers a re-render of the category settings
   * section so dependent fields (those with `getDynamicOptions`) can update.
   */
  triggersRebuild?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

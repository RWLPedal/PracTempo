// ts/feature.ts
import { View } from "./view";
import { AudioController } from "./audio_controller";
import { AppSettings } from "./settings";

export enum FeatureCategoryName {
  Guitar = "Guitar",
  /* Add other categories here */
}

// --- Feature Interface --- (remains the same)
export interface Feature {
  // ...
  readonly category: FeatureCategoryName;
  readonly typeName: string;
  readonly config: ReadonlyArray<string>;
  readonly views?: ReadonlyArray<View>;
  readonly maxCanvasHeight?: number;
  render(container: HTMLElement): void;
  prepare?(): void;
  start?(): void;
  stop?(): void;
  destroy?(): void;
}

export interface ConfigurationSchemaArg {
  name: string;
  // Defines the underlying data type (string, number, etc.)
  type: "string" | "number" | "boolean" | "enum" | "ellipsis";
   // Optional: Specify a custom UI component to render instead of the default for 'type'
  uiComponentType?: 'text' | 'number' | 'enum' | 'toggle_button_selector' | 'ellipsis';
  // Optional: Data needed by the custom UI component (e.g., button labels)
  uiComponentData?: {
      buttonLabels?: string[];
      // Add other potential data keys here if needed for future components
  };
  required?: boolean;
  enum?: string[]; // Still used for standard 'enum' type or as data for custom components
  description?: string;
  example?: string;
  isVariadic?: boolean;
  nestedSchema?: ConfigurationSchemaArg[]; // Defines the inputs within the ellipsis dropdown
}

export type ConfigurationSchema =
  | { description: string; args: ConfigurationSchemaArg[] }
  | string;

// --- NEW: Settings UI Schema Definition ---
/** Describes a single UI element for the settings modal */
export interface SettingsUISchemaItem {
  /** The key within the category's settings object (e.g., "tuning", "handedness") */
  key: string;
  /** The user-visible label for the setting (e.g., "Guitar Tuning") */
  label: string;
  /** The type of HTML input element to render */
  type: "select" | "number" | "text" | "checkbox"; // Add more types as needed (e.g., 'color')
  /** Options for 'select' type. Value is what's stored, text is what's displayed. */
  options?: { value: string; text: string }[];
  /** Placeholder text for 'text' or 'number' inputs */
  placeholder?: string;
  /** Minimum value for 'number' type */
  min?: number;
  /** Maximum value for 'number' type */
  max?: number;
  /** Step value for 'number' type */
  step?: number;
  /** Description for tooltips */
  description?: string;
}

// --- Feature Type Descriptor --- (remains the same)
export interface FeatureTypeDescriptor {
  readonly category: FeatureCategoryName;
  readonly typeName: string;
  readonly displayName: string;
  readonly description: string;
  getConfigurationSchema(): ConfigurationSchema;
  createFeature(
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings,
    metronomeBpmOverride?: number,
    maxCanvasHeight?: number
  ): Feature;
}

// --- Feature Category Descriptor ---
export interface FeatureCategoryDescriptor {
  readonly categoryName: FeatureCategoryName;
  readonly displayName: string;
  readonly featureTypes: ReadonlyMap<string, FeatureTypeDescriptor>;
  /** Optional: Returns a schema describing UI elements for this category's settings. */
  getSettingsUISchema?(): SettingsUISchemaItem[];
}

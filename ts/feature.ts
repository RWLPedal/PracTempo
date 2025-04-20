import { View } from "./view";
import { AudioController } from "./audio_controller";
import { AppSettings } from "./settings";

export enum FeatureCategoryName {
  Guitar = "Guitar",
  /* Add other categories here */
}

export interface Feature {
  readonly category: FeatureCategoryName;
  readonly typeName: string;
  readonly config: ReadonlyArray<string>; // Raw config args (excluding serialized settings)
  readonly views?: ReadonlyArray<View>;
  readonly maxCanvasHeight?: number; // Optional height constraint
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
  | {
      description: string;
      args: ConfigurationSchemaArg[];
    }
  | string; // Allow simple string description for features with no args

export interface FeatureTypeDescriptor {
  readonly category: FeatureCategoryName;
  readonly typeName: string;
  readonly displayName: string;
  readonly description: string;

  getConfigurationSchema(): ConfigurationSchema;

  /**
   * Factory method.
   * @param config - Feature-specific args (excluding serialized settings string).
   * For custom UI components like sequence selectors, this might contain
   * the component's output (e.g., [RootNote, Numeral1, Numeral2,...]).
   * @param audioController - Shared audio controller.
   * @param settings - Global app settings.
   * @param metronomeBpmOverride - BPM parsed from the ellipsis UI or text config.
   * @returns Initialized Feature instance.
   */
  createFeature(
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings,
    metronomeBpmOverride?: number, // Optional BPM from ellipsis/text config
    maxCanvasHeight?: number // Optional height constraint
  ): Feature;
}

export interface FeatureCategoryDescriptor {
  readonly categoryName: FeatureCategoryName;
  readonly displayName: string;
  readonly featureTypes: ReadonlyMap<string, FeatureTypeDescriptor>;
}

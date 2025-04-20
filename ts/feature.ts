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
  render(container: HTMLElement): void;
  prepare?(): void;
  start?(): void;
  stop?(): void;
  destroy?(): void;
}


export interface ConfigurationSchemaArg {
  name: string;
  type: "string" | "number" | "boolean" | "enum" | "ellipsis";
  required?: boolean;
  enum?: string[];
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
  | string;

export interface FeatureTypeDescriptor {
  readonly category: FeatureCategoryName;
  readonly typeName: string;
  readonly displayName: string;
  readonly description: string;

  getConfigurationSchema(): ConfigurationSchema;

  /**
   * Factory method.
   * @param config - Feature-specific args (excluding serialized settings string).
   * @param audioController - Shared audio controller.
   * @param settings - Global app settings.
   * @param metronomeBpmOverride - BPM parsed from the ellipsis UI or text config.
   * @returns Initialized Feature instance.
   */
  createFeature(
    config: ReadonlyArray<string>,
    audioController: AudioController,
    settings: AppSettings,
    metronomeBpmOverride?: number // Optional BPM from ellipsis/text config
  ): Feature;
}

export interface FeatureCategoryDescriptor {
  readonly categoryName: FeatureCategoryName;
  readonly displayName: string;
  readonly featureTypes: ReadonlyMap<string, FeatureTypeDescriptor>;
}

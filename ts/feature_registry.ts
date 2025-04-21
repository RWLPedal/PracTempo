import { FeatureTypeDescriptor, SettingsUISchemaItem } from "./feature";
import { Category } from "./feature"; // Use Category instead of ICategory
import { CategorySettingsMap } from "./settings";
import {
  IntervalSettings,
  IntervalSettingsJSON,
} from "./schedule/editor/interval/types";

// --- Internal Registry Maps ---
/** Stores registered Category instances, keyed by category name */
const categoryRegistry = new Map<string, Category>();

/** Stores FeatureTypeDescriptors, keyed by categoryName/typeName for quick lookup */
const featureTypeRegistry = new Map<string, FeatureTypeDescriptor>(); // Key: "CategoryName/TypeName"

/** Stores default global settings data, keyed by category name */
const defaultGlobalSettingsRegistry = new Map<string, any>();

/** Stores interval settings factories, keyed by category name */
const intervalSettingsFactoryRegistry = new Map<
  string,
  () => IntervalSettings
>();

/** Stores interval settings JSON parsers, keyed by category name */
const intervalSettingsParserRegistry = new Map<
  string,
  (json: IntervalSettingsJSON | undefined | null) => IntervalSettings
>();

/**
 * Registers a feature category instance.
 * Extracts necessary information and populates internal registries.
 * @param categoryInstance - An instance of a class implementing Category.
 */
export function registerCategory(categoryInstance: Category): void {
  const categoryName = categoryInstance.getName();
  if (!categoryName || typeof categoryName !== "string") {
    console.error(
      "Cannot register category: Instance is missing a valid getName() method.",
      categoryInstance
    );
    return;
  }
  if (categoryRegistry.has(categoryName)) {
    console.warn(
      `FeatureCategory "${categoryName}" is already registered. Overwriting.`
    );
  }

  categoryRegistry.set(categoryName, categoryInstance);

  // Store settings and factories provided by the category instance
  try {
    defaultGlobalSettingsRegistry.set(
      categoryName,
      categoryInstance.getDefaultGlobalSettings()
    );
  } catch (e) {
    console.error(
      `Error getting default global settings for category "${categoryName}":`,
      e
    );
  }
  try {
    intervalSettingsFactoryRegistry.set(
      categoryName,
      categoryInstance.getIntervalSettingsFactory()
    );
  } catch (e) {
    console.error(
      `Error getting interval settings factory for category "${categoryName}":`,
      e
    );
  }
  try {
    // Bind the method to the instance to preserve 'this' context if needed inside the method
    intervalSettingsParserRegistry.set(
      categoryName,
      categoryInstance.createIntervalSettingsFromJSON.bind(categoryInstance)
    );
  } catch (e) {
    console.error(
      `Error getting interval settings JSON parser for category "${categoryName}":`,
      e
    );
  }

  // Register individual feature types for easy lookup
  let featureTypes: ReadonlyMap<string, FeatureTypeDescriptor> | null = null;
  try {
    featureTypes = categoryInstance.getFeatureTypes();
    if (!featureTypes)
      throw new Error("getFeatureTypes() returned null or undefined");
  } catch (e) {
    console.error(
      `Error getting feature types for category "${categoryName}":`,
      e
    );
    return; // Don't proceed if features can't be retrieved
  }

  featureTypes.forEach((featureType, typeName) => {
    if (!typeName || typeof typeName !== "string") {
      console.warn(
        `Skipping feature registration for category "${categoryName}": Invalid typeName found.`,
        featureType
      );
      return;
    }
    const fullKey = `${categoryName}/${typeName}`;
    if (featureTypeRegistry.has(fullKey)) {
      console.warn(
        `FeatureType "${fullKey}" is already registered. Overwriting.`
      );
    }
    // Basic validation of featureType descriptor
    if (
      typeof featureType?.createFeature !== "function" ||
      typeof featureType?.getConfigurationSchema !== "function"
    ) {
      console.warn(
        `Skipping feature registration for "${fullKey}": Invalid FeatureTypeDescriptor (missing createFeature or getConfigurationSchema).`,
        featureType
      );
      return;
    }
    featureTypeRegistry.set(fullKey, featureType);
  });

  console.log(
    `Registered Category: ${categoryName} with ${
      featureTypes?.size ?? 0
    } feature types.`
  );
}

/**
 * Retrieves a registered category instance by name.
 * @param categoryName - The unique name of the category.
 * @returns The Category instance or undefined if not found.
 */
export function getCategory(categoryName: string): Category | undefined {
  return categoryRegistry.get(categoryName);
}

/**
 * Retrieves the descriptor for a specific feature type.
 * @param categoryName - The category name.
 * @param typeName - The feature type name within the category.
 * @returns The descriptor or undefined if not found.
 */
export function getFeatureTypeDescriptor(
  categoryName: string,
  typeName: string
): FeatureTypeDescriptor | undefined {
  if (!categoryName || !typeName) return undefined;
  return featureTypeRegistry.get(`${categoryName}/${typeName}`);
}

/**
 * Retrieves all registered category instances.
 * @returns An array of all registered Category instances.
 */
export function getAvailableCategories(): Category[] {
  return Array.from(categoryRegistry.values());
}

/**
 * Retrieves all available feature type descriptors for a given category.
 * @param categoryName - The category name.
 * @returns An array of type descriptors, or empty if category not found.
 */
export function getAvailableFeatureTypes(
  categoryName: string
): FeatureTypeDescriptor[] {
  const category = categoryRegistry.get(categoryName);
  return category ? Array.from(category.getFeatureTypes().values()) : [];
}

/** Retrieves the default *global* settings *data* for a specific category name. */
export function getDefaultGlobalSettingsForCategory<T>(
  categoryName: string
): T | undefined {
  return defaultGlobalSettingsRegistry.get(categoryName) as T | undefined;
}

/** Constructs a map containing the default *global* settings *data* for all registered categories. */
export function getAllDefaultGlobalSettings(): CategorySettingsMap {
  const defaults: CategorySettingsMap = {};
  defaultGlobalSettingsRegistry.forEach((settings, categoryName) => {
    // Ensure settings is not null/undefined before assigning
    if (settings !== undefined && settings !== null) {
      defaults[categoryName] = settings;
    } else {
      console.warn(
        `Default global settings for category "${categoryName}" are null or undefined.`
      );
      defaults[categoryName] = {}; // Assign empty object as fallback
    }
  });
  return defaults;
}

/** Retrieves the factory function for creating a default *interval* settings instance for a category. */
export function getIntervalSettingsFactory(
  categoryName: string
): (() => IntervalSettings) | undefined {
  return intervalSettingsFactoryRegistry.get(categoryName);
}

/** Retrieves the parser function for creating an *interval* settings instance from JSON for a category. */
export function getIntervalSettingsParser(
  categoryName: string
):
  | ((json: IntervalSettingsJSON | undefined | null) => IntervalSettings)
  | undefined {
  return intervalSettingsParserRegistry.get(categoryName);
}

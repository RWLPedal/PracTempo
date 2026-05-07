import { FeatureTypeDescriptor } from "./feature";
import { Category } from "./feature";

// --- Internal Registry Maps ---
/** Stores registered Category instances, keyed by category name */
const categoryRegistry = new Map<string, Category>();

/** Stores FeatureTypeDescriptors, keyed by categoryName/typeName for quick lookup */
const featureTypeRegistry = new Map<string, FeatureTypeDescriptor>(); // Key: "CategoryName/TypeName"

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

/**
 * Retrieves feature type descriptors for a given category, filtered to those
 * compatible with the specified instrument. Features without `requiredInstruments`
 * are always included.
 */
export function getAvailableFeatureTypesForInstrument(
  categoryName: string,
  instrument: string
): FeatureTypeDescriptor[] {
  return getAvailableFeatureTypes(categoryName).filter(
    (ft) => !ft.requiredInstruments || ft.requiredInstruments.includes(instrument)
  );
}


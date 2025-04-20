import {
  FeatureCategoryDescriptor,
  FeatureCategoryName,
  FeatureTypeDescriptor,
} from "./feature";

/**
 * Global registry holding descriptors for feature categories.
 * Maps category names (enum) to their descriptors.
 */
export const featureRegistry = new Map<
  FeatureCategoryName,
  FeatureCategoryDescriptor
>();

/**
 * Registers a feature category descriptor with the global registry.
 * @param {FeatureCategoryDescriptor} categoryDescriptor - The descriptor to register.
 */
export function registerFeatureCategory(
  categoryDescriptor: FeatureCategoryDescriptor
): void {
  if (featureRegistry.has(categoryDescriptor.categoryName)) {
    console.warn(
      `FeatureCategory "${categoryDescriptor.categoryName}" is already registered. Overwriting.`
    );
  }
  featureRegistry.set(categoryDescriptor.categoryName, categoryDescriptor);
  console.log(
    `Registered Feature Category: ${categoryDescriptor.categoryName}`
  );
}

/**
 * Retrieves the descriptor for a specific feature category.
 * @param {FeatureCategoryName} categoryName - The name of the category to retrieve.
 * @returns {FeatureCategoryDescriptor | undefined} - The descriptor or undefined if not found.
 */
export function getCategoryDescriptor(
  categoryName: FeatureCategoryName
): FeatureCategoryDescriptor | undefined {
  return featureRegistry.get(categoryName);
}

/**
 * Retrieves the descriptor for a specific feature type within a category.
 * @param {FeatureCategoryName} categoryName - The category the feature type belongs to.
 * @param {string} typeName - The name of the feature type within the category.
 * @returns {FeatureTypeDescriptor | undefined} - The descriptor or undefined if not found.
 */
export function getFeatureTypeDescriptor(
  categoryName: FeatureCategoryName,
  typeName: string
): FeatureTypeDescriptor | undefined {
  const category = featureRegistry.get(categoryName);
  return category?.featureTypes.get(typeName);
}

/**
 * Retrieves all registered feature category descriptors.
 * @returns {FeatureCategoryDescriptor[]} - An array of all registered category descriptors.
 */
export function getAvailableCategories(): FeatureCategoryDescriptor[] {
  return Array.from(featureRegistry.values());
}

/**
 * Retrieves all available feature type descriptors for a given category.
 * @param {FeatureCategoryName} categoryName - The category to get types from.
 * @returns {FeatureTypeDescriptor[]} - An array of type descriptors, or empty if category not found.
 */
export function getAvailableFeatureTypes(
  categoryName: FeatureCategoryName
): FeatureTypeDescriptor[] {
  const category = featureRegistry.get(categoryName);
  return category ? Array.from(category.featureTypes.values()) : [];
}

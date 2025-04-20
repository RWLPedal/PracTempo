import {
  FeatureCategoryDescriptor,
  FeatureCategoryName,
  FeatureTypeDescriptor,
} from "./feature";
// Import the map type from settings
import { CategorySettingsMap } from "./settings";
import { IntervalSettings } from "./schedule/editor/interval/types";

/** Global registry holding descriptors for feature categories. */
export const featureRegistry = new Map<
  FeatureCategoryName,
  FeatureCategoryDescriptor
>();

/** Global registry holding default settings *data* for feature categories. */
const defaultCategorySettingsRegistry = new Map<FeatureCategoryName, any>();

/** Global registry holding factory functions to create default IntervalSettings instances. */
const intervalSettingsFactoryRegistry = new Map<
  FeatureCategoryName,
  () => IntervalSettings
>();

/**
 * Registers a feature category descriptor, its default settings data, and its IntervalSettings factory.
 * @param categoryDescriptor - The descriptor for the category.
 * @param defaultSettingsData - The default settings data object for this category.
 * @param settingsFactory - A function that returns a new default IntervalSettings instance for this category.
 */
export function registerFeatureCategory(
  categoryDescriptor: FeatureCategoryDescriptor,
  defaultSettingsData: any,
  settingsFactory: () => IntervalSettings // Added factory parameter
): void {
  const categoryName = categoryDescriptor.categoryName;
  if (featureRegistry.has(categoryName)) {
    /* ... warning ... */
  }
  if (defaultCategorySettingsRegistry.has(categoryName)) {
    /* ... warning ... */
  }
  if (intervalSettingsFactoryRegistry.has(categoryName)) {
    console.warn(
      `IntervalSettings factory for FeatureCategory "${categoryName}" is already registered. Overwriting.`
    );
  }

  featureRegistry.set(categoryName, categoryDescriptor);
  defaultCategorySettingsRegistry.set(categoryName, defaultSettingsData);
  intervalSettingsFactoryRegistry.set(categoryName, settingsFactory); // Store the factory

  console.log(
    `Registered Feature Category: ${categoryName} with default settings and factory.`
  );
}

/**
 * Retrieves the descriptor for a specific feature category.
 * @param categoryName - The name of the category to retrieve.
 * @returns The descriptor or undefined if not found.
 */
export function getCategoryDescriptor(
  categoryName: FeatureCategoryName
): FeatureCategoryDescriptor | undefined {
  return featureRegistry.get(categoryName);
}

/**
 * Retrieves the descriptor for a specific feature type within a category.
 * @param categoryName - The category the feature type belongs to.
 * @param typeName - The name of the feature type within the category.
 * @returns The descriptor or undefined if not found.
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
 * @returns An array of all registered category descriptors.
 */
export function getAvailableCategories(): FeatureCategoryDescriptor[] {
  return Array.from(featureRegistry.values());
}

/**
 * Retrieves all available feature type descriptors for a given category.
 * @param categoryName - The category to get types from.
 * @returns An array of type descriptors, or empty if category not found.
 */
export function getAvailableFeatureTypes(
  categoryName: FeatureCategoryName
): FeatureTypeDescriptor[] {
  const category = featureRegistry.get(categoryName);
  return category ? Array.from(category.featureTypes.values()) : [];
}
/** Retrieves the default settings *data* for a specific category. */
export function getDefaultSettingsForCategory<T>(
  categoryName: FeatureCategoryName
): T | undefined {
  return defaultCategorySettingsRegistry.get(categoryName) as T | undefined;
}

/** Constructs a map containing the default settings *data* for all registered categories. */
export function getAllDefaultCategorySettings(): CategorySettingsMap {
  const defaults: CategorySettingsMap = {};
  for (const [
    categoryName,
    settings,
  ] of defaultCategorySettingsRegistry.entries()) {
    defaults[categoryName] = settings;
  }
  return defaults;
}

/**
 * Retrieves the factory function for creating a default IntervalSettings instance for a category.
 * @param categoryName - The name of the category.
 * @returns The factory function or undefined if not registered.
 */
export function getIntervalSettingsFactory(
  categoryName: FeatureCategoryName
): (() => IntervalSettings) | undefined {
  return intervalSettingsFactoryRegistry.get(categoryName);
}

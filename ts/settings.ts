// ts/settings.ts
import {
  getAllDefaultGlobalSettings, // Use new registry function
  getDefaultGlobalSettingsForCategory, // Use new registry function
} from "./feature_registry";
// --- FeatureCategoryName enum is removed ---

/** Defines the structure for category-specific settings (keyed by category name string). */
export interface CategorySettingsMap {
  [categoryName: string]: any; // Key is now string
}

/** Defines the structure for all application-level settings. */
export interface AppSettings {
  theme: "light" | "dark";
  warmupPeriod: number;
  categorySettings: CategorySettingsMap;
}

/** Initial default values for *global* settings (excluding category-specific ones). */
export const BASE_DEFAULT_SETTINGS: Omit<AppSettings, "categorySettings"> = {
  theme: "light",
  warmupPeriod: 0,
};

// --- Storage Constants --- (Remain the same)
export const SETTINGS_STORAGE_KEY = "categoryTimerAppSettings";
export const LAST_RUN_SCHEDULE_JSON_KEY = "lastRunScheduleJSON";
export const RECENT_SCHEDULES_JSON_KEY = "recentSchedulesJSON";
export const MAX_RECENT_SCHEDULES = 5;
// --- End Storage Constants ---

/** Loads settings from localStorage, merging with current defaults from the category registry. */
export function loadSettings(): AppSettings {
  let loadedSettings: AppSettings | null = null;
  // Get defaults from registry (now uses string keys internally)
  const currentDefaultsByCategory = getAllDefaultGlobalSettings();

  try {
    const storedSettingsJson = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettingsJson) {
      const parsedStored = JSON.parse(storedSettingsJson);

      // Start with a structure combining base defaults and registry category defaults
      loadedSettings = {
        ...BASE_DEFAULT_SETTINGS,
        // Deep copy defaults initially, using the map returned by the registry
        categorySettings: JSON.parse(JSON.stringify(currentDefaultsByCategory)),
      };

      // Merge stored global settings (theme, warmupPeriod)
      for (const key in BASE_DEFAULT_SETTINGS) {
        if (Object.prototype.hasOwnProperty.call(parsedStored, key)) {
          // Ensure type compatibility if needed, though basic types are likely fine
          (loadedSettings as any)[key] = parsedStored[key];
        }
      }

      // Deep merge stored category settings over the current defaults
      if (
        parsedStored.categorySettings &&
        typeof parsedStored.categorySettings === "object"
      ) {
        // Iterate over KNOWN categories from the registry's defaults
        for (const categoryKey in currentDefaultsByCategory) {
          if (
            Object.prototype.hasOwnProperty.call(
              parsedStored.categorySettings,
              categoryKey // Check if stored settings contain this category key (string)
            ) &&
            typeof parsedStored.categorySettings[categoryKey] === "object" // Ensure it's an object
          ) {
            // Merge stored settings for this category onto the defaults
            // Ensure the target exists before merging
            if (!loadedSettings.categorySettings[categoryKey]) {
              loadedSettings.categorySettings[categoryKey] = {}; // Initialize if missing
            }
            // Merge: Start with current defaults for the category, overlay stored values
            loadedSettings.categorySettings[categoryKey] = {
              ...(currentDefaultsByCategory[categoryKey] ?? {}), // Start with current defaults
              ...(parsedStored.categorySettings[categoryKey] ?? {}), // Merge stored values
            };
          }
          // If a category exists in defaults but not in storage, it keeps the defaults.
          // Categories present only in storage are ignored (prevents orphaned settings).
        }
      }
      console.log("Successfully loaded and merged settings from localStorage.");
    }
  } catch (e) {
    console.error("Failed to load or parse settings from localStorage:", e);
    loadedSettings = null; // Ensure we fall back to full defaults
  }

  // If loading failed or no stored settings, return full defaults
  if (!loadedSettings) {
    console.log("Using default settings (no valid stored settings found).");
    loadedSettings = {
      ...BASE_DEFAULT_SETTINGS,
      // Use a fresh copy of defaults from the registry
      categorySettings: JSON.parse(JSON.stringify(currentDefaultsByCategory)),
    };
  }

  return loadedSettings;
}

/**
 * Helper function to safely get category-specific global settings for a given category name.
 * Merges stored settings over registered defaults.
 * @param settings - The current AppSettings object.
 * @param categoryName - The string name of the category (e.g., "Guitar").
 * @returns The merged settings object for the category.
 */
export function getCategorySettings<T>(
  settings: AppSettings,
  categoryName: string // **** CHANGED: Use string name ****
): T {
  // Get the registered defaults for this category name from the registry
  const defaults =
    getDefaultGlobalSettingsForCategory<T>(categoryName) ?? ({} as T);

  // Get the currently stored settings for this category name
  const storedCategorySettings =
    settings.categorySettings?.[categoryName] ?? {};

  // Merge: Start with defaults, overlay stored settings
  // Use a deep copy if settings might be nested, otherwise shallow is fine
  // return JSON.parse(JSON.stringify({ ...defaults, ...storedCategorySettings }));
  return { ...defaults, ...storedCategorySettings }; // Shallow merge assuming flat settings objects
}

// ts/settings.ts
import {
  getAllDefaultGlobalSettings, // Use new registry function
  getDefaultGlobalSettingsForCategory, // Use new registry function
} from "./feature_registry";
import { PracticeSettings, DEFAULT_PRACTICE_SETTINGS } from "./practice_settings";
import { ReferenceSettings, DEFAULT_REFERENCE_SETTINGS } from "./reference_settings";
import { Theme } from "./theme_manager";

// --- FeatureCategoryName enum is removed ---

/** Defines the structure for category-specific settings (keyed by category name string). */
export interface CategorySettingsMap {
  [categoryName: string]: any; // Key is now string
}

/** Defines the structure for all application-level settings. */
export interface AppSettings {
  theme: Theme;
  practice: PracticeSettings;
  reference: ReferenceSettings;
  categorySettings: CategorySettingsMap;
}

/** Initial default values for *global* settings (excluding category-specific ones). */
export const BASE_DEFAULT_SETTINGS: Omit<AppSettings, "categorySettings"> = {
  theme: Theme.WARM,
  practice: DEFAULT_PRACTICE_SETTINGS,
  reference: DEFAULT_REFERENCE_SETTINGS,
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
  const currentDefaultsByCategory = getAllDefaultGlobalSettings();

  try {
    const storedSettingsJson = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettingsJson) {
      const parsedStored = JSON.parse(storedSettingsJson);

      // Start with a deep copy of the full default structure
      loadedSettings = {
        ...JSON.parse(JSON.stringify(BASE_DEFAULT_SETTINGS)),
        categorySettings: JSON.parse(JSON.stringify(currentDefaultsByCategory)),
      };

      // Merge top-level settings (theme); migrate old "light" value to "warm"
      if (parsedStored.theme) {
        loadedSettings.theme = parsedStored.theme;
      }

      // Merge nested page-specific settings
      if (parsedStored.practice) {
        loadedSettings.practice = { ...loadedSettings.practice, ...parsedStored.practice };
      }
      if (parsedStored.reference) {
        loadedSettings.reference = { ...loadedSettings.reference, ...parsedStored.reference };
      }

      // Deep merge stored category settings over the current defaults
      if (
        parsedStored.categorySettings &&
        typeof parsedStored.categorySettings === "object"
      ) {
        for (const categoryKey in currentDefaultsByCategory) {
          if (
            Object.prototype.hasOwnProperty.call(
              parsedStored.categorySettings,
              categoryKey
            ) &&
            typeof parsedStored.categorySettings[categoryKey] === "object"
          ) {
            if (!loadedSettings.categorySettings[categoryKey]) {
              loadedSettings.categorySettings[categoryKey] = {};
            }
            loadedSettings.categorySettings[categoryKey] = {
              ...(currentDefaultsByCategory[categoryKey] ?? {}),
              ...(parsedStored.categorySettings[categoryKey] ?? {}),
            };
          }
        }
      }
      console.log("Successfully loaded and merged settings from localStorage.");
    }
  } catch (e) {
    console.error("Failed to load or parse settings from localStorage:", e);
    loadedSettings = null;
  }

  if (!loadedSettings) {
    console.log("Using default settings (no valid stored settings found).");
    loadedSettings = {
      ...JSON.parse(JSON.stringify(BASE_DEFAULT_SETTINGS)),
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

// ts/settings.ts
import {
  getAllDefaultCategorySettings,
  getDefaultSettingsForCategory,
} from "./feature_registry";
import { FeatureCategoryName } from "./feature"; // Import enum for key type safety if desired

/** Defines the structure for category-specific settings. */
export interface CategorySettingsMap {
  [key: string]: any;
}

/** Defines the structure for all application-level settings. */
export interface AppSettings {
  theme: "light" | "dark";
  warmupPeriod: number;
  categorySettings: CategorySettingsMap;
}

/** Initial default values for *global* settings. */
export const BASE_DEFAULT_SETTINGS: Omit<AppSettings, "categorySettings"> = {
  theme: "light",
  warmupPeriod: 0,
};

// --- Storage Constants ---
/** Storage key for application settings in localStorage. */
export const SETTINGS_STORAGE_KEY = "categoryTimerAppSettings";
/** Storage key for the last successfully run schedule JSON string. */
export const LAST_RUN_SCHEDULE_JSON_KEY = "lastRunScheduleJSON";
/** Storage key for the array of recent schedule JSON strings. */
export const RECENT_SCHEDULES_JSON_KEY = "recentSchedulesJSON";
/** Maximum number of recent schedules to store. */
export const MAX_RECENT_SCHEDULES = 5;
// --- End Storage Constants ---

/** Loads settings from localStorage, merging with current defaults from the registry. */
export function loadSettings(): AppSettings {
  let loadedSettings: AppSettings | null = null;
  const currentDefaults = getAllDefaultCategorySettings(); // Get defaults from registry

  try {
    const storedSettingsJson = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettingsJson) {
      const parsedStored = JSON.parse(storedSettingsJson);

      // Start with a structure combining base defaults and registry category defaults
      loadedSettings = {
        ...BASE_DEFAULT_SETTINGS,
        categorySettings: { ...currentDefaults }, // Deep copy defaults initially
      };

      // Merge stored global settings
      for (const key in BASE_DEFAULT_SETTINGS) {
        if (Object.prototype.hasOwnProperty.call(parsedStored, key)) {
          (loadedSettings as any)[key] = parsedStored[key];
        }
      }

      // Deep merge stored category settings over the current defaults
      if (
        parsedStored.categorySettings &&
        typeof parsedStored.categorySettings === "object"
      ) {
        for (const categoryKey in currentDefaults) {
          // Iterate over known categories from registry
          if (
            Object.prototype.hasOwnProperty.call(
              parsedStored.categorySettings,
              categoryKey
            )
          ) {
            // Merge stored settings for this category onto the defaults
            loadedSettings.categorySettings[categoryKey] = {
              ...currentDefaults[categoryKey], // Start with current defaults
              ...(parsedStored.categorySettings[categoryKey] ?? {}), // Merge stored values
            };
          }
        }
        // Discard unknown categories found in storage to keep settings clean.
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
      categorySettings: { ...currentDefaults }, // Use a fresh copy of defaults
    };
  }

  return loadedSettings;
}

/** Helper function to safely get category-specific settings for a given category key. */
export function getCategorySettings<T>(
  settings: AppSettings,
  categoryKey: FeatureCategoryName
): T {
  // Get the registered defaults for this category
  const defaults = getDefaultSettingsForCategory<T>(categoryKey) ?? ({} as T);
  // Get the currently stored settings for this category
  const storedCategorySettings = settings.categorySettings?.[categoryKey] ?? {};
  // Merge: Start with defaults, overlay stored settings
  return { ...defaults, ...storedCategorySettings };
}

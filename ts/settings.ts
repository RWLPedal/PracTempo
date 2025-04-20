import { TuningName } from "./guitar/fretboard";

/** Defines the settings specifically for the Guitar feature category. */
export interface GuitarSettings {
  handedness: "right" | "left";
  tuning: TuningName; // Use the type alias for tuning names
}

/** Defines the structure for all application-level settings. */
export interface AppSettings {
  theme: "light" | "dark";
  warmupPeriod: number; // Overall warmup period in seconds
  // intervalGap: number; // TODO: Future enhancement - Time between intervals (requires timer logic changes)
  guitarSettings: GuitarSettings;
  // Add settings for other future categories here
}

/** Default values for all application settings. */
export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  warmupPeriod: 0, // Defaulting to 0 seconds warmup
  // intervalGap: 0, // Default to 0 seconds between intervals
  guitarSettings: {
    handedness: "right", // Default to right-handed diagrams
    tuning: "Standard", // Default to Standard tuning
  },
};

/** Storage key for localStorage. */
export const SETTINGS_STORAGE_KEY = "guitarTimerAppSettings";

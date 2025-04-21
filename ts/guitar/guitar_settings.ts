import { TuningName } from "./fretboard";
import { FretboardColorScheme } from "./colors";

/** Defines the settings specifically for the Guitar category. */
export interface GuitarSettings {
  handedness: "right" | "left";
  tuning: TuningName;
  colorScheme: FretboardColorScheme;
}

/** Default values for Guitar settings. */
export const DEFAULT_GUITAR_SETTINGS: GuitarSettings = {
  handedness: "right",
  tuning: "Standard",
  colorScheme: "default",
};

/**
 * Storage key for guitar-specific settings within AppSettings' categorySettings map.
 * Uses the string name of the category.
 */
export const GUITAR_SETTINGS_KEY = "Guitar";
// ts/guitar/guitar_settings.ts
import { TuningName } from "./fretboard";
import { FretboardColorScheme } from "./colors";
import { FeatureCategoryName } from "../feature"; // Import the enum

/** Defines the settings specifically for the Guitar feature category. */
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
 * Use the FeatureCategoryName enum value for consistency.
 */
export const GUITAR_SETTINGS_KEY = FeatureCategoryName.Guitar; // Use the enum value
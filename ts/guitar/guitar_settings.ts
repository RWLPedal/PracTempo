import { TuningName } from "./fretboard";
import { FretboardColorScheme, INTERVAL_COLORS } from './colors';

/** Defines the settings specifically for the Guitar category. */
export interface GuitarSettings {
  handedness: "right" | "left";
  orientation: "vertical" | "horizontal";
  tuning: TuningName;
  colorScheme: FretboardColorScheme;
  /** Per-instance zoom scale multiplier (1.0 = default, >1.0 = zoomed). */
  zoomMultiplier?: number;
}

/** Default values for Guitar settings. */
export const DEFAULT_GUITAR_SETTINGS: GuitarSettings = {
  handedness: "right",
  orientation: "vertical",
  tuning: "Standard",
  colorScheme: "interval",
};

/**
 * Storage key for guitar-specific settings within AppSettings' categorySettings map.
 * Uses the string name of the category.
 */
export const GUITAR_SETTINGS_KEY = "Guitar";
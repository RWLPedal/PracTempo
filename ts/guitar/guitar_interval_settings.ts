/**
 * Defines settings specific to a guitar feature within a single interval.
 */

// Interface defining the structure for JSON representation
export interface GuitarIntervalSettingsJSON {
  metronomeBpm?: number;
  // Add other potential interval-specific settings here
}

export class GuitarIntervalSettings {
  public metronomeBpm: number;

  // Default settings for a guitar interval
  private static readonly DEFAULT_METRONOME_BPM = 0; // Default to OFF unless overridden

  constructor(metronomeBpm?: number) {
    // Use provided BPM if valid, otherwise default
    this.metronomeBpm =
      metronomeBpm !== undefined && metronomeBpm >= 0
        ? metronomeBpm
        : GuitarIntervalSettings.DEFAULT_METRONOME_BPM;
  }

  /**
   * Creates a GuitarIntervalSettings instance from a JSON object.
   * @param json - The JSON object (or undefined).
   * @returns A new GuitarIntervalSettings instance.
   */
  public static fromJSON(
    json: GuitarIntervalSettingsJSON | undefined | null
  ): GuitarIntervalSettings {
    // Create instance with defaults
    const settings = new GuitarIntervalSettings();
    if (json) {
      // Apply valid values from JSON
      if (json.metronomeBpm !== undefined && json.metronomeBpm >= 0) {
        settings.metronomeBpm = json.metronomeBpm;
      } else if (json.metronomeBpm !== undefined) {
        console.warn(
          `Invalid metronomeBpm value in JSON (${json.metronomeBpm}), using default.`
        );
      }
      // Add logic for other settings here if they exist
    }
    return settings;
  }

  /**
   * Serializes the settings into a JSON object suitable for `JSON.stringify`.
   * Only includes non-default values.
   * @returns A JSON object or undefined if all settings are default.
   */
  public toJSON(): GuitarIntervalSettingsJSON | undefined {
    if (this.isDefault()) {
      return undefined; // Don't include settings object if it's all default
    }

    const json: GuitarIntervalSettingsJSON = {};
    if (this.metronomeBpm !== GuitarIntervalSettings.DEFAULT_METRONOME_BPM) {
      json.metronomeBpm = this.metronomeBpm;
    }
    // Add other non-default settings here

    // Check if any non-default values were actually added
    return Object.keys(json).length > 0 ? json : undefined;
  }

  /** Returns true if the settings are default (currently just checks BPM). */
  public isDefault(): boolean {
    return this.metronomeBpm === GuitarIntervalSettings.DEFAULT_METRONOME_BPM;
    // Add checks for other settings here: && this.otherSetting === DEFAULT_OTHER ...
  }
}

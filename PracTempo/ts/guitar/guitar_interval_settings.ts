/**
 * Defines settings specific to a guitar feature within a single interval.
 */
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
   * Serializes the settings into a string format for storage/text view.
   * Example: "@BPM:80" or "@BPM:0"
   * Returns empty string if settings are default (BPM=0).
   */
  public toString(): string {
    if (this.metronomeBpm > 0) {
      return `@BPM:${this.metronomeBpm}`;
    }
    // Return empty string if BPM is 0 (or default) to keep text config clean
    return "";
  }

  /**
   * Parses settings from a serialized string.
   * @param settingsString - The string (e.g., "@BPM:80").
   * @returns A new GuitarIntervalSettings instance.
   */
  public static fromString(
    settingsString: string | undefined | null
  ): GuitarIntervalSettings {
    const settings = new GuitarIntervalSettings(); // Start with defaults

    if (settingsString && settingsString.startsWith("@")) {
      const parts = settingsString.substring(1).split(":"); // Remove '@' and split
      if (parts.length === 2 && parts[0].toUpperCase() === "BPM") {
        const bpmVal = parseInt(parts[1], 10);
        if (!isNaN(bpmVal) && bpmVal >= 0) {
          settings.metronomeBpm = bpmVal;
        } else {
          console.warn(
            `Invalid BPM value in settings string: "${settingsString}"`
          );
        }
      } else {
        console.warn(
          `Unrecognized settings string format: "${settingsString}"`
        );
      }
    }
    return settings;
  }

  /** Returns true if the settings are default (currently just checks BPM). */
  public isDefault(): boolean {
    return this.metronomeBpm === GuitarIntervalSettings.DEFAULT_METRONOME_BPM;
  }
}

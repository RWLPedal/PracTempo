/* ts/schedule/editor/schedule_builder.ts */

import { Schedule, Interval } from "../schedule";
import { DisplayController } from "../../display_controller";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import { Feature, FeatureCategoryName } from "../../feature"; // Import Feature
import { getFeatureTypeDescriptor } from "../../feature_registry";
import { parseDurationString } from "../../guitar/guitar_utils"; // Assuming this utility exists and works
import { GuitarIntervalSettings } from "../../guitar/guitar_interval_settings"; // Import class for instantiation
import { ErrorDisplay } from "./error_display";
import { ScheduleRowJSONData, GroupDataJSON, IntervalDataJSON } from "./interval/types";
import { RowManager } from "./row_manager"; // Import RowManager and JSON data types

export class ScheduleBuilder {
  private rowManager: RowManager;
  private errorDisplay: ErrorDisplay;
  private configEntriesContainerEl: HTMLElement;

  constructor(
    rowManager: RowManager,
    errorDisplay: ErrorDisplay,
    configEntriesContainerEl: HTMLElement
  ) {
    this.rowManager = rowManager;
    this.errorDisplay = errorDisplay;
    this.configEntriesContainerEl = configEntriesContainerEl;
  }

  /**
   * Builds the Schedule object from the current state of the config editor UI rows.
   * @param displayController - The display controller instance.
   * @param audioController - The audio controller instance.
   * @param settings - The global application settings.
   * @param maxCanvasHeight - The maximum height constraint for feature canvases. // Add parameter
   * @returns A new Schedule instance or null if errors occur.
   */
  public buildSchedule(
    displayController: DisplayController,
    audioController: AudioController,
    settings: AppSettings,
    maxCanvasHeight: number
  ): Schedule | null {
    console.log("[ScheduleBuilder] Starting buildSchedule..."); // Log start
    this.errorDisplay.removeMessage();
    const schedule = new Schedule(displayController, audioController);
    const rows = this.configEntriesContainerEl.querySelectorAll<HTMLElement>(
      ".schedule-row"
    );
    let hasErrors = false;
    let totalDurationSeconds = 0;
    const MAX_TOTAL_DURATION_SECONDS = 3 * 60 * 60;

    rows.forEach((rowElement, index) => {
      if (hasErrors) return;
      const rowData = this.rowManager.getRowData(rowElement);
      if (!rowData) {
        console.warn(`[ScheduleBuilder] Skipping row ${index + 1} due to data extraction error.`);
        return;
      }

      if (rowData.rowType === "interval") {
        const intervalData = rowData as IntervalDataJSON;
        console.log(`[ScheduleBuilder] Processing interval ${index + 1}: Type='${intervalData.featureTypeName || "None"}', Task='${intervalData.task}', Duration='${intervalData.duration}'`); // Log interval details
        let durationSeconds = 0;
        let feature: Feature | null = null;

        try {
          // 1. Parse Duration
          durationSeconds = parseDurationString(intervalData.duration);
          if (durationSeconds < 0) throw new Error("Duration cannot be negative.");
          totalDurationSeconds += durationSeconds;
          if (totalDurationSeconds > MAX_TOTAL_DURATION_SECONDS) {
            throw new Error(`Total schedule duration exceeds maximum limit (${MAX_TOTAL_DURATION_SECONDS / 3600} hours).`);
          }

          // 2. Instantiate Interval Settings
          const intervalSettings = GuitarIntervalSettings.fromJSON(intervalData.intervalSettings);

          // 3. Create Feature if specified
          if (intervalData.featureTypeName) {
            console.log(`[ScheduleBuilder] Attempting to find descriptor for: '${intervalData.featureTypeName}'`); // Log lookup attempt
            const descriptor = getFeatureTypeDescriptor(
              FeatureCategoryName.Guitar, // Assuming Guitar category
              intervalData.featureTypeName
            );
            if (!descriptor) {
              // Log error if descriptor not found
              console.error(`[ScheduleBuilder] Unknown feature type descriptor: "${intervalData.featureTypeName}"`);
              throw new Error(`Unknown feature type: "${intervalData.featureTypeName}"`);
            }
            console.log(`[ScheduleBuilder] Found descriptor for '${descriptor.typeName}'. Attempting createFeature...`); // Log success
            // Call createFeature with maxCanvasHeight
            feature = descriptor.createFeature(
              intervalData.featureArgsList,
              audioController,
              settings,
              intervalSettings.metronomeBpm,
              maxCanvasHeight // Pass the height constraint
            );
             console.log(`[ScheduleBuilder] Successfully created feature instance for '${descriptor.typeName}'.`); // Log creation success
          } else {
            console.log(`[ScheduleBuilder] No feature specified for interval ${index + 1}.`);
          }

          // 4. Create Interval and add to Schedule
          const interval = new Interval(
            durationSeconds,
            settings.warmupPeriod,
            intervalData.task || intervalData.featureTypeName || "Interval",
            feature // Add the created feature (or null)
          );
          schedule.addInterval(interval);
          console.log(`[ScheduleBuilder] Added interval ${index + 1} to schedule.`);

        } catch (error: any) {
          // Log detailed error during interval processing
          const errorMessage = `[ScheduleBuilder] Error processing interval ${index + 1} (${intervalData.task || intervalData.featureTypeName || intervalData.duration}): ${error.message}`;
          console.error(errorMessage, error);
          this.errorDisplay.showMessage(errorMessage);
          hasErrors = true;
        }
      } else if (rowData.rowType === "group") {
        console.log(`[ScheduleBuilder] Skipping group row ${index + 1}: '${(rowData as GroupDataJSON).name}'`);
      }
    });

    if (hasErrors) {
      console.error("[ScheduleBuilder] Schedule building failed due to errors.");
      return null;
    }

    console.log(`[ScheduleBuilder] Schedule built successfully with ${schedule.intervals.length} intervals.`);
    return schedule;
  }
}

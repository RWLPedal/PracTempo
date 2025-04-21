/* ts/schedule/editor/schedule_builder.ts */

import { Schedule, Interval } from "../schedule";
import { DisplayController } from "../../display_controller";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import {
  Feature,
  FeatureCategoryName,
  FeatureTypeDescriptor,
} from "../../feature"; // Import FeatureTypeDescriptor
import { getFeatureTypeDescriptor } from "../../feature_registry";
import { parseDurationString } from "../../guitar/guitar_utils";
// Import specific interval settings class needed for instantiation
import { GuitarIntervalSettings } from "../../guitar/guitar_interval_settings";
import { ErrorDisplay } from "./error_display";
import {
  ScheduleRowJSONData,
  GroupDataJSON,
  IntervalDataJSON,
  IntervalSettings,
} from "./interval/types"; // Import IntervalSettings base
import { RowManager } from "./row_manager";

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
   * @returns A new Schedule instance or null if errors occur.
   */
  public buildSchedule(
    displayController: DisplayController,
    audioController: AudioController,
    settings: AppSettings,
    maxCanvasHeight: number
  ): Schedule | null {
    console.log("[ScheduleBuilder] Starting buildSchedule...");
    this.errorDisplay.removeMessage();
    const schedule = new Schedule(displayController, audioController);
    const rows =
      this.configEntriesContainerEl.querySelectorAll<HTMLElement>(
        ".schedule-row"
      );
    let hasErrors = false;
    let totalDurationSeconds = 0;
    const MAX_TOTAL_DURATION_SECONDS = 3 * 60 * 60;

    rows.forEach((rowElement, index) => {
      if (hasErrors) return;
      const rowData = this.rowManager.getRowData(rowElement);
      if (!rowData) {
        console.warn(
          `[ScheduleBuilder] Skipping row ${
            index + 1
          } due to data extraction error.`
        );
        return;
      }

      if (rowData.rowType === "interval") {
        const intervalData = rowData as IntervalDataJSON;
        console.log(
          `[ScheduleBuilder] Processing interval ${index + 1}: Cat='${
            intervalData.featureCategoryName
          }', Type='${intervalData.featureTypeName || "None"}', Task='${
            intervalData.task
          }', Duration='${intervalData.duration}'`
        );
        let durationSeconds = 0;
        let feature: Feature | null = null;
        let intervalSettings: IntervalSettings | null = null; // Use base type initially

        try {
          // 1. Parse Duration
          durationSeconds = parseDurationString(intervalData.duration);
          if (durationSeconds < 0)
            throw new Error("Duration cannot be negative.");
          totalDurationSeconds += durationSeconds;
          if (totalDurationSeconds > MAX_TOTAL_DURATION_SECONDS) {
            throw new Error(
              `Total schedule duration exceeds maximum limit (${
                MAX_TOTAL_DURATION_SECONDS / 3600
              } hours).`
            );
          }

          // 2. Instantiate Interval Settings (Specific to Category if possible)
          // TODO: Need a more robust way to get the correct settings class based on category
          // For now, assuming Guitar category uses GuitarIntervalSettings
          if (intervalData.featureCategoryName === FeatureCategoryName.Guitar) {
            intervalSettings = GuitarIntervalSettings.fromJSON(
              intervalData.intervalSettings
            );
          } else {
            // Handle other categories or provide a generic fallback if needed
            console.warn(
              `[ScheduleBuilder] Interval settings parsing not implemented for category: ${intervalData.featureCategoryName}. Using raw data.`
            );
            // In a truly generic system, you might have a registry mapping categoryName to settings classes/parsers
            intervalSettings =
              (intervalData.intervalSettings as IntervalSettings) ?? {
                toJSON: () => ({}),
              }; // Basic fallback
          }

          // 3. Create Feature if specified
          if (
            intervalData.featureTypeName &&
            intervalData.featureCategoryName
          ) {
            const descriptor = getFeatureTypeDescriptor(
              intervalData.featureCategoryName, // Use category from data
              intervalData.featureTypeName
            );
            if (!descriptor) {
              throw new Error(
                `Unknown feature type: "${intervalData.featureTypeName}" in category "${intervalData.featureCategoryName}"`
              );
            }
            console.log(
              `[ScheduleBuilder] Found descriptor for '${descriptor.typeName}'. Attempting createFeature...`
            );

            // --- Call createFeature with intervalSettings object --- <<<< CHANGED
            // Ensure the settings object passed matches the type expected by the feature's constructor
            // (e.g., GuitarFeature expects GuitarIntervalSettings)
            // This might require casting or ensuring the correct type was instantiated above.
            // We assume here intervalSettings is the correct type based on the category check above.
            if (intervalSettings) {
              feature = descriptor.createFeature(
                intervalData.featureArgsList,
                audioController,
                settings,
                intervalSettings as any, // Pass the full settings object (cast needed if types don't align perfectly)
                maxCanvasHeight
              );
              console.log(
                `[ScheduleBuilder] Successfully created feature instance for '${descriptor.typeName}'.`
              );
            } else {
              throw new Error(
                `Could not create feature "${descriptor.typeName}" due to missing interval settings.`
              );
            }
          } else {
            console.log(
              `[ScheduleBuilder] No feature specified for interval ${
                index + 1
              }.`
            );
          }

          // 4. Create Interval and add to Schedule
          const interval = new Interval(
            durationSeconds,
            settings.warmupPeriod,
            intervalData.task || intervalData.featureTypeName || "Interval",
            feature
          );
          schedule.addInterval(interval);
          console.log(
            `[ScheduleBuilder] Added interval ${index + 1} to schedule.`
          );
        } catch (error: any) {
          const errorMessage = `[ScheduleBuilder] Error processing interval ${
            index + 1
          } (${
            intervalData.task ||
            intervalData.featureTypeName ||
            intervalData.duration
          }): ${error.message}`;
          console.error(errorMessage, error);
          this.errorDisplay.showMessage(errorMessage);
          hasErrors = true;
        }
      } else if (rowData.rowType === "group") {
        console.log(
          `[ScheduleBuilder] Skipping group row ${index + 1}: '${
            (rowData as GroupDataJSON).name
          }'`
        );
      }
    });

    if (hasErrors) {
      console.error(
        "[ScheduleBuilder] Schedule building failed due to errors."
      );
      return null;
    }

    console.log(
      `[ScheduleBuilder] Schedule built successfully with ${schedule.intervals.length} intervals.`
    );
    return schedule;
  }
}

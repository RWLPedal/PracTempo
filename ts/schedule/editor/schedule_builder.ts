import { DisplayController } from "../../display_controller";
import { AudioController } from "../../audio_controller";
import { AppSettings } from "../../settings";
import { Schedule, Interval } from "../schedule";
import { Feature, FeatureCategoryName } from "../../feature";
import { getFeatureTypeDescriptor } from "../../feature_registry";
import { RowManager } from "./row_manager";
import { ErrorDisplay } from "./error_display";

export class ScheduleBuilder {
  private rowManager: RowManager;
  private errorDisplay: ErrorDisplay;
  private configEntriesContainerEl: HTMLElement; // Direct access needed to query rows

  constructor(
    rowManager: RowManager,
    errorDisplay: ErrorDisplay,
    configEntriesContainerEl: HTMLElement
  ) {
    this.rowManager = rowManager;
    this.errorDisplay = errorDisplay;
    this.configEntriesContainerEl = configEntriesContainerEl;
  }

  public buildSchedule(
    displayController: DisplayController,
    audioController: AudioController,
    settings: AppSettings
  ): Schedule | null {
    console.log(`Building schedule from Config editor UI...`);
    this.errorDisplay.removeMessage(); // Clear previous errors

    const schedule = new Schedule(displayController, audioController);
    const introTime = settings?.warmupPeriod ?? 0;
    let hasError = false;

    // Get all interval rows directly from the container
    const intervalRows =
      this.configEntriesContainerEl.querySelectorAll<HTMLElement>(
        ".config-entry-row"
      );

    intervalRows.forEach((rowElement, index) => {
      if (hasError) return; // Stop processing if an error occurred

      const rowData = this.rowManager.getRowData(rowElement);

      // Ensure it's interval data and not null
      if (!rowData || rowData.rowType !== "interval") {
        // This shouldn't happen if querySelector is correct, but good practice
        console.warn(
          `Skipping row ${index + 1} as it's not valid interval data.`
        );
        return;
      }

      const {
        duration,
        task,
        featureTypeName,
        featureArgsList,
        intervalSettings,
      } = rowData;
      const seconds = this._getTotalSeconds(duration);

      // Validate duration
      if (seconds <= 0) {
        // Only error if there's other content suggesting it should be a valid interval
        if (
          task ||
          featureTypeName ||
          featureArgsList.some((a) => a !== "") ||
          !intervalSettings.isDefault()
        ) {
          this.errorDisplay.showMessage(
            `Error in interval ${index + 1} ('${
              task || "Untitled"
            }'): Duration must be greater than 0 seconds.`
          );
          hasError = true;
        } else {
          // Skip completely empty rows with zero duration silently
          console.log(
            `Skipping interval row ${
              index + 1
            } due to zero duration and no other content.`
          );
        }
        return; // Skip this row
      }

      const effectiveTaskName = task || `Interval ${index + 1}`;
      let feature: Feature | null = null;

      // Create feature if specified
      if (featureTypeName) {
        // Assuming Guitar category for now, might need dynamic category lookup later
        const descriptor = getFeatureTypeDescriptor(
          FeatureCategoryName.Guitar,
          featureTypeName
        );
        if (descriptor) {
          try {
            // Pass the specific BPM override from this interval's settings
            feature = descriptor.createFeature(
              featureArgsList,
              audioController,
              settings,
              intervalSettings.metronomeBpm // Pass BPM override
            );
          } catch (e: any) {
            this.errorDisplay.showMessage(
              `Error creating feature '${featureTypeName}' for interval ${
                index + 1
              }: ${e.message}`
            );
            hasError = true;
            return; // Stop processing this row
          }
        } else {
          this.errorDisplay.showMessage(
            `Error in interval ${
              index + 1
            }: Unknown feature type '${featureTypeName}'.`
          );
          hasError = true;
          return; // Stop processing this row
        }
      }

      // Add interval to schedule if no errors occurred for this row
      if (!hasError) {
        schedule.addInterval(
          new Interval(seconds, introTime, effectiveTaskName, feature)
        );
      }
    }); // End forEach intervalRow

    // Final checks after processing all rows
    if (hasError) {
      console.error("Errors found while building schedule. Returning null.");
      return null;
    }

    if (schedule.intervals.length === 0 && intervalRows.length > 0) {
      // Warn if UI had rows but none were valid intervals
      this.errorDisplay.showMessage(
        `No valid intervals found. Check durations or add content.`,
        "warning"
      );
    } else if (schedule.intervals.length === 0) {
      // Log if the UI was genuinely empty
      console.warn("No intervals defined. Schedule will be empty.");
    }

    console.log("Schedule built successfully:", schedule);
    return schedule;
  }

  // Utility to convert time string to seconds
  private _getTotalSeconds(input: string): number {
    if (!input) return 0;
    const parts = input.split(":");
    let seconds = 0;
    let multiplier = 1;
    for (let i = parts.length - 1; i >= 0; i--) {
      const partValue = Number(parts[i]);
      if (!isNaN(partValue) && partValue >= 0) {
        seconds += partValue * multiplier;
      } else {
        // Treat invalid format as 0 seconds
        return 0;
      }
      multiplier *= 60;
    }
    return seconds;
  }
}

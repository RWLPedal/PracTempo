import { GuitarIntervalSettings } from "../../guitar/guitar_interval_settings";
import { IntervalRowData, GroupRowData, ScheduleRowData } from "./interval_row";
import { FeatureCategoryName } from "../../feature";
import { getFeatureTypeDescriptor } from "../../feature_registry";

// Regex: Capture Duration(1), Task(2), FeatureType(3), and the Rest(4)
const intervalRegExText =
  /^([0-9:]+)(?:,\s*([^,@#][^,]*)?)?(?:,\s*([^,@#][^,]*)?)?(?:,(.*))?$/;

// Regex for Groups: Captures '#' level and name (remains the same)
const groupRegExText = /^(#+)\s*(.*)$/;

/**
 * Parses the raw schedule text into an array of structured row data (intervals and groups).
 *
 * @param scheduleText - The text content from the schedule text area.
 * @returns An array of ScheduleRowData objects.
 */
export function parseScheduleText(scheduleText: string): ScheduleRowData[] {
  const rowDataArray: ScheduleRowData[] = [];
  const lines = scheduleText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  lines.forEach((line) => {
    const groupMatch = line.match(groupRegExText);
    const intervalMatch = line.match(intervalRegExText);

    if (groupMatch) {
      const level = groupMatch[1].length;
      const name = groupMatch[2].trim();
      const groupData: GroupRowData = {
        rowType: "group",
        level: level,
        name: name || `Group Level ${level}`,
      };
      rowDataArray.push(groupData);
    } else if (intervalMatch) {
      const duration = intervalMatch[1]?.trim() || "0:00";
      const task = intervalMatch[2]?.trim() || "";
      const featureTypeName = intervalMatch[3]?.trim() || "";
      let featureArgsList: string[] = [];
      let intervalSettings = new GuitarIntervalSettings(); // Default settings

      let remainingArgsAndSettings = intervalMatch[4]?.trim() || "";

      // Regex to find the settings string at the end
      const settingsRegex = /(?:,\s*(@BPM:\d+))$/; // Look for settings preceded by comma/space at the end
      const settingsMatch = remainingArgsAndSettings.match(settingsRegex);

      let argsRaw = remainingArgsAndSettings; // Assume all is args initially

      if (settingsMatch && settingsMatch[1]) {
        const settingsString = settingsMatch[1].trim();
        intervalSettings = GuitarIntervalSettings.fromString(settingsString);
        // Remove the matched settings part (including the preceding comma/space) from argsRaw
        argsRaw = remainingArgsAndSettings
          .substring(0, settingsMatch.index)
          .trim();
      } else {
        // Check if the *entire* remaining string is just the settings (e.g., "1:00, @BPM:100")
        const standaloneSettingsMatch =
          remainingArgsAndSettings.match(/^(@BPM:\d+)$/);
        if (standaloneSettingsMatch && standaloneSettingsMatch[1]) {
          intervalSettings = GuitarIntervalSettings.fromString(
            standaloneSettingsMatch[1]
          );
          argsRaw = ""; // No arguments if only settings were present after feature type
        }
      }

      if (argsRaw) {
        // Basic split, trim, filter empty. Doesn't handle quoted commas yet.
        // TODO: Improve splitting if args can contain quoted commas (e.g., "arg1, \"arg,2\", arg3")
        featureArgsList = argsRaw
          .split(",")
          .map((a) => a.trim())
          .filter((a) => a);
      }

      const intervalData: IntervalRowData = {
        rowType: "interval",
        duration,
        task,
        featureTypeName,
        featureArgsList,
        intervalSettings,
      };
      rowDataArray.push(intervalData);
    } else {
      console.warn(
        `ConfigParser: Skipping schedule line due to unrecognized format: ${line}`
      );
    }
  });

  return rowDataArray;
}

/**
 * Generates the schedule text string from the current config editor rows (intervals and groups).
 *
 * @param rowsContainer - The HTML element containing the .schedule-row elements.
 * @returns The generated schedule text string.
 */
export function generateScheduleText(rowsContainer: HTMLElement): string {
  let scheduleText = "";
  // Select all row types
  const rows = rowsContainer.querySelectorAll<HTMLElement>(".schedule-row");

  rows.forEach((row) => {
    const rowType = row.dataset.rowType;

    if (rowType === "group") {
      const level = parseInt(row.dataset.level || "1", 10);
      const name =
        (
          row.querySelector(".group-name-input") as HTMLInputElement
        )?.value.trim() || "";
      const hashes = "#".repeat(level);
      scheduleText += `${hashes} ${name}\n`;
    } else if (rowType === "interval") {
      const duration =
        (
          row.querySelector(".config-duration") as HTMLInputElement
        )?.value.trim() || "0:00";
      const task =
        (row.querySelector(".config-task") as HTMLInputElement)?.value.trim() ||
        "";
      const featureType =
        (
          row.querySelector(".config-feature-type") as HTMLSelectElement
        )?.value.trim() || "";
      const intervalSettings =
        ((row as any)._intervalSettings as GuitarIntervalSettings) ??
        new GuitarIntervalSettings();

      const featureArgs: string[] = [];
      const argsInnerContainer = row.querySelector(
        ".config-feature-args-container .feature-args-inner-container"
      );
      if (argsInnerContainer && featureType) {
        // Get the schema to know which args are variadic (assuming Guitar category for now)
        // TODO: Determine category dynamically if needed
        const descriptor = getFeatureTypeDescriptor(
          FeatureCategoryName.Guitar,
          featureType
        );
        const schema = descriptor?.getConfigurationSchema();
        // Filter out ellipsis args from the schema list used for matching
        const schemaArgs =
          typeof schema === "object" &&
          "args" in schema &&
          Array.isArray(schema.args)
            ? schema.args.filter((a) => a.type !== "ellipsis")
            : [];

        const argWrappers = argsInnerContainer.querySelectorAll<HTMLElement>(
          ":scope > .feature-arg-wrapper"
        );

        argWrappers.forEach((wrapper, wrapperIndex) => {
          // Try to find the corresponding schema arg based on index (assuming order matches)
          // This is fragile if the schema or UI generation order changes.
          // A more robust approach might involve data attributes on the wrappers.
          const schemaArg = schemaArgs[wrapperIndex];

          // Select all direct input/select descendants within this wrapper's input container
          // This looks for .config-feature-arg or select elements within a .select div
          const inputElements = wrapper.querySelectorAll<
            HTMLInputElement | HTMLSelectElement
          >(
            ".feature-arg-inputs-container .config-feature-arg, .feature-arg-inputs-container .select > select"
          );

          if (inputElements.length > 0) {
            if (schemaArg?.isVariadic) {
              // If variadic, collect all non-empty values
              inputElements.forEach((el) => {
                const value = el.value?.trim();
                if (value) {
                  // Only add non-empty values for variadic args
                  featureArgs.push(value);
                }
              });
            } else if (inputElements[0]) {
              // If not variadic, take the first input's value
              const value = inputElements[0].value?.trim();
              // Push value even if empty, to maintain argument order for non-variadic args
              featureArgs.push(value ?? "");
            }
          } else {
            // If no input found in the wrapper, and the schema arg exists and is not variadic,
            // push an empty string to maintain position.
            if (schemaArg && !schemaArg.isVariadic) {
              featureArgs.push("");
            }
          }
        });
      }

      // Check if the interval has any meaningful content
      const hasContent =
        (duration !== "0:00" && duration !== "") ||
        task ||
        featureType ||
        featureArgs.some((a) => a !== "") ||
        !intervalSettings.isDefault();

      if (hasContent) {
        let lineParts: string[] = [duration || "0:00"]; // Duration always first

        // Add task if present, otherwise add empty placeholder if needed later
        if (task) {
          lineParts.push(task);
        } else if (
          featureType ||
          featureArgs.some((a) => a !== "") ||
          !intervalSettings.isDefault()
        ) {
          lineParts.push(""); // Add empty task placeholder only if other parts exist
        }

        // Add feature type if present, otherwise add empty placeholder if needed later
        if (featureType) {
          lineParts.push(featureType);
        } else if (
          featureArgs.some((a) => a !== "") ||
          !intervalSettings.isDefault()
        ) {
          // Add empty feature placeholder only if args or settings exist without a feature type
          lineParts.push("");
        }

        if (featureArgs.length > 0) {
          // Simple quoting: quote if arg contains comma or space
          lineParts.push(
            ...featureArgs.map((arg) =>
              arg.includes(",") || arg.includes(" ") ? `"${arg}"` : arg
            )
          );
        }

        const settingsString = intervalSettings.toString();
        if (settingsString) {
          // Settings always come last if present
          lineParts.push(settingsString);
        }
        scheduleText += lineParts.join(", ") + "\n"; // Join with comma and space
      }
    }
  });
  return scheduleText.trim();
}

/** Converts a time string (MM:SS, H:MM:SS, or S) to total seconds. */
function getTotalSeconds(input: string): number {
  if (!input) return 0;
  const parts = input.split(":");
  let seconds = 0;
  let multiplier = 1;
  for (let i = parts.length - 1; i >= 0; i--) {
    const partValue = Number(parts[i]);
    if (!isNaN(partValue) && partValue >= 0) {
      seconds += partValue * multiplier;
    } else {
      return 0;
    }
    multiplier *= 60;
  }
  return seconds;
}

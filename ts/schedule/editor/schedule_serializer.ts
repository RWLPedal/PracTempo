// ts/schedule/editor/schedule_serializer.ts
import { Category } from "../../feature";
// Import registry functions for generic handling
import {
  getIntervalSettingsParser,
  getCategory,
  getIntervalSettingsFactory,
} from "../../feature_registry";
// Import generic interval settings types
import {
  IntervalSettings,
  IntervalSettingsJSON,
  IntervalRowData,
  GroupRowData,
  ScheduleRowData,
  GroupDataJSON,
  IntervalDataJSON,
  ScheduleRowJSONData,
} from "./interval/types";
// --- REMOVED direct import of GuitarIntervalSettings ---

/** Defines the top-level structure of a saved schedule JSON document. */
export interface ScheduleDocument {
  name?: string;
  items: ScheduleRowJSONData[];
}

// --- Type Guards for Validation (Remain the same) ---
function isGroupDataJSON(item: any): item is GroupDataJSON {
  return typeof item === "object" && item !== null && item.rowType === "group";
}
function isIntervalDataJSON(item: any): item is IntervalDataJSON {
  // Also check for mandatory categoryName
  return (
    typeof item === "object" &&
    item !== null &&
    item.rowType === "interval" &&
    typeof item.categoryName === "string" &&
    !!item.categoryName
  );
}

// --- Parsing Function ---
/**
 * Parses a JSON string representing a schedule document into structured row data objects
 * and extracts the schedule name. Uses the feature registry for generic handling.
 */
export function parseScheduleJSON(jsonString: string): {
  name?: string;
  items: ScheduleRowData[];
} {
  let parsedData: any;
  try {
    parsedData = JSON.parse(jsonString);
  } catch (error: any) {
    throw new Error(`Invalid JSON format: ${error.message}`);
  }

  if (
    typeof parsedData !== "object" ||
    parsedData === null ||
    !Array.isArray(parsedData.items)
  ) {
    throw new Error(
      "Invalid schedule format: Must be an object with an 'items' array."
    );
  }

  const name =
    typeof parsedData.name === "string" ? parsedData.name.trim() : undefined;
  const items = parsedData.items;
  const rowDataArray: ScheduleRowData[] = [];

  items.forEach((item: any, index: number) => {
    if (isGroupDataJSON(item)) {
      const level =
        typeof item.level === "number" && item.level >= 1 ? item.level : 1;
      const groupName =
        typeof item.name === "string"
          ? item.name.trim()
          : `Group Level ${level}`;
      rowDataArray.push({ rowType: "group", level: level, name: groupName });
    } else if (isIntervalDataJSON(item)) {
      // isIntervalDataJSON now checks for categoryName
      const duration =
        typeof item.duration === "string" ? item.duration.trim() : "0:00";
      const task = typeof item.task === "string" ? item.task.trim() : "";
      const categoryName = item.categoryName; // Already validated by type guard

      // Check if category exists in registry
      if (!getCategory(categoryName)) {
        console.warn(
          `Skipping interval at index ${index}: Category "${categoryName}" is not registered.`,
          item
        );
        return; // Skip if category not registered
      }

      const featureTypeName =
        typeof item.featureTypeName === "string"
          ? item.featureTypeName.trim()
          : "";
      const featureArgsList = Array.isArray(item.featureArgsList)
        ? item.featureArgsList.map((arg) => String(arg ?? ""))
        : [];

      // ---- Create IntervalSettings Instance using Factory/Parser from Registry ----
      let intervalSettings: IntervalSettings;
      const settingsParser = getIntervalSettingsParser(categoryName);
      const settingsData = item.intervalSettings;

      if (settingsParser) {
        try {
          intervalSettings = settingsParser(settingsData);
        } catch (parseError: any) {
          console.error(
            `Error parsing interval settings for category "${categoryName}" at index ${index}:`,
            parseError,
            settingsData
          );
          const defaultFactory = getIntervalSettingsFactory(categoryName);
          intervalSettings = defaultFactory
            ? defaultFactory()
            : { toJSON: () => ({}) };
        }
      } else {
        console.warn(
          `No settings parser registered for category "${categoryName}". Creating basic settings object.`
        );
        intervalSettings = { toJSON: () => settingsData || {} };
        if (settingsData) {
          Object.assign(intervalSettings, settingsData);
        }
      }
      // ---- End IntervalSettings Instance Creation ----

      const intervalData: IntervalRowData = {
        rowType: "interval",
        duration,
        task,
        categoryName: categoryName, // Assign category name string
        featureTypeName,
        featureArgsList,
        intervalSettings, // Assign instance
      };
      rowDataArray.push(intervalData);
    } else {
      console.warn(`Skipping invalid schedule item at index ${index}:`, item);
    }
  });

  return { name: name, items: rowDataArray };
}

/**
 * Generates a pretty-printed JSON string from schedule name and row data objects.
 * Expects rowDataArray elements to conform to ScheduleRowJSONData structure.
 */
export function generateScheduleJSON(
  scheduleName: string | undefined | null,
  rowDataArray: ScheduleRowJSONData[]
): string {
  const scheduleDocument: ScheduleDocument = { items: rowDataArray };
  if (scheduleName && scheduleName.trim()) {
    scheduleDocument.name = scheduleName.trim();
  }
  try {
    // The rowDataArray should already be in the correct JSON format
    return JSON.stringify(scheduleDocument, null, 2);
  } catch (error: any) {
    console.error("Error stringifying schedule data:", error);
    return JSON.stringify(
      { name: scheduleName || undefined, items: [] },
      null,
      2
    );
  }
}

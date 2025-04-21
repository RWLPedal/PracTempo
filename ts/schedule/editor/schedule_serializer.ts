import { FeatureCategoryName } from "../../feature";
// Import interval settings types from core types
import { IntervalSettings, IntervalSettingsJSON } from "./interval/types";
import { GuitarIntervalSettings } from "../../guitar/guitar_interval_settings";
import { getIntervalSettingsFactory } from "../../feature_registry";

import {
  IntervalRowData, GroupRowData, ScheduleRowData,
  GroupDataJSON, IntervalDataJSON, ScheduleRowJSONData // Removed ScheduleDocument from this import
} from "./interval/types";

// --- Define and Export ScheduleDocument Interface ---
/** Defines the top-level structure of a saved schedule JSON document. */
export interface ScheduleDocument {
  name?: string; // Optional schedule name
  items: ScheduleRowJSONData[]; // Array of group or interval data objects
}

// --- Type Guards for Validation ---

export interface ScheduleDocument {
  name?: string; // Optional schedule name
  items: ScheduleRowJSONData[]; // Array of group or interval data objects
}

function isGroupDataJSON(item: any): item is GroupDataJSON {
  return typeof item === "object" && item !== null && item.rowType === "group";
}

function isIntervalDataJSON(item: any): item is IntervalDataJSON {
  return (
    typeof item === "object" && item !== null && item.rowType === "interval"
  );
}

// --- Parsing Function ---

/**
 * Parses a JSON string representing a schedule document into structured row data objects
 * and extracts the schedule name.
 *
 * @param jsonString - The JSON string content.
 * @returns An object containing the optional schedule name and the array of ScheduleRowData items.
 * @throws {Error} If JSON parsing fails or the structure is invalid.
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

  if (typeof parsedData !== "object" || parsedData === null) {
    /* ... error ... */
  }
  const name =
    typeof parsedData.name === "string" ? parsedData.name.trim() : undefined;
  const items = parsedData.items;
  if (!Array.isArray(items)) {
    /* ... error ... */
  }

  const rowDataArray: ScheduleRowData[] = [];
  items.forEach((item: any, index: number) => {
    if (isGroupDataJSON(item)) {
      // ... Group parsing remains the same ...
      const level =
        typeof item.level === "number" && item.level >= 1 ? item.level : 1;
      const groupName =
        typeof item.name === "string"
          ? item.name.trim()
          : `Group Level ${level}`;
      rowDataArray.push({ rowType: "group", level: level, name: groupName });
    } else if (isIntervalDataJSON(item)) {
      const duration =
        typeof item.duration === "string" ? item.duration.trim() : "0:00";
      const task = typeof item.task === "string" ? item.task.trim() : "";
      // ---- Get Category Name (default to Guitar if missing/invalid) ----
      let categoryName: FeatureCategoryName = FeatureCategoryName.Guitar; // Default
      if (
        item.featureCategoryName &&
        Object.values(FeatureCategoryName).includes(item.featureCategoryName)
      ) {
        categoryName = item.featureCategoryName as FeatureCategoryName;
      } else if (item.featureCategoryName) {
        console.warn(
          `Invalid featureCategoryName "${item.featureCategoryName}" in JSON at index ${index}, defaulting to ${FeatureCategoryName.Guitar}`
        );
      }
      // ---- End Category Name ----
      const featureTypeName =
        typeof item.featureTypeName === "string"
          ? item.featureTypeName.trim()
          : "";
      const featureArgsList = Array.isArray(item.featureArgsList)
        ? item.featureArgsList.map((arg) => String(arg ?? ""))
        : [];

      // ---- Create IntervalSettings Instance using Factory ----
      let intervalSettings: IntervalSettings;
      const settingsFactory = getIntervalSettingsFactory(categoryName);
      const settingsData = item.intervalSettings; // The JSON object for settings

      if (settingsFactory) {
        // We need a way for the factory/class to take JSON data.
        // Assume each specific settings class has a static fromJSON method.
        // This still requires knowing the specific class... how to get it?
        // Option 1: Registry stores class constructor AND default factory.
        // Option 2: Factory itself handles JSON? `settingsFactory(settingsData)`
        // Option 3: Hardcode lookup based on categoryName (BAD!)
        // Option 4: IntervalSettings interface requires static fromJSON? (Complex)

        // Let's stick with the current specific import for now, assuming parse knows the type
        // TODO: Refactor parsing to be truly category-agnostic for settings instantiation
        if (categoryName === FeatureCategoryName.Guitar) {
          intervalSettings = GuitarIntervalSettings.fromJSON(settingsData);
        } else {
          console.warn(
            `No specific IntervalSettings parser for category ${categoryName}, using default factory.`
          );
          // Use the default factory if available, otherwise basic object
          intervalSettings = settingsFactory
            ? settingsFactory()
            : { toJSON: () => settingsData || {} };
          // Try to apply data generically if possible (may not work well)
          if (settingsData) {
            Object.assign(intervalSettings, settingsData);
          }
        }
      } else {
        console.warn(
          `No factory for category ${categoryName}, creating basic settings object.`
        );
        intervalSettings = { toJSON: () => settingsData || {} }; // Basic fallback
        if (settingsData) {
          Object.assign(intervalSettings, settingsData);
        }
      }
      // ---- End IntervalSettings Instance Creation ----

      const intervalData: IntervalRowData = {
        rowType: "interval",
        duration,
        task,
        featureCategoryName: categoryName, // Assign category
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
 *
 * @param scheduleName - The optional name for the schedule.
 * @param rowDataArray - The array of ScheduleRowJSONData objects (from getRowData).
 * @returns A JSON string representation of the schedule document.
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
    return JSON.stringify(scheduleDocument, null, 2);
  } catch (error: any) {
    console.error("Error stringifying schedule data:", error);
    return JSON.stringify({ items: [] }, null, 2);
  }
}

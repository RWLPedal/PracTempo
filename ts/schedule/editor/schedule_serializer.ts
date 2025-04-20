import {
  GuitarIntervalSettings,
  GuitarIntervalSettingsJSON,
} from "../../guitar/guitar_interval_settings";
import {
  IntervalRowData,
  GroupRowData,
  ScheduleRowData,
  GroupDataJSON,
  IntervalDataJSON,
  ScheduleRowJSONData, // This type now represents items in the array
} from "./interval_row";

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
    console.error("JSON Parsing Error:", error);
    throw new Error(`Invalid JSON format: ${error.message}`);
  }

  // Validate top-level structure
  if (typeof parsedData !== "object" || parsedData === null) {
    throw new Error("Invalid schedule format: Expected a top-level object.");
  }

  const name =
    typeof parsedData.name === "string" ? parsedData.name.trim() : undefined;
  const items = parsedData.items;

  if (!Array.isArray(items)) {
    throw new Error(
      "Invalid schedule format: Expected an 'items' array within the object."
    );
  }

  const rowDataArray: ScheduleRowData[] = [];

  items.forEach((item: any, index: number) => {
    if (isGroupDataJSON(item)) {
      const level =
        typeof item.level === "number" && item.level >= 1 ? item.level : 1;
      const groupName =
        typeof item.name === "string"
          ? item.name.trim()
          : `Group Level ${level}`; // Renamed variable
      const groupData: GroupRowData = {
        rowType: "group",
        level: level,
        name: groupName,
      };
      rowDataArray.push(groupData);
    } else if (isIntervalDataJSON(item)) {
      const duration =
        typeof item.duration === "string" ? item.duration.trim() : "0:00";
      const task = typeof item.task === "string" ? item.task.trim() : "";
      const featureTypeName =
        typeof item.featureTypeName === "string"
          ? item.featureTypeName.trim()
          : "";
      const featureArgsList = Array.isArray(item.featureArgsList)
        ? item.featureArgsList.map((arg) => String(arg ?? ""))
        : [];
      const intervalSettings = GuitarIntervalSettings.fromJSON(
        item.intervalSettings
      ); // Create instance

      const intervalData: IntervalRowData = {
        rowType: "interval",
        duration,
        task,
        featureTypeName,
        featureArgsList,
        intervalSettings, // Assign instance
      };
      rowDataArray.push(intervalData);
    } else {
      console.warn(`Skipping invalid schedule item at index ${index}:`, item);
    }
  });

  return { name: name, items: rowDataArray }; // Return name and items array
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
  rowDataArray: ScheduleRowJSONData[] // Expects the plain JSON data array
): string {
  // Create the top-level document object
  const scheduleDocument: ScheduleDocument = {
    // Use the input array directly for items
    items: rowDataArray,
  };
  // Only include the name property if it's not null/empty/undefined
  if (scheduleName && scheduleName.trim()) {
    scheduleDocument.name = scheduleName.trim();
  }

  try {
    // Stringify the document object
    return JSON.stringify(scheduleDocument, null, 2); // Pretty print
  } catch (error: any) {
    console.error("Error stringifying schedule data:", error);
    return JSON.stringify({ items: [] }, null, 2); // Return empty document on error
  }
}

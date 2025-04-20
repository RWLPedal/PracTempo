// ts/schedule/editor/interval/types.ts
import { GuitarIntervalSettings, GuitarIntervalSettingsJSON } from "../../../guitar/guitar_interval_settings";
import { FeatureCategoryName } from "../../../feature";

/** Data structure representing the state of a single interval row (Input/Output for UI build) */
export interface IntervalRowData {
  rowType: "interval";
  duration: string;
  task: string;
  featureCategoryName: FeatureCategoryName; // **** ADDED ****
  featureTypeName: string;
  featureArgsList: string[];
  intervalSettings: IntervalSettings;
}

/** Data structure representing a group header row (Input/Output for UI build) */
export interface GroupRowData {
  rowType: "group";
  level: number;
  name: string;
}

/** Union type for UI row data */
export type ScheduleRowData = IntervalRowData | GroupRowData;

// --- JSON Data Structures ---

/** JSON structure for group row data */
export interface GroupDataJSON {
  rowType: "group";
  level: number;
  name: string;
}

/** JSON structure for interval row data */
export interface IntervalDataJSON {
  rowType: "interval";
  duration: string;
  task: string;
  featureCategoryName?: FeatureCategoryName;
  featureTypeName: string;
  featureArgsList: string[];
  intervalSettings?: IntervalSettingsJSON;
}

/** Union type for JSON row data */
export type ScheduleRowJSONData = GroupDataJSON | IntervalDataJSON;

// Define a base interface for all interval-specific settings
export interface IntervalSettings {
  // Common properties can go here if any, otherwise it's a marker interface
  // Example: metronomeBpm might be common? Or keep it specific?
  // For now, keep it simple. Subclasses will add specific properties.
  toJSON(): IntervalSettingsJSON; // Ensure all settings can be serialized
}

// Define a base interface for the JSON representation of settings
// (Included for context as it's used by IntervalSettings)
export interface IntervalSettingsJSON {
  // No common properties needed here currently, structure defined by specific implementations
  [key: string]: any; // Allow arbitrary properties in JSON
}
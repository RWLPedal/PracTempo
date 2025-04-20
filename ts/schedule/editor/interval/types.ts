// ts/schedule/editor/interval/types.ts
import { GuitarIntervalSettings, GuitarIntervalSettingsJSON } from "../../../guitar/guitar_interval_settings";

/** Data structure representing the state of a single interval row (Input/Output for UI build) */
export interface IntervalRowData {
  rowType: "interval";
  duration: string;
  task: string;
  featureTypeName: string;
  featureArgsList: string[]; // Args list received from parser/used for initial population
  intervalSettings: GuitarIntervalSettings; // Now expects an INSTANCE
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
  featureTypeName: string;
  featureArgsList: string[];
  intervalSettings?: GuitarIntervalSettingsJSON; // Uses imported JSON type
}

/** Union type for JSON row data */
export type ScheduleRowJSONData = GroupDataJSON | IntervalDataJSON;
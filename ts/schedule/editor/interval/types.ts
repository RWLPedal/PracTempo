/** Data structure representing the state of a single interval row (Input/Output for UI build) */
export interface IntervalRowData {
  rowType: "interval";
  duration: string;
  task: string;
  categoryName: string;
  featureTypeName: string;
  featureArgsList: string[];
  intervalSettings: IntervalSettings; // Use the base interface type
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
  categoryName: string;
  featureTypeName: string;
  featureArgsList: string[];
  intervalSettings?: IntervalSettingsJSON;
}

/** Union type for JSON row data */
export type ScheduleRowJSONData = GroupDataJSON | IntervalDataJSON;

// Define a base interface for all interval-specific settings
export interface IntervalSettings {
  // Common properties can go here if any, otherwise it's a marker interface
  toJSON(): IntervalSettingsJSON | undefined; // Ensure all settings can be serialized (return undefined if default)
  // Optionally add: isDefault?(): boolean;
}

// Define a base interface for the JSON representation of settings
export interface IntervalSettingsJSON {
  // No common properties needed here currently, structure defined by specific implementations
  [key: string]: any; // Allow arbitrary properties in JSON
}
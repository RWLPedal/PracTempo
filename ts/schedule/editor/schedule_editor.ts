// ts/schedule/editor/schedule_editor.ts
import { AudioController } from "../../audio_controller";
import { DisplayController } from "../../display_controller";
import { Schedule } from "../schedule";
import { AppSettings, LAST_RUN_SCHEDULE_JSON_KEY } from "../../settings";
// Use JSON serializer functions
import {
  parseScheduleJSON,
  generateScheduleJSON,
  ScheduleDocument,
} from "./schedule_serializer"; // Import ScheduleDocument
// Import types and UI builders from interval directory
import {
  ScheduleRowData,
  GroupRowData,
  IntervalRowData,
  ScheduleRowJSONData,
  IntervalSettings, // Keep base type if needed
} from "./interval/types";
import { buildIntervalRowElement } from "./interval/interval_row_ui";
import { buildGroupRowElement } from "./interval/group_row_ui";

// Import managers
import { EditorUIManager } from "./editor_ui_manager";
import { ErrorDisplay } from "./error_display";
import { SelectionManager } from "./selection_manager";
import { RowManager } from "./row_manager";
import { ClipboardManager } from "./clipboard_manager";
import { DragDropManager } from "./drag_drop_manager";
import { KeyboardShortcutManager } from "./keyboard_shortcut_manager";
import { ScheduleBuilder } from "./schedule_builder";

// --- Removed FeatureCategoryName import ---

enum EditorMode {
  JSON = "json",
  Config = "config",
}

const DEFAULT_SCHEDULE_NAME = "Untitled Schedule";
// Define a default category to use when adding new rows via button
// TODO: Make this selectable in the UI later
const DEFAULT_CATEGORY_FOR_NEW_ROWS = "Guitar";

export class ScheduleEditor {
  // ... (Properties remain the same) ...
  public containerEl: HTMLElement;
  private updateAction: () => void;
  private audioController: AudioController;
  private uiManager: EditorUIManager;
  public errorDisplay: ErrorDisplay;
  private selectionManager: SelectionManager;
  private rowManager: RowManager;
  private clipboardManager: ClipboardManager;
  private dndManager: DragDropManager;
  private keyboardManager: KeyboardShortcutManager;
  private scheduleBuilder: ScheduleBuilder;
  private scheduleNameDisplayEl!: HTMLElement | null; // Nullable
  private editScheduleNameBtnEl!: HTMLElement | null; // Nullable
  private currentMode: EditorMode = EditorMode.Config;
  private scheduleName: string = DEFAULT_SCHEDULE_NAME;

  constructor(
    containerEl: HTMLElement,
    updateAction: () => void,
    audioController: AudioController
  ) {
    // ... (Initialization of managers remains the same) ...
    if (!containerEl)
      throw new Error("ScheduleEditor: Container element is required.");
    this.containerEl = containerEl;
    this.updateAction = updateAction;
    this.audioController = audioController;
    this.uiManager = new EditorUIManager(this.containerEl);
    this._findNameEditElements(); // Find elements before attaching handlers
    this.errorDisplay = new ErrorDisplay(
      this.containerEl,
      this.uiManager.editorControlsContainerEl
    );
    this.selectionManager = new SelectionManager(
      this.uiManager.configEntriesContainerEl,
      this._onSelectionChange.bind(this)
    );
    this.rowManager = new RowManager(
      this.uiManager.configEntriesContainerEl,
      this.selectionManager
    );
    this.clipboardManager = new ClipboardManager(
      this.selectionManager,
      this.rowManager,
      this._onClipboardChange.bind(this)
    );
    this.dndManager = new DragDropManager(
      this.uiManager.configEntriesContainerEl,
      this.selectionManager,
      this.rowManager
    );
    this.keyboardManager = new KeyboardShortcutManager(
      this.uiManager.configEntriesContainerEl,
      this.clipboardManager,
      this.rowManager,
      () => this.currentMode === EditorMode.Config
    );
    this.scheduleBuilder = new ScheduleBuilder(
      this.rowManager,
      this.errorDisplay,
      this.uiManager.configEntriesContainerEl
    );

    this._attachButtonHandlers();
    this._attachNameEditHandlers(); // Attach name handlers
    this.setEditorMode(this.currentMode, true);
    this._loadInitialState();
    this._updateScheduleNameDisplay();

    // Ensure config UI reflects loaded state if starting in config mode
    if (this.currentMode === EditorMode.Config) {
      if (this.uiManager.textEl.value.trim().length > 0) {
        this.syncJSONViewToConfig(); // Sync if JSON text area has content
      }
      // Add default row ONLY if config view is STILL empty AFTER potential sync
      if (this.uiManager.configEntriesContainerEl.childElementCount === 0) {
        console.log(
          "Config view empty after load/sync, adding default interval row."
        );
        // Provide default category name string when adding initial row
        this.rowManager.addEmptyIntervalRow(DEFAULT_CATEGORY_FOR_NEW_ROWS);
      }
    }
  }

  /** Finds the schedule name display and edit button elements */
  private _findNameEditElements(): void {
    // Query within the main container or document if elements are outside editor container
    this.scheduleNameDisplayEl = document.getElementById("schedule-name-display");
    this.editScheduleNameBtnEl = document.getElementById("edit-schedule-name-btn");

    if (!this.scheduleNameDisplayEl) {
      console.warn("Schedule name display element (#schedule-name-display) not found.");
    }
    if (!this.editScheduleNameBtnEl) {
      console.warn("Edit schedule name button (#edit-schedule-name-btn) not found.");
    }
  }

  /** Updates the schedule name display element */
  private _updateScheduleNameDisplay(): void {
    if (this.scheduleNameDisplayEl) {
      this.scheduleNameDisplayEl.textContent = `Schedule: ${this.scheduleName}`;
      this.scheduleNameDisplayEl.title = `Current schedule: ${this.scheduleName}. Click Edit button to rename.`;
    }
  }

   /** Attaches handlers for editing the schedule name */
  private _attachNameEditHandlers(): void {
    if (!this.editScheduleNameBtnEl || !this.scheduleNameDisplayEl) {
      return; // Do nothing if elements are missing
    }

    this.editScheduleNameBtnEl.onclick = (event) => {
      // **** FIX: Stop event propagation ****
      event.stopPropagation();

      const currentName = this.scheduleName;
      const newName = prompt("Enter new schedule name:", currentName);
      if (newName !== null && newName.trim() !== "") {
        this.scheduleName = newName.trim();
        this._updateScheduleNameDisplay();
        console.log("Schedule name updated to:", this.scheduleName);
      } else if (newName !== null) { // User entered blank name
        alert("Schedule name cannot be empty.");
      }
    };

    // Optional: Make the display itself clickable? (less clear UX)
    // this.scheduleNameDisplayEl.onclick = (event) => { ... };
  }


  // --- Mode Switching & Syncing ---
  private toggleMode(): void {
    const nextMode =
      this.currentMode === EditorMode.Config ? EditorMode.JSON : EditorMode.Config;
    this.setEditorMode(nextMode);
  }

  private setEditorMode(mode: EditorMode, skipSync: boolean = false): void {
    this.currentMode = mode;
    const isTextMode = mode === EditorMode.JSON;
    this.uiManager.setModeUI(isTextMode);

    if (!skipSync) {
      if (isTextMode) {
        this.syncConfigToJSONView();
      } else {
        this.syncJSONViewToConfig();
      }
    }
    console.log(`Editor mode set to ${mode}. Skip sync: ${skipSync}`);
  }

  private syncConfigToJSONView(): void {
    try {
      const jsonString = this._generateJSONFromConfigView();
      this.uiManager.textEl.value = jsonString;
      this.errorDisplay.removeMessage();
    } catch (error: any) {
      console.error("Error syncing config to JSON:", error);
      this.errorDisplay.showMessage(`Error generating JSON: ${error.message}`);
    }
  }

  private syncJSONViewToConfig(): void {
    try {
      const scheduleJSON = this.uiManager.textEl.value;
      // Parse JSON string into ScheduleRowData[] (uses updated parser)
      const parsedDoc = parseScheduleJSON(scheduleJSON);
      this.scheduleName = parsedDoc.name || DEFAULT_SCHEDULE_NAME;
      this._updateScheduleNameDisplay();

      // Populate UI using the parsed ScheduleRowData array and the updated builder function
      this.uiManager.populateConfigUI(
        this._buildRowElement.bind(this), // Uses updated helper
        parsedDoc.items
      );

      this.rowManager.updateAllRowIndentation();
      this.selectionManager.clearSelection();
      this.errorDisplay.removeMessage();
    } catch (error: any) {
      console.error("Error parsing schedule JSON:", error);
      this.errorDisplay.showMessage(
        `Error parsing JSON input: ${error.message}`
      );
      // Optionally clear config view or leave as is?
      // this._clearConfigEntries();
    }
  }

  // --- Load/Save/Build ---
  private _loadInitialState(): void {
    const lastRunJSON = localStorage.getItem(LAST_RUN_SCHEDULE_JSON_KEY);
    let initialJSON = "";
    if (lastRunJSON) {
      console.log("Loading last run schedule from localStorage (JSON).");
      initialJSON = lastRunJSON;
    } else {
      console.log(
        "No last run schedule found, loading default example (JSON)."
      );
      // Default example now includes categoryName
      initialJSON = JSON.stringify(
        {
          name: "Default Example Schedule",
          items: [
            {
              rowType: "interval",
              duration: "5:00",
              task: "Warmup",
              categoryName: "Guitar",
              featureTypeName: "Notes",
              featureArgsList: [],
            },
            { rowType: "group", level: 1, name: "Section 1" },
            {
              rowType: "interval",
              duration: "3:00",
              task: "C Major Scale",
              categoryName: "Guitar",
              featureTypeName: "Scale",
              featureArgsList: ["Major", "C"],
            }, // Corrected args order assumption
            {
              rowType: "interval",
              duration: "3:00",
              task: "G Major Scale",
              categoryName: "Guitar",
              featureTypeName: "Scale",
              featureArgsList: ["Major", "G"],
            },
          ],
        } satisfies ScheduleDocument, // Add type assertion for stricter checking
        null,
        2
      );
    }
    // Set initial state (will parse name and items)
    // Pass skipSync=true because we manually sync if needed right after constructor
    this.setScheduleJSON(initialJSON, true);
  }

  /** Helper to build row elements based on data type, passing necessary context */
  private _buildRowElement(rowData: ScheduleRowData): HTMLElement | null {
    if (rowData.rowType === "group") {
      // Group rows don't need category context for building
      return buildGroupRowElement(rowData as GroupRowData);
    } else if (rowData.rowType === "interval") {
      const intervalData = rowData as IntervalRowData;
      // Extract category name string from the row data
      const categoryName = intervalData.categoryName; // Should exist now
      if (!categoryName) {
        console.error(
          "Cannot build interval row: Missing categoryName in rowData",
          intervalData
        );
        const errorDiv = document.createElement("div");
        errorDiv.textContent = "[Error: Missing Category]";
        errorDiv.style.color = "red";
        errorDiv.classList.add("schedule-row");
        return errorDiv;
      }
      // Pass the category name string to the builder function
      return buildIntervalRowElement(intervalData, categoryName);
    }
    console.warn("Trying to build unknown row type:", rowData);
    return null;
  }

  /** Attaches handlers to the main editor control buttons */
  private _attachButtonHandlers(): void {
    this.uiManager.modeToggleEl.onclick = () => this.toggleMode();
    this.uiManager.newScheduleButtonEl.onclick = () => this.newSchedule();
    this.uiManager.addConfigEntryButtonEl.onclick = () => {
      // Pass default category name string when adding via button
      this.rowManager.addEmptyIntervalRow(DEFAULT_CATEGORY_FOR_NEW_ROWS);
    };
    this.uiManager.addGroupButtonEl.onclick = () =>
      this.rowManager.addGroupRow();
    this.uiManager.copyButtonEl.onclick = () =>
      this.clipboardManager.copySelectedRows();
    this.uiManager.pasteButtonEl.onclick = () =>
      this.clipboardManager.pasteRows();
    this.uiManager.setScheduleButtonEl.onclick = () => {
      this.errorDisplay.removeMessage();
      this.updateAction(); // Trigger the main application update (reset)
    };
    // Load/Save button handler is attached in main.ts if modal exists
  }

  /** Callback when selection changes (passed to SelectionManager) */
  private _onSelectionChange(): void {
    const canCopy = this.selectionManager.getSelectedElements().size > 0;
    this.uiManager.updateCopyPasteButtonState(
      canCopy,
      this.clipboardManager.hasCopiedData()
    );
  }

  /** Callback when clipboard content changes (passed to ClipboardManager) */
  private _onClipboardChange(canPaste: boolean): void {
    const canCopy = this.selectionManager.getSelectedElements().size > 0;
    this.uiManager.updateCopyPasteButtonState(canCopy, canPaste);
  }

  /** Clears the editor content and resets state for a new schedule. */
  public newSchedule(): void {
    if (!confirm("Clear the current schedule and start a new one?")) return;

    console.log("Starting new schedule...");
    this._clearConfigEntries();
    this.uiManager.textEl.value = "";
    this.scheduleName = DEFAULT_SCHEDULE_NAME;
    this._updateScheduleNameDisplay();
    this.selectionManager.clearSelection(true);
    this.clipboardManager.clearClipboard();

    // Add a default starting row, passing the category name string
    this.rowManager.addEmptyIntervalRow(DEFAULT_CATEGORY_FOR_NEW_ROWS);

    this.errorDisplay.removeMessage();
    if (this.currentMode !== EditorMode.Config) {
      this.setEditorMode(EditorMode.Config, true);
    }
  }

  /** Removes all row elements from the config view */
  private _clearConfigEntries(): void {
    while (this.uiManager.configEntriesContainerEl.firstChild) {
      this.uiManager.configEntriesContainerEl.removeChild(
        this.uiManager.configEntriesContainerEl.firstChild
      );
    }
  }

  /** Gets the current schedule definition as a JSON string */
  public getScheduleJSON(): string {
    if (this.currentMode === EditorMode.JSON) {
      // Attempt to validate and return JSON from text area
      try {
        // Use parse to validate structure; throw if invalid
        parseScheduleJSON(this.uiManager.textEl.value);
        return this.uiManager.textEl.value;
      } catch (e) {
        // If JSON is invalid, generate from config view as fallback
        console.warn(
          "JSON in text editor is invalid, generating from config view instead."
        );
        this.errorDisplay.showMessage(
          `JSON Error: ${
            e instanceof Error ? e.message : String(e)
          }. Using Config view.`
        );
        return this._generateJSONFromConfigView();
      }
    } else {
      // Always generate from config view if in config mode
      return this._generateJSONFromConfigView();
    }
  }

  /** Helper to generate JSON from the config view UI elements (uses updated rowManager) */
  private _generateJSONFromConfigView(): string {
    const rows =
      this.uiManager.configEntriesContainerEl.querySelectorAll<HTMLElement>(
        ".schedule-row"
      );
    const rowDataArray = Array.from(rows)
      .map((row) => this.rowManager.getRowData(row)) // getRowData now includes categoryName
      .filter((d): d is ScheduleRowJSONData => d !== null);
    return generateScheduleJSON(this.scheduleName, rowDataArray); // generate includes categoryName
  }

  /** Sets the editor content from a JSON string (uses updated parser) */
  public setScheduleJSON(jsonString: string, skipSync: boolean = false): void {
    console.log("Setting schedule JSON programmatically.");
    try {
      // Parse using the updated parser (which requires categoryName)
      const parsedDoc = parseScheduleJSON(jsonString);
      this.scheduleName = parsedDoc.name || DEFAULT_SCHEDULE_NAME;

      // Re-generate JSON from parsed data for consistency in the text area
      // This requires building temporary elements or using RowManager.getRowData on the parsed data
      // Simpler: Just trust the parser and pretty-print the original valid input for the text view
      let prettyJson = jsonString; // Default to original if parsing failed somehow for regen
      try {
        prettyJson = JSON.stringify(JSON.parse(jsonString), null, 2);
      } catch {}
      this.uiManager.textEl.value = prettyJson;

      this._updateScheduleNameDisplay();
      this.errorDisplay.removeMessage();

      // Syncing logic based on mode (uses updated _buildRowElement)
      if (!skipSync && this.currentMode === EditorMode.Config) {
        this.syncJSONViewToConfig();
      } else if (skipSync && this.currentMode === EditorMode.Config) {
        // If skipping sync but in config mode, still need to populate the UI
        this.uiManager.populateConfigUI(
          this._buildRowElement.bind(this),
          parsedDoc.items
        );
        this.rowManager.updateAllRowIndentation();
        this.selectionManager.clearSelection();
      }
      console.log("Schedule JSON set and potentially synced to editor view.");
    } catch (error: any) {
      console.error("Failed to set schedule JSON:", error);
      this.errorDisplay.showMessage(
        `Failed to load schedule: ${error.message}`
      );
    }
  }

  /** Builds and returns the Schedule object for the timer (uses updated builder) */
  public getSchedule(
    displayController: DisplayController,
    settings: AppSettings,
    maxCanvasHeight: number
  ): Schedule | null {
    if (this.currentMode === EditorMode.JSON) {
      this.syncJSONViewToConfig();
      if (this.errorDisplay.hasMessage()) {
        console.error(
          "Cannot build schedule due to errors during JSON-to-config sync."
        );
        return null;
      }
    }
    // Build schedule uses the updated scheduleBuilder which is now generic
    return this.scheduleBuilder.buildSchedule(
      displayController,
      this.audioController,
      settings,
      maxCanvasHeight
    );
  }
}
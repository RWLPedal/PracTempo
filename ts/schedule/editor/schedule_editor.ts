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
import { getAvailableCategories } from "../../feature_registry"; // Import registry getter and Category type

// --- Removed FeatureCategoryName import ---

enum EditorMode {
  JSON = "json",
  Config = "config",
}

const DEFAULT_SCHEDULE_NAME = "Untitled Schedule";
// --- REMOVED: DEFAULT_CATEGORY_FOR_NEW_ROWS constant ---

export class ScheduleEditor {
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
  private scheduleNameDisplayEl!: HTMLElement | null;
  private editScheduleNameBtnEl!: HTMLElement | null;
  private currentMode: EditorMode = EditorMode.Config;
  private scheduleName: string = DEFAULT_SCHEDULE_NAME;
  private defaultCategoryName: string | null = null; // Store the determined default category

  constructor(
    containerEl: HTMLElement,
    updateAction: () => void,
    audioController: AudioController
  ) {
    if (!containerEl)
      throw new Error("ScheduleEditor: Container element is required.");
    this.containerEl = containerEl;
    this.updateAction = updateAction;
    this.audioController = audioController;

    // --- Determine Default Category ---
    const availableCategories = getAvailableCategories();
    if (availableCategories.length > 0) {
      this.defaultCategoryName = availableCategories[0].getName();
      console.log(`Using default category: ${this.defaultCategoryName}`);
    } else {
      console.error(
        "CRITICAL: No categories registered. Cannot determine default category for editor."
      );
      // Optionally disable parts of the editor UI
    }
    // --- End Determine Default Category ---

    this.uiManager = new EditorUIManager(this.containerEl);
    this._findNameEditElements();
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
    this._attachNameEditHandlers();
    this.setEditorMode(this.currentMode, true);
    this._loadInitialState(); // Will now use default category's intervals
    this._updateScheduleNameDisplay();

    // Ensure config UI reflects loaded state if starting in config mode
    if (this.currentMode === EditorMode.Config) {
      if (this.uiManager.textEl.value.trim().length > 0) {
        this.syncJSONViewToConfig(); // Sync if JSON text area has content
      }
      // Add default row ONLY if config view is STILL empty AFTER potential sync AND a default category exists
      if (
        this.uiManager.configEntriesContainerEl.childElementCount === 0 &&
        this.defaultCategoryName
      ) {
        console.log(
          "Config view empty after load/sync, adding default interval row."
        );
        this.rowManager.addEmptyIntervalRow(this.defaultCategoryName);
      }
    }
  }

  // ... (_findNameEditElements, _updateScheduleNameDisplay, _attachNameEditHandlers unchanged) ...
  private _findNameEditElements(): void {
    this.scheduleNameDisplayEl = document.getElementById(
      "schedule-name-display"
    );
    this.editScheduleNameBtnEl = document.getElementById(
      "edit-schedule-name-btn"
    );
    if (!this.scheduleNameDisplayEl)
      console.warn(
        "Schedule name display element (#schedule-name-display) not found."
      );
    if (!this.editScheduleNameBtnEl)
      console.warn(
        "Edit schedule name button (#edit-schedule-name-btn) not found."
      );
  }
  private _updateScheduleNameDisplay(): void {
    if (this.scheduleNameDisplayEl) {
      this.scheduleNameDisplayEl.textContent = `Schedule: ${this.scheduleName}`;
      this.scheduleNameDisplayEl.title = `Current schedule: ${this.scheduleName}. Click Edit button to rename.`;
    }
  }
  private _attachNameEditHandlers(): void {
    if (!this.editScheduleNameBtnEl || !this.scheduleNameDisplayEl) return;
    this.editScheduleNameBtnEl.onclick = (event) => {
      event.stopPropagation(); // Stop propagation
      const currentName = this.scheduleName;
      const newName = prompt("Enter new schedule name:", currentName);
      if (newName !== null && newName.trim() !== "") {
        this.scheduleName = newName.trim();
        this._updateScheduleNameDisplay();
        console.log("Schedule name updated to:", this.scheduleName);
      } else if (newName !== null) {
        alert("Schedule name cannot be empty.");
      }
    };
  }

  // --- Mode Switching & Syncing ---
  private toggleMode(): void {
    const nextMode =
      this.currentMode === EditorMode.Config
        ? EditorMode.JSON
        : EditorMode.Config;
    this.setEditorMode(nextMode);
  }
  private setEditorMode(mode: EditorMode, skipSync: boolean = false): void {
    this.currentMode = mode;
    const isTextMode = mode === EditorMode.JSON;
    this.uiManager.setModeUI(isTextMode);
    if (!skipSync) {
      if (isTextMode) this.syncConfigToJSONView();
      else this.syncJSONViewToConfig();
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
      const parsedDoc = parseScheduleJSON(scheduleJSON);
      this.scheduleName = parsedDoc.name || DEFAULT_SCHEDULE_NAME;
      this._updateScheduleNameDisplay();
      this.uiManager.populateConfigUI(
        this._buildRowElement.bind(this),
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
    }
  }

  // --- Load/Save/Build ---
  private _loadInitialState(): void {
    const lastRunJSON = localStorage.getItem(LAST_RUN_SCHEDULE_JSON_KEY);
    let initialJSON: string | null = null;
    let initialItems: ScheduleRowData[] | null = null;
    let initialName: string | undefined = undefined;

    if (lastRunJSON) {
      console.log(
        "Found last run schedule (JSON) in localStorage. Attempting to parse..."
      );
      try {
        const parsedDoc = parseScheduleJSON(lastRunJSON);
        initialName = parsedDoc.name;
        initialItems = parsedDoc.items;
        initialJSON = lastRunJSON;
        console.log("Successfully parsed last run schedule.");
      } catch (e) {
        console.warn(
          "Could not parse last run schedule JSON, removing from storage.",
          e
        );
        localStorage.removeItem(LAST_RUN_SCHEDULE_JSON_KEY);
      }
    }

    if (!initialItems) {
      console.log("Loading default schedule from first registered category...");
      const categories = getAvailableCategories();
      if (categories.length > 0) {
        const defaultCategory = categories[0];
        if (typeof defaultCategory.getDefaultIntervals === "function") {
          initialItems = defaultCategory.getDefaultIntervals();
        }
        initialName = `${defaultCategory.getDisplayName()} Default`;
      }

      if (!initialItems || initialItems.length === 0) {
        console.warn(
          "Default category did not provide default intervals or no categories registered. Creating single empty interval."
        );
        initialItems = []; // Ensure it's an empty array if fallback needed
        if (this.defaultCategoryName) {
          // *** FIX: Use the new method to get data ***
          const emptyRowData = this.rowManager.createEmptyIntervalUIData(
            this.defaultCategoryName
          );
          if (emptyRowData) {
            initialItems.push(emptyRowData);
          } else {
            console.error(
              "Failed to create empty interval row data for default schedule."
            );
          }
        }
        initialName = DEFAULT_SCHEDULE_NAME;
      }
      // Generate JSON from these default items for the text editor view
      try {
        // Need to build temporary elements to use getRowData for JSON conversion
        const tempContainer = document.createElement("div");
        initialItems.forEach((itemData) => {
          const el = this._buildRowElement(itemData);
          if (el) tempContainer.appendChild(el);
        });
        const rowElements = Array.from(
          tempContainer.querySelectorAll<HTMLElement>(".schedule-row")
        );
        const jsonItems = rowElements
          .map((row) => this.rowManager.getRowData(row)!)
          .filter((d) => d !== null);

        initialJSON = generateScheduleJSON(initialName, jsonItems);
      } catch (e) {
        console.error("Error generating JSON for default schedule:", e);
        initialJSON = JSON.stringify({ name: initialName, items: [] }, null, 2);
      }
    }

    // Set initial state using the determined JSON or parsed data
    if (initialJSON !== null) {
      this.setScheduleJSON(initialJSON, true); // skipSync=true initially
    } else {
      console.error("Failed to determine initial schedule state.");
      this.scheduleName = DEFAULT_SCHEDULE_NAME;
      this._updateScheduleNameDisplay();
      this._clearConfigEntries();
      if (this.defaultCategoryName) {
        this.rowManager.addEmptyIntervalRow(this.defaultCategoryName);
      }
    }
  }

  /** Helper to build row elements based on data type, passing necessary context */
  private _buildRowElement(rowData: ScheduleRowData): HTMLElement | null {
    if (rowData.rowType === "group") {
      return buildGroupRowElement(rowData as GroupRowData);
    } else if (rowData.rowType === "interval") {
      const intervalData = rowData as IntervalRowData;
      const categoryName = intervalData.categoryName;
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
      if (this.defaultCategoryName) {
        this.rowManager.addEmptyIntervalRow(this.defaultCategoryName);
      } else {
        alert("Error: Cannot add interval. No default category found.");
      }
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

    if (this.defaultCategoryName) {
      this.rowManager.addEmptyIntervalRow(this.defaultCategoryName);
    } else {
      console.error(
        "Cannot add default row for new schedule: No default category found."
      );
      this.errorDisplay.showMessage(
        "Cannot create new schedule: No feature categories registered.",
        "error"
      );
    }

    this.errorDisplay.removeMessage(); // Clear any previous errors specifically
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
      try {
        parseScheduleJSON(this.uiManager.textEl.value);
        return this.uiManager.textEl.value;
      } catch (e) {
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
      .map((row) => this.rowManager.getRowData(row))
      .filter((d): d is ScheduleRowJSONData => d !== null);
    return generateScheduleJSON(this.scheduleName, rowDataArray);
  }

  /** Sets the editor content from a JSON string (uses updated parser) */
  public setScheduleJSON(jsonString: string, skipSync: boolean = false): void {
    console.log("Setting schedule JSON programmatically.");
    try {
      const parsedDoc = parseScheduleJSON(jsonString);
      this.scheduleName = parsedDoc.name || DEFAULT_SCHEDULE_NAME;
      let prettyJson = jsonString;
      try {
        prettyJson = JSON.stringify(JSON.parse(jsonString), null, 2);
      } catch {}
      this.uiManager.textEl.value = prettyJson;
      this._updateScheduleNameDisplay();
      this.errorDisplay.removeMessage();
      if (!skipSync && this.currentMode === EditorMode.Config) {
        this.syncJSONViewToConfig();
      } else if (skipSync && this.currentMode === EditorMode.Config) {
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
    return this.scheduleBuilder.buildSchedule(
      displayController,
      this.audioController,
      settings,
      maxCanvasHeight
    );
  }
}

// ts/schedule/editor/schedule_editor.ts
import { AudioController } from "../../audio_controller";
import { DisplayController } from "../../display_controller";
import { Schedule } from "../schedule";
import { AppSettings, LAST_RUN_SCHEDULE_JSON_KEY } from "../../settings";
// Use JSON serializer functions
import { parseScheduleJSON, generateScheduleJSON } from "./schedule_serializer";
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

// Import FeatureCategoryName to specify default category
import { FeatureCategoryName } from "../../feature";

enum EditorMode {
  JSON = "json",
  Config = "config",
}

const DEFAULT_SCHEDULE_NAME = "Untitled Schedule";

export class ScheduleEditor {
  public containerEl: HTMLElement;
  private updateAction: () => void;
  private audioController: AudioController;

  // Managers
  private uiManager: EditorUIManager;
  public errorDisplay: ErrorDisplay;
  private selectionManager: SelectionManager;
  private rowManager: RowManager;
  private clipboardManager: ClipboardManager;
  private dndManager: DragDropManager;
  private keyboardManager: KeyboardShortcutManager;
  private scheduleBuilder: ScheduleBuilder;

  // UI Elements for Name Editing
  private scheduleNameDisplayEl!: HTMLElement;
  private editScheduleNameBtnEl!: HTMLElement;

  // State
  private currentMode: EditorMode = EditorMode.Config;
  private scheduleName: string = DEFAULT_SCHEDULE_NAME;

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

    // Instantiate Managers
    this.uiManager = new EditorUIManager(this.containerEl);
    this._findNameEditElements(); // Find name elements early
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
    this.setEditorMode(this.currentMode, true); // Set initial mode without syncing
    this._loadInitialState(); // Load initial data
    this._updateScheduleNameDisplay(); // Set initial name display

    // Ensure config UI is populated if starting in config mode after initial load
    if (this.currentMode === EditorMode.Config) {
      // If text area has content from load, sync it to config view
      if (this.uiManager.textEl.value.trim().length > 0) {
        this.syncJSONViewToConfig();
      }
      // Ensure there's at least one row if config view is still empty
      if (this.uiManager.configEntriesContainerEl.childElementCount === 0) {
        console.log(
          "Config view empty after load, adding default interval row."
        );
        // Provide default category when adding initial row
        this.rowManager.addEmptyIntervalRow(FeatureCategoryName.Guitar); // Pass default category
      }
    }
  }

  /** Finds UI elements related to schedule name editing */
  private _findNameEditElements(): void {
    const headerEl = this.containerEl
      .closest("#schedule-accordion")
      ?.querySelector(".accordion-header");
    if (headerEl) {
      this.scheduleNameDisplayEl = headerEl.querySelector(
        "#schedule-name-display"
      ) as HTMLElement;
      this.editScheduleNameBtnEl = headerEl.querySelector(
        "#edit-schedule-name-btn"
      ) as HTMLElement;
    }
    if (!this.scheduleNameDisplayEl || !this.editScheduleNameBtnEl) {
      console.warn(
        "ScheduleEditor: Schedule name display/edit elements not found. Name editing disabled."
      );
      if (this.editScheduleNameBtnEl)
        this.editScheduleNameBtnEl.style.display = "none";
    }
  }

  /** Updates the schedule name display text */
  private _updateScheduleNameDisplay(): void {
    if (this.scheduleNameDisplayEl) {
      this.scheduleNameDisplayEl.textContent = `Schedule: ${
        this.scheduleName || DEFAULT_SCHEDULE_NAME
      }`;
      this.scheduleNameDisplayEl.style.display = ""; // Ensure visible
    }
    if (this.editScheduleNameBtnEl) {
      this.editScheduleNameBtnEl.style.display = ""; // Ensure visible
    }
  }

  /** Attaches handlers for the inline name editing UI */
  private _attachNameEditHandlers(): void {
    if (!this.editScheduleNameBtnEl || !this.scheduleNameDisplayEl) return;
    this.editScheduleNameBtnEl.onclick = () => {
      const currentName = this.scheduleName;
      const parent = this.scheduleNameDisplayEl.parentNode;
      if (!parent) return;
      const input = document.createElement("input");
      input.type = "text";
      input.classList.add("input", "is-small", "schedule-name-edit-input");
      input.value = currentName;
      input.style.marginLeft = "8px";
      input.style.flexGrow = "1";
      this.scheduleNameDisplayEl.style.display = "none";
      this.editScheduleNameBtnEl.style.display = "none";
      parent.insertBefore(input, this.scheduleNameDisplayEl.nextSibling);
      input.focus();
      input.select();
      const finishEdit = (save: boolean) => {
        if (save) {
          this.scheduleName = input.value.trim() || DEFAULT_SCHEDULE_NAME;
        }
        parent.removeChild(input);
        this._updateScheduleNameDisplay();
      };
      input.onblur = () => finishEdit(true);
      input.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finishEdit(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          finishEdit(false);
        }
      };
    };
  }

  // --- Mode Switching & Syncing ---
  private toggleMode(): void {
    const newMode =
      this.currentMode === EditorMode.JSON
        ? EditorMode.Config
        : EditorMode.JSON;
    this.setEditorMode(newMode);
  }

  private setEditorMode(mode: EditorMode, skipSync: boolean = false): void {
    if (!skipSync) {
      if (mode === EditorMode.Config && this.currentMode === EditorMode.JSON) {
        this.syncJSONViewToConfig();
      } else if (
        mode === EditorMode.JSON &&
        this.currentMode === EditorMode.Config
      ) {
        this.syncConfigToJSONView();
      }
    }
    this.currentMode = mode;
    this.uiManager.setModeUI(mode === EditorMode.JSON);
    console.log("Editor mode set to:", mode);
    if (mode === EditorMode.Config) {
      setTimeout(() => this.uiManager.configEntriesContainerEl.focus(), 0);
    }
  }

  private syncConfigToJSONView(): void {
    try {
      // Use RowManager to get JSON data from each row element
      const rows =
        this.uiManager.configEntriesContainerEl.querySelectorAll<HTMLElement>(
          ".schedule-row"
        );
      const rowDataArray = Array.from(rows)
        .map((row) => this.rowManager.getRowData(row))
        .filter((d): d is ScheduleRowJSONData => d !== null); // Filter out nulls & type guard

      const scheduleJSON = generateScheduleJSON(
        this.scheduleName,
        rowDataArray
      );
      this.uiManager.textEl.value = scheduleJSON;
      this.errorDisplay.removeMessage();
    } catch (error: any) {
      console.error("Error generating schedule JSON:", error);
      this.errorDisplay.showMessage(
        `Error switching to JSON view: ${error.message}`
      );
    }
  }

  private syncJSONViewToConfig(): void {
    try {
      const scheduleJSON = this.uiManager.textEl.value;
      // Parse JSON string into ScheduleRowData[] (using the updated parser)
      const parsedDoc = parseScheduleJSON(scheduleJSON);
      this.scheduleName = parsedDoc.name || DEFAULT_SCHEDULE_NAME;
      this._updateScheduleNameDisplay();

      // Populate UI using the parsed ScheduleRowData array and the builder function
      this.uiManager.populateConfigUI(
        this._buildRowElement.bind(this),
        parsedDoc.items
      );

      this.rowManager.updateAllRowIndentation(); // Apply indentation after populating
      this.selectionManager.clearSelection(); // Clear selection
      this.errorDisplay.removeMessage(); // Clear errors
    } catch (error: any) {
      console.error("Error parsing schedule JSON:", error);
      this.errorDisplay.showMessage(
        `Error parsing JSON input: ${error.message}`
      );
      // Optionally clear the config view or leave it in its previous state?
      // this.uiManager.populateConfigUI(this._buildRowElement.bind(this), []); // Clear UI on error
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
      // Default example schedule (assuming Guitar category for features)
      initialJSON = JSON.stringify(
        {
          name: "Default Example Schedule",
          items: [
            {
              rowType: "interval",
              duration: "5:00",
              task: "Warmup",
              featureCategoryName: "Guitar",
              featureTypeName: "Notes",
              featureArgsList: [],
            },
            { rowType: "group", level: 1, name: "Section 1" },
            {
              rowType: "interval",
              duration: "3:00",
              task: "C Major Scale",
              featureCategoryName: "Guitar",
              featureTypeName: "Scale",
              featureArgsList: ["C"],
            },
            {
              rowType: "interval",
              duration: "3:00",
              task: "G Major Scale",
              featureCategoryName: "Guitar",
              featureTypeName: "Scale",
              featureArgsList: ["G"],
            },
          ],
        },
        null,
        2
      );
    }
    // Set initial state (will parse name and items)
    // Use skipSync=true because we manually sync if needed right after constructor
    this.setScheduleJSON(initialJSON, true);

    // Note: Syncing and adding default row if needed now happens at the end of the constructor
  }

  /** Helper to build row elements based on data type, passing necessary context */
  private _buildRowElement(rowData: ScheduleRowData): HTMLElement | null {
    if (rowData.rowType === "group") {
      // Group rows don't need category context for building
      return buildGroupRowElement(rowData as GroupRowData);
    } else if (rowData.rowType === "interval") {
      const intervalData = rowData as IntervalRowData;
      // Extract category from the row data
      const category = intervalData.featureCategoryName; // Should exist now
      if (!category) {
        console.error(
          "Cannot build interval row: Missing featureCategoryName in rowData",
          intervalData
        );
        // Return a placeholder or null?
        const errorDiv = document.createElement("div");
        errorDiv.textContent = "[Error: Missing Category]";
        errorDiv.style.color = "red";
        errorDiv.classList.add("schedule-row"); // Add class for consistency
        return errorDiv;
      }
      // Pass the category to the builder function
      return buildIntervalRowElement(intervalData, category);
    }
    console.warn("Trying to build unknown row type:", rowData);
    return null;
  }

  /** Attaches handlers to the main editor control buttons */
  private _attachButtonHandlers(): void {
    this.uiManager.modeToggleEl.onclick = () => this.toggleMode();
    this.uiManager.newScheduleButtonEl.onclick = () => this.newSchedule();
    this.uiManager.addConfigEntryButtonEl.onclick = () => {
      // Provide default category when adding via button
      // TODO: Add UI to select category for new rows
      this.rowManager.addEmptyIntervalRow(FeatureCategoryName.Guitar);
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

  /** Callback for selection changes */
  private _onSelectionChange(): void {
    this.uiManager.updateCopyPasteButtonState(
      this.selectionManager.getSelectedElements().size > 0,
      this.clipboardManager.hasCopiedData()
    );
  }

  /** Callback for clipboard changes */
  private _onClipboardChange(canPaste: boolean): void {
    this.uiManager.updateCopyPasteButtonState(
      this.selectionManager.getSelectedElements().size > 0,
      canPaste
    );
  }

  /** Clears the editor content and resets state for a new schedule. */
  public newSchedule(): void {
    if (!confirm("Clear the current schedule and start a new one?")) {
      return;
    }
    console.log("Starting new schedule...");

    this._clearConfigEntries(); // Clear Config UI Rows
    this.uiManager.textEl.value = ""; // Clear Text Editor
    this.scheduleName = DEFAULT_SCHEDULE_NAME; // Reset Schedule Name State
    this._updateScheduleNameDisplay(); // Update UI
    this.selectionManager.clearSelection(true); // Clear Selection
    this.clipboardManager.clearClipboard(); // Clear Clipboard

    // Add a default starting row, specifying the category
    // TODO: Make default category configurable or selectable
    this.rowManager.addEmptyIntervalRow(FeatureCategoryName.Guitar);

    this.errorDisplay.removeMessage(); // Clear errors

    // Ensure editor is in config mode
    if (this.currentMode !== EditorMode.Config) {
      this.setEditorMode(EditorMode.Config, true); // Switch without sync
    }
  }

  /** Helper to remove all row elements from the config container. */
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
      // Validate JSON before returning
      try {
        JSON.parse(this.uiManager.textEl.value);
        return this.uiManager.textEl.value;
      } catch (e) {
        console.error("JSON in text area is invalid when getting schedule.", e);
        this.errorDisplay.showMessage(
          "JSON in text area is invalid. Cannot get schedule."
        );
        // Fallback to generating from config view if JSON is bad
        return this._generateJSONFromConfigView();
      }
    } else {
      // Generate from config view
      return this._generateJSONFromConfigView();
    }
  }

  /** Helper to generate JSON from the config view UI elements */
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

  /** Sets the editor content from a JSON string */
  public setScheduleJSON(jsonString: string, skipSync: boolean = false): void {
    console.log("Setting schedule JSON programmatically.");
    try {
      // Parse first to validate structure and extract name (parser now returns ScheduleRowData[])
      const parsedDoc = parseScheduleJSON(jsonString);
      this.scheduleName = parsedDoc.name || DEFAULT_SCHEDULE_NAME;
      // Pretty-print potentially validated/formatted JSON back to the text area
      this.uiManager.textEl.value = generateScheduleJSON(
        this.scheduleName,
        parsedDoc.items
          .map(
            (item) => this.rowManager.getRowData(this._buildRowElement(item)!)!
          )
          .filter((d): d is ScheduleRowJSONData => d !== null)
      ); // Re-generate from parsed data for consistency
      this._updateScheduleNameDisplay();
      this.errorDisplay.removeMessage(); // Clear previous errors

      if (!skipSync && this.currentMode === EditorMode.Config) {
        // If in config mode and not skipping, sync the UI from the (re-generated) text value
        this.syncJSONViewToConfig();
      } else if (skipSync && this.currentMode === EditorMode.Config) {
        // If skipping sync BUT we are in config mode, we still need to populate UI from parsed data
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
      // Clear UI if loading fails?
      // this.uiManager.textEl.value = "";
      // this._clearConfigEntries();
      // this.rowManager.addEmptyIntervalRow(FeatureCategoryName.Guitar); // Add default row
    }
  }

  /** Builds and returns the Schedule object for the timer */
  public getSchedule(
    displayController: DisplayController,
    settings: AppSettings,
    maxCanvasHeight: number
  ): Schedule | null {
    if (this.currentMode === EditorMode.JSON) {
      this.syncJSONViewToConfig(); // Ensure config view is up-to-date
      if (this.errorDisplay.hasMessage()) {
        console.error(
          "Cannot build schedule due to errors during JSON-to-config sync."
        );
        return null; // Don't build if sync failed
      }
    }
    // Build schedule from the config view elements
    return this.scheduleBuilder.buildSchedule(
      displayController,
      this.audioController,
      settings,
      maxCanvasHeight
    );
  }
}

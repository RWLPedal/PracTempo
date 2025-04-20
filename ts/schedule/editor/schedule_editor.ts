import { AudioController } from "../../audio_controller";
import { DisplayController } from "../../display_controller";
import { Schedule } from "../schedule";
import { AppSettings } from "../../settings";
// Use JSON serializer functions
import {
  parseScheduleJSON,
  generateScheduleJSON,
  ScheduleDocument,
} from "./schedule_serializer";
import {
  buildIntervalRowElement,
  buildGroupRowElement,
  ScheduleRowData,
  IntervalRowData,
  GroupRowData,
  ScheduleRowJSONData, // Type needed for generateScheduleJSON
} from "./interval_row";

// Import managers
import { EditorUIManager } from "./editor_ui_manager";
import { ErrorDisplay } from "./error_display";
import { SelectionManager } from "./selection_manager";
import { RowManager } from "./row_manager";
import { ClipboardManager } from "./clipboard_manager";
import { DragDropManager } from "./drag_drop_manager";
import { KeyboardShortcutManager } from "./keyboard_shortcut_manager";
import { ScheduleBuilder } from "./schedule_builder";

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
  private scheduleName: string = DEFAULT_SCHEDULE_NAME; // Add state for schedule name

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

    // Instantiate Managers (ensure order)
    this.uiManager = new EditorUIManager(this.containerEl); // Creates basic editor layout
    this._findNameEditElements(); // Find name elements after basic UI exists
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
    this._attachNameEditHandlers(); // Attach handlers for name editing
    this.setEditorMode(this.currentMode, true);
    this._loadInitialState();
    this._updateScheduleNameDisplay(); // Set initial name display
  }

  /** Finds UI elements related to schedule name editing */
  private _findNameEditElements(): void {
    // Find elements within the main container (assuming they exist in index.html)
    // Query relative to the main accordion header if possible
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
      // Disable edit button if found but display isn't
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
      this.scheduleNameDisplayEl.style.display = ""; // Ensure it's visible
    }
    if (this.editScheduleNameBtnEl) {
      this.editScheduleNameBtnEl.style.display = ""; // Ensure button is visible
    }
  }

  /** Attaches handlers for the inline name editing UI */
  private _attachNameEditHandlers(): void {
    if (!this.editScheduleNameBtnEl || !this.scheduleNameDisplayEl) return;

    this.editScheduleNameBtnEl.onclick = () => {
      const currentName = this.scheduleName;
      const parent = this.scheduleNameDisplayEl.parentNode;
      if (!parent) return;

      // Create input field
      const input = document.createElement("input");
      input.type = "text";
      input.classList.add("input", "is-small", "schedule-name-edit-input");
      input.value = currentName;
      input.style.marginLeft = "8px"; // Adjust spacing if needed
      input.style.flexGrow = "1"; // Allow input to grow

      // Hide display and button, show input
      this.scheduleNameDisplayEl.style.display = "none";
      this.editScheduleNameBtnEl.style.display = "none";
      // Insert input after the display element's original position
      parent.insertBefore(input, this.scheduleNameDisplayEl.nextSibling);
      input.focus();
      input.select();

      // Handlers for saving/canceling edit
      const finishEdit = (save: boolean) => {
        if (save) {
          const newName = input.value.trim() || DEFAULT_SCHEDULE_NAME;
          this.scheduleName = newName;
        }
        parent.removeChild(input); // Remove input
        this._updateScheduleNameDisplay(); // Restore display and button
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
      const rows =
        this.uiManager.configEntriesContainerEl.querySelectorAll<HTMLElement>(
          ".schedule-row"
        );
      const rowDataArray = Array.from(rows)
        .map((row) => this.rowManager.getRowData(row))
        .filter((d): d is ScheduleRowJSONData => d !== null);
      // Pass current schedule name to generator
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
      // Parse JSON, returns { name?: string, items: ScheduleRowData[] }
      const parsedDoc = parseScheduleJSON(scheduleJSON);
      // Set the schedule name state
      this.scheduleName = parsedDoc.name || DEFAULT_SCHEDULE_NAME;
      this._updateScheduleNameDisplay(); // Update the header UI
      // Populate config UI rows
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
    const lastRunJSON = localStorage.getItem("lastScheduleJSON");
    let initialJSON = "";
    if (lastRunJSON) {
      console.log("Loading last run schedule from localStorage (JSON).");
      initialJSON = lastRunJSON;
    } else {
      console.log(
        "No last run schedule found, loading default example (JSON)."
      );
      initialJSON = JSON.stringify(
        {
          name: "Default Example Schedule", // Add default name
          items: [
            {
              rowType: "interval",
              duration: "5:00",
              task: "Warmup",
              featureTypeName: "Notes",
              featureArgsList: [],
            },
            { rowType: "group", level: 1, name: "Section 1" },
            {
              rowType: "interval",
              duration: "3:00",
              task: "C Major Scale",
              featureTypeName: "Scale",
              featureArgsList: ["C"],
            },
            {
              rowType: "interval",
              duration: "3:00",
              task: "G Major Scale",
              featureTypeName: "Scale",
              featureArgsList: ["G"],
            },
          ],
        },
        null,
        2
      );
    }
    this.setScheduleJSON(initialJSON, true); // Set initial state (will parse name and items)
    // Ensure config UI is populated if it's the initial mode
    if (this.currentMode === EditorMode.Config) {
      this.syncJSONViewToConfig(); // Sync after setting text value
    }

    if (
      this.uiManager.configEntriesContainerEl.childElementCount === 0 &&
      this.currentMode === EditorMode.Config
    ) {
      this.rowManager.addEmptyIntervalRow();
    }
  }

  /** Helper to build row elements based on data type */
  private _buildRowElement(rowData: ScheduleRowData): HTMLElement | null {
    if (rowData.rowType === "group") {
      return buildGroupRowElement(rowData as GroupRowData);
    } else if (rowData.rowType === "interval") {
      return buildIntervalRowElement(rowData as IntervalRowData);
    }
    return null;
  }

  /** Attaches handlers to the main editor control buttons */
  private _attachButtonHandlers(): void {
    this.uiManager.modeToggleEl.onclick = () => this.toggleMode();
    this.uiManager.addConfigEntryButtonEl.onclick = () =>
      this.rowManager.addEmptyIntervalRow();
    this.uiManager.addGroupButtonEl.onclick = () =>
      this.rowManager.addGroupRow();
    this.uiManager.copyButtonEl.onclick = () =>
      this.clipboardManager.copySelectedRows();
    this.uiManager.pasteButtonEl.onclick = () =>
      this.clipboardManager.pasteRows();
    this.uiManager.setScheduleButtonEl.onclick = () => {
      this.errorDisplay.removeMessage();
      this.updateAction(); // Trigger the main application update
    };
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

  /** Gets the current schedule as a JSON string including the name */
  public getScheduleJSON(): string {
    if (this.currentMode === EditorMode.JSON) {
      // Validate the JSON in the text area before returning? Optional.
      try {
        JSON.parse(this.uiManager.textEl.value); // Quick validation
        return this.uiManager.textEl.value;
      } catch (e) {
        console.error("JSON in text area is invalid.", e);
        this.errorDisplay.showMessage(
          "JSON in text area is invalid. Cannot get schedule."
        );
        // Fallback: generate from config view if possible
        const rows =
          this.uiManager.configEntriesContainerEl.querySelectorAll<HTMLElement>(
            ".schedule-row"
          );
        const rowDataArray = Array.from(rows)
          .map((row) => this.rowManager.getRowData(row))
          .filter((d): d is ScheduleRowJSONData => d !== null);
        return generateScheduleJSON(this.scheduleName, rowDataArray);
      }
    } else {
      // Generate JSON from the config UI state + current schedule name
      const rows =
        this.uiManager.configEntriesContainerEl.querySelectorAll<HTMLElement>(
          ".schedule-row"
        );
      const rowDataArray = Array.from(rows)
        .map((row) => this.rowManager.getRowData(row))
        .filter((d): d is ScheduleRowJSONData => d !== null);
      return generateScheduleJSON(this.scheduleName, rowDataArray);
    }
  }

  /** Sets the schedule editor content from a JSON string. */
  public setScheduleJSON(jsonString: string, skipSync: boolean = false): void {
    console.log("Setting schedule JSON programmatically.");
    try {
      // Parse first to ensure validity and extract name
      const parsedDoc = parseScheduleJSON(jsonString);
      this.scheduleName = parsedDoc.name || DEFAULT_SCHEDULE_NAME;
      this.uiManager.textEl.value = jsonString; // Set validated/parsed JSON in text view
      this._updateScheduleNameDisplay(); // Update header UI

      if (!skipSync) {
        this.syncJSONViewToConfig(); // Sync to config view unless skipped
      } else {
        if (this.currentMode === EditorMode.Config) {
          this.syncJSONViewToConfig(); // Populate config UI if active
        }
      }
      console.log("Schedule JSON set in editor.");
    } catch (error: any) {
      console.error("Failed to set schedule JSON:", error);
      this.errorDisplay.showMessage(
        `Failed to load schedule: ${error.message}`
      );
      // Optionally clear the editor or load default on error?
    }
  }

  /** Builds and returns the Schedule object based on the current UI state */
  public getSchedule(
    displayController: DisplayController,
    settings: AppSettings,
    maxCanvasHeight: number // Add maxCanvasHeight parameter
  ): Schedule | null {
    if (this.currentMode === EditorMode.JSON) {
      this.syncJSONViewToConfig(); // Ensure config UI reflects JSON view
      if (this.errorDisplay.hasMessage()) {
        console.error(
          "Cannot build schedule due to errors during JSON-to-config sync."
        );
        return null;
      }
    }
    // ScheduleBuilder reads directly from config UI via RowManager
    // Pass maxCanvasHeight down to the builder
    return this.scheduleBuilder.buildSchedule(
      displayController,
      this.audioController,
      settings,
      maxCanvasHeight // Pass the height constraint here
    );
  }
}

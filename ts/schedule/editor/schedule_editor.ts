// ts/schedule/editor/schedule_editor.ts
import { AudioController } from "../../audio_controller";
import { DisplayController } from "../../display_controller";
import { Schedule } from "../schedule";
import { AppSettings } from "../../settings";
// Use JSON serializer functions
import { parseScheduleJSON, generateScheduleJSON } from "./schedule_serializer"; // Removed ScheduleDocument import as it's mainly internal to serializer
// Import types and UI builders from new location
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

    // Instantiate Managers (ensure order)
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
    // Pass the new method reference to ClipboardManager constructor
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

    this._attachButtonHandlers(); // Attaches all button handlers including the new one
    this._attachNameEditHandlers();
    this.setEditorMode(this.currentMode, true); // Set initial mode without syncing yet
    this._loadInitialState(); // Load initial data (might populate text or config)
    this._updateScheduleNameDisplay(); // Set initial name display
    // Ensure config UI is populated if starting in config mode after initial load
    if (this.currentMode === EditorMode.Config) {
      this.syncJSONViewToConfig(); // Sync from potentially loaded JSON
    }
  }

  // ... (_findNameEditElements, _updateScheduleNameDisplay, _attachNameEditHandlers remain the same) ...

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
      this.scheduleNameDisplayEl.style.display = "";
    }
    if (this.editScheduleNameBtnEl) {
      this.editScheduleNameBtnEl.style.display = "";
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
          const newName = input.value.trim() || DEFAULT_SCHEDULE_NAME;
          this.scheduleName = newName;
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
  // ... (toggleMode, setEditorMode, syncConfigToJSONView, syncJSONViewToConfig remain the same) ...
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
      const parsedDoc = parseScheduleJSON(scheduleJSON);
      this.scheduleName = parsedDoc.name || DEFAULT_SCHEDULE_NAME;
      this._updateScheduleNameDisplay();
      // Use the correct build function reference after refactor
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
  // ... (_loadInitialState remains mostly the same, just ensure it calls setScheduleJSON correctly) ...
  private _loadInitialState(): void {
    const lastRunJSON = localStorage.getItem("lastScheduleJSON"); // Assuming key remains the same for last run
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
          name: "Default Example Schedule",
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
    // Set initial state (will parse name and items)
    // Use skipSync=true because we manually sync if needed right after
    this.setScheduleJSON(initialJSON, true);

    // Ensure config UI is populated if it's the initial mode
    if (this.currentMode === EditorMode.Config) {
      this.syncJSONViewToConfig(); // Sync after setting text value
    }

    // Ensure there's at least one row if config view is empty
    if (
      this.uiManager.configEntriesContainerEl.childElementCount === 0 &&
      this.currentMode === EditorMode.Config
    ) {
      this.rowManager.addEmptyIntervalRow();
    }
  }

  /** Helper to build row elements based on data type */
  private _buildRowElement(rowData: ScheduleRowData): HTMLElement | null {
    // Use the builder functions from their new locations
    if (rowData.rowType === "group") {
      return buildGroupRowElement(rowData as GroupRowData);
    } else if (rowData.rowType === "interval") {
      return buildIntervalRowElement(rowData as IntervalRowData);
    }
    return null;
  }

  /** Attaches handlers to the main editor control buttons */
  private _attachButtonHandlers(): void {
    // Detach existing handlers first? Might not be necessary if setup once
    this.uiManager.modeToggleEl.onclick = () => this.toggleMode();
    // Attach handler for the new button
    this.uiManager.newScheduleButtonEl.onclick = () => this.newSchedule();
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

  /** Clears the editor content and resets state for a new schedule. */
  public newSchedule(): void {
    // Optional: Add a confirmation dialog
    if (!confirm("Clear the current schedule and start a new one?")) {
      return;
    }

    console.log("Starting new schedule...");

    // 1. Clear Config UI Rows
    this._clearConfigEntries();

    // 2. Clear Text Editor
    this.uiManager.textEl.value = "";

    // 3. Reset Schedule Name State and UI
    this.scheduleName = DEFAULT_SCHEDULE_NAME;
    this._updateScheduleNameDisplay();

    // 4. Clear Selection
    this.selectionManager.clearSelection(true); // true to reset last clicked row

    // 5. Clear Clipboard
    this.clipboardManager.clearClipboard(); // Use the new method

    // 6. Add a default starting row (optional)
    this.rowManager.addEmptyIntervalRow();

    // 7. Clear any error messages
    this.errorDisplay.removeMessage();

    // 8. Ensure editor is in config mode? (optional)
    if (this.currentMode !== EditorMode.Config) {
      this.setEditorMode(EditorMode.Config, true); // Switch without sync
    }

    // Optional: Trigger updateAction to reset the main timer view?
    // this.updateAction(); // Or maybe not, let user click "Set Schedule"
  }

  /** Helper to remove all row elements from the config container. */
  private _clearConfigEntries(): void {
    while (this.uiManager.configEntriesContainerEl.firstChild) {
      this.uiManager.configEntriesContainerEl.removeChild(
        this.uiManager.configEntriesContainerEl.firstChild
      );
    }
  }

  // --- getScheduleJSON, setScheduleJSON, getSchedule remain the same conceptually ---
  // Need to ensure they use the correct types/builders after refactor if necessary
  public getScheduleJSON(): string {
    if (this.currentMode === EditorMode.JSON) {
      try {
        JSON.parse(this.uiManager.textEl.value); // Quick validation
        return this.uiManager.textEl.value;
      } catch (e) {
        console.error("JSON in text area is invalid.", e);
        this.errorDisplay.showMessage(
          "JSON in text area is invalid. Cannot get schedule."
        );
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

  public setScheduleJSON(jsonString: string, skipSync: boolean = false): void {
    console.log("Setting schedule JSON programmatically.");
    try {
      const parsedDoc = parseScheduleJSON(jsonString); // Parse first
      this.scheduleName = parsedDoc.name || DEFAULT_SCHEDULE_NAME;
      this.uiManager.textEl.value = jsonString; // Set validated/parsed JSON
      this._updateScheduleNameDisplay();

      if (!skipSync) {
        this.syncJSONViewToConfig();
      } else {
        // If skipping sync BUT we are in config mode, we still need to populate UI
        if (this.currentMode === EditorMode.Config) {
          this.syncJSONViewToConfig();
        }
      }
      console.log("Schedule JSON set in editor.");
    } catch (error: any) {
      console.error("Failed to set schedule JSON:", error);
      this.errorDisplay.showMessage(
        `Failed to load schedule: ${error.message}`
      );
    }
  }

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

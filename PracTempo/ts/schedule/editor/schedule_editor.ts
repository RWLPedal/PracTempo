import { AudioController } from "../../audio_controller";
import { DisplayController } from "../../display_controller";
import { Schedule } from "../schedule";
import { AppSettings } from "../../settings";
import { parseScheduleText, generateScheduleText } from "./config_parser";
import {
  buildIntervalRowElement,
  buildGroupRowElement,
  ScheduleRowData,
} from "./interval_row";

// Import the new manager classes
import { EditorUIManager } from "./editor_ui_manager";
import { ErrorDisplay } from "./error_display";
import { SelectionManager } from "./selection_manager";
import { RowManager } from "./row_manager";
import { ClipboardManager } from "./clipboard_manager";
import { DragDropManager } from "./drag_drop_manager";
import { KeyboardShortcutManager } from "./keyboard_shortcut_manager";
import { ScheduleBuilder } from "./schedule_builder";

enum EditorMode {
  Text = "text",
  Config = "config",
}

export class ScheduleEditor {
  public containerEl: HTMLElement;
  private updateAction: () => void; // Action to trigger when "Set Schedule" is clicked
  private audioController: AudioController; // Needed by ScheduleBuilder

  // Managers
  private uiManager: EditorUIManager;
  private errorDisplay: ErrorDisplay;
  private selectionManager: SelectionManager;
  private rowManager: RowManager;
  private clipboardManager: ClipboardManager;
  private dndManager: DragDropManager;
  private keyboardManager: KeyboardShortcutManager;
  private scheduleBuilder: ScheduleBuilder;

  private currentMode: EditorMode = EditorMode.Config;

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

    // Instantiate Managers (order matters for dependencies)
    this.uiManager = new EditorUIManager(this.containerEl);
    this.errorDisplay = new ErrorDisplay(
      this.containerEl,
      this.uiManager.editorControlsContainerEl
    );
    this.selectionManager = new SelectionManager(
      this.uiManager.configEntriesContainerEl,
      this._onSelectionChange.bind(this) // Callback to update button states
    );
    this.rowManager = new RowManager(
      this.uiManager.configEntriesContainerEl,
      this.selectionManager
    );
    this.clipboardManager = new ClipboardManager(
      this.selectionManager,
      this.rowManager,
      this._onClipboardChange.bind(this) // Callback to update paste button state
    );
    this.dndManager = new DragDropManager(
      this.uiManager.configEntriesContainerEl,
      this.selectionManager,
      this.rowManager
    );
    this.keyboardManager = new KeyboardShortcutManager(
      this.uiManager.configEntriesContainerEl, // Listen on the config container
      this.clipboardManager,
      this.rowManager,
      () => this.currentMode === EditorMode.Config // Enable only in config mode
    );
    this.scheduleBuilder = new ScheduleBuilder(
      this.rowManager,
      this.errorDisplay,
      this.uiManager.configEntriesContainerEl
    );

    this._attachButtonHandlers();
    this.setEditorMode(this.currentMode, true);
    this._loadInitialState();
  }

  private toggleMode(): void {
    const newMode =
      this.currentMode === EditorMode.Text
        ? EditorMode.Config
        : EditorMode.Text;
    this.setEditorMode(newMode);
  }

  private setEditorMode(mode: EditorMode, skipSync: boolean = false): void {
    if (!skipSync) {
      // Sync content between editors when switching
      if (mode === EditorMode.Config && this.currentMode === EditorMode.Text) {
        // Switching Text -> Config
        this.syncTextToConfig();
      } else if (
        mode === EditorMode.Text &&
        this.currentMode === EditorMode.Config
      ) {
        // Switching Config -> Text
        this.syncConfigToText();
      }
    }

    this.currentMode = mode;
    this.uiManager.setModeUI(mode === EditorMode.Text);
    console.log("Editor mode set to:", mode);

    // Ensure focus is appropriate for keyboard shortcuts when switching to config mode
    if (mode === EditorMode.Config) {
      // Small delay might be needed for UI to become visible
      setTimeout(() => this.uiManager.configEntriesContainerEl.focus(), 0);
    }
  }

  private syncConfigToText(): void {
    try {
      const scheduleText = generateScheduleText(
        this.uiManager.configEntriesContainerEl
      );
      this.uiManager.textEl.value = scheduleText;
      this.errorDisplay.removeMessage();
    } catch (error: any) {
      console.error("Error generating schedule text:", error);
      this.errorDisplay.showMessage(
        `Error switching to text mode: ${error.message}`
      );
      // Optionally prevent mode switch on error?
    }
  }

  private syncTextToConfig(): void {
    try {
      const scheduleText = this.uiManager.textEl.value;
      const rowDataArray = parseScheduleText(scheduleText);
      this.uiManager.populateConfigUI(
        this._buildRowElement.bind(this),
        rowDataArray
      );
      this.rowManager.updateAllRowIndentation(); // Update indentation after populating
      this.selectionManager.clearSelection(); // Clear selection after repopulating
      this.errorDisplay.removeMessage();
    } catch (error: any) {
      console.error("Error parsing schedule text:", error);
      this.errorDisplay.showMessage(
        `Error parsing text input: ${error.message}`
      );
      // Optionally prevent mode switch on error?
    }
  }

  private _loadInitialState(): void {
    // Load default/saved text into the text editor first
    // Example: Load from localStorage or use a default
    const initialText =
      localStorage.getItem("lastScheduleText") ||
      "# Example Schedule\n5:00, Warmup, Notes\n# Section 1\n## Scales\n3:00, C Major Scale, Scale, C\n3:00, G Major Scale, Scale, G\n## Chords\n2:00, C/G/Am/F Chords, Chord, C_MAJOR, G_MAJOR, A_MINOR, F_MAJOR, @BPM:60";
    this.uiManager.textEl.value = initialText;

    // Populate the config UI based on the initial text
    this.syncTextToConfig();

    // Ensure at least one row exists in config mode if it's empty
    if (
      this.uiManager.configEntriesContainerEl.childElementCount === 0 &&
      this.currentMode === EditorMode.Config
    ) {
      this.rowManager.addEmptyIntervalRow();
    }
  }

  // Callback for populating UI
  private _buildRowElement(rowData: ScheduleRowData): HTMLElement | null {
    if (rowData.rowType === "group") {
      return buildGroupRowElement(rowData);
    } else if (rowData.rowType === "interval") {
      return buildIntervalRowElement(rowData);
    }
    return null;
  }

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
      this.errorDisplay.removeMessage(); // Clear errors before trying to set
      this.updateAction(); // Trigger the main application's reset/load
    };
  }

  // Called by SelectionManager when selection changes
  private _onSelectionChange(): void {
    this.uiManager.updateCopyPasteButtonState(
      this.selectionManager.getSelectedElements().size > 0,
      this.clipboardManager.hasCopiedData()
    );
  }

  // Called by ClipboardManager when clipboard content changes
  private _onClipboardChange(canPaste: boolean): void {
    this.uiManager.updateCopyPasteButtonState(
      this.selectionManager.getSelectedElements().size > 0,
      canPaste
    );
  }

  /** Gets the current schedule text from the active editor */
  public getScheduleText(): string {
    if (this.currentMode === EditorMode.Text) {
      return this.uiManager.textEl.value;
    } else {
      // Ensure text editor is synced before returning if needed,
      // or just generate fresh from config UI
      return generateScheduleText(this.uiManager.configEntriesContainerEl);
    }
  }

  /** Sets the schedule text in both editors and triggers an update */
  public setScheduleText(text: string): void {
    console.log("Setting schedule text programmatically.");
    this.uiManager.textEl.value = text; // Set text editor value

    // Sync to config editor
    this.syncTextToConfig();

    this.updateAction();
    console.log("Schedule text set and UI/timer reset.");
  }

  /** Builds and returns the Schedule object based on the current UI state */
  public getSchedule(
    displayController: DisplayController,
    // audioController is passed in constructor
    settings: AppSettings
  ): Schedule | null {
    // Ensure config UI is up-to-date if currently in text mode
    if (this.currentMode === EditorMode.Text) {
      this.syncTextToConfig();
      // Handle potential errors during sync? If syncTextToConfig throws, maybe return null?
    }
    // Delegate building to the ScheduleBuilder
    return this.scheduleBuilder.buildSchedule(
      displayController,
      this.audioController,
      settings
    );
  }
}

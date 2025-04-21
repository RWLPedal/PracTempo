// ts/schedule/editor/clipboard_manager.ts
import { RowManager } from "./row_manager";
import {
  ScheduleRowJSONData,
  IntervalDataJSON,
  GroupDataJSON,
  IntervalRowData,
  GroupRowData,
  IntervalSettings // Import base settings type
} from "./interval/types";
import { SelectionManager } from "./selection_manager";
// Import factory getter and FeatureCategoryName enum
import { getIntervalSettingsFactory } from "../../feature_registry";
import { FeatureCategoryName } from "../../feature";
// Import the builder for interval rows
import { buildIntervalRowElement } from "./interval/interval_row_ui";


export class ClipboardManager {
  private selectionManager: SelectionManager;
  private rowManager: RowManager;
  private clipboardData: ScheduleRowJSONData[] = [];
  private onClipboardChangeCallback: (canPaste: boolean) => void;

  constructor(
    selectionManager: SelectionManager,
    rowManager: RowManager,
    onClipboardChangeCallback: (canPaste: boolean) => void
  ) {
    this.selectionManager = selectionManager;
    this.rowManager = rowManager;
    this.onClipboardChangeCallback = onClipboardChangeCallback;
  }

  /** Clears the internal clipboard data. */
  public clearClipboard(): void {
    this.clipboardData = [];
    console.log("Internal clipboard cleared.");
    this.onClipboardChangeCallback(this.hasCopiedData()); // Update UI
  }

  /** Copies the currently selected rows' data to the internal clipboard. */
  public copySelectedRows(): void {
    const selectedRows = this.selectionManager.getSelectedElementsInDomOrder();
    if (selectedRows.length === 0) {
      console.log("Nothing selected to copy.");
      return;
    }
    // Use RowManager.getRowData which now includes featureCategoryName for intervals
    this.clipboardData = selectedRows
      .map((row) => this.rowManager.getRowData(row))
      .filter((data): data is ScheduleRowJSONData => data !== null); // Type guard

    console.log(
      `Copied ${this.clipboardData.length} rows to internal clipboard:`,
      JSON.stringify(this.clipboardData) // Log stringified data for inspection
    );
    this.onClipboardChangeCallback(this.hasCopiedData()); // Update UI
  }

  /** Pastes rows from the internal clipboard after the last selected element. */
  public pasteRows(): void {
    if (!this.hasCopiedData()) {
      console.log("Clipboard is empty, nothing to paste.");
      return;
    }

    console.log(`Pasting ${this.clipboardData.length} rows...`);
    // Determine insertion point
    const insertAfterElement = this.selectionManager.getLastSelectedElementInDomOrder();
    let lastPastedElement: HTMLElement | null = insertAfterElement; // Track insertion point

    this.clipboardData.forEach((rowDataJSON) => {
      let newRowElement: HTMLElement | null = null;
      try {
        if (rowDataJSON.rowType === "group") {
          // Pasting a group row (category doesn't apply here)
          const groupUIData: GroupRowData = { ...rowDataJSON }; // Simple copy
          newRowElement = this.rowManager.addGroupRow(
            groupUIData.level,
            groupUIData.name,
            lastPastedElement
          );
        } else if (rowDataJSON.rowType === "interval") {
          // Pasting an interval row
          const intervalJsonData = rowDataJSON as IntervalDataJSON; // Cast for easier access

          // --- Determine Category and Settings Instance ---
          const category = intervalJsonData.featureCategoryName ?? FeatureCategoryName.Guitar; // Default if missing (shouldn't happen)
          if (!intervalJsonData.featureCategoryName) {
              console.warn("Pasting interval row missing categoryName, defaulting to Guitar.");
          }

          let settingsInstance: IntervalSettings;
          const settingsFactory = getIntervalSettingsFactory(category);
          const settingsJsonData = intervalJsonData.intervalSettings;

          // TODO: This still requires a category-aware way to create settings *from JSON*.
          // Using the factory directly only creates *default* settings.
          // For now, create default and attempt to overlay JSON data generically.
          if (settingsFactory) {
              settingsInstance = settingsFactory();
              if (settingsJsonData) {
                  Object.assign(settingsInstance, settingsJsonData);
                  console.warn(`Pasted interval settings for ${category} applied generically. Specific parsing logic might be needed.`);
              }
          } else {
              console.error(`Cannot paste settings: No factory for category ${category}. Using basic object.`);
              settingsInstance = { toJSON: () => (settingsJsonData || {}) };
               if (settingsJsonData) { Object.assign(settingsInstance, settingsJsonData); }
          }
          // --- End Settings Instance Creation ---

          // Create the UI data structure expected by buildIntervalRowElement
          const intervalUIData: IntervalRowData = {
            rowType: "interval",
            duration: intervalJsonData.duration,
            task: intervalJsonData.task,
            featureCategoryName: category, // Use determined category
            featureTypeName: intervalJsonData.featureTypeName,
            featureArgsList: intervalJsonData.featureArgsList,
            intervalSettings: settingsInstance, // Use created instance
          };

          // Build the element, passing the correct category
          newRowElement = buildIntervalRowElement(intervalUIData, category); // Pass category
          this.rowManager.insertRowElement(newRowElement, lastPastedElement); // Insert it

        }

        if (newRowElement) {
          lastPastedElement = newRowElement; // Update insertion point for the next row
        }
      } catch (error) {
        console.error("Error pasting row:", rowDataJSON, error);
        // Optionally add UI feedback about the error
      }
    });

    // Select the newly pasted rows? Optional. For now, clear selection.
    this.selectionManager.clearSelection();
    this.rowManager.updateAllRowIndentation(); // Update indent after pasting all rows
  }

  /** Checks if there is data in the internal clipboard. */
  public hasCopiedData(): boolean {
    return this.clipboardData.length > 0;
  }
}
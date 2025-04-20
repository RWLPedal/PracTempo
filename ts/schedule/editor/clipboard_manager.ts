import {
  RowManager
} from "./row_manager"; // Import JSON types
import {
  ScheduleRowJSONData,
  IntervalDataJSON,
  GroupDataJSON} from "./interval_row";
import { SelectionManager } from "./selection_manager";
import { GuitarIntervalSettings } from "../../guitar/guitar_interval_settings"; // Import class for instantiation
import { IntervalRowData, GroupRowData } from "./interval_row"; // Import UI data types

export class ClipboardManager {
  private selectionManager: SelectionManager;
  private rowManager: RowManager;
  private clipboardData: ScheduleRowJSONData[] = []; // Store JSON-compatible data
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

  public copySelectedRows(): void {
    const selectedRows = this.selectionManager.getSelectedElementsInDomOrder();
    if (selectedRows.length === 0) {
      console.log("Nothing selected to copy.");
      return;
    }

    this.clipboardData = selectedRows
      .map((row) => this.rowManager.getRowData(row)) // Get JSON data structure
      .filter((data): data is ScheduleRowJSONData => data !== null); // Filter out nulls and assert type

    console.log(
      `Copied ${this.clipboardData.length} rows to internal clipboard.`
    );
    this.onClipboardChangeCallback(this.hasCopiedData()); // Notify UI update
  }

  public pasteRows(): void {
    if (!this.hasCopiedData()) {
      console.log("Clipboard is empty, nothing to paste.");
      return;
    }

    console.log(`Pasting ${this.clipboardData.length} rows...`);
    let lastPastedElement: HTMLElement | null = null;

    this.clipboardData.forEach((rowDataJSON) => {
      let newRowElement: HTMLElement | null = null;
      try {
        // Convert the plain JSON data back into the structure expected by build*Element functions
        if (rowDataJSON.rowType === "group") {
          // Group data likely doesn't need complex conversion
          const groupUIData: GroupRowData = { ...rowDataJSON };
          newRowElement = this.rowManager.addGroupRow(
            groupUIData.level,
            groupUIData.name,
            lastPastedElement // Insert after the previously pasted element
          );
        } else if (rowDataJSON.rowType === "interval") {
          // *** FIX: Instantiate GuitarIntervalSettings using fromJSON ***
          const intervalSettingsInstance = GuitarIntervalSettings.fromJSON(
            rowDataJSON.intervalSettings
          );
          const intervalUIData: IntervalRowData = {
            ...rowDataJSON, // Spread properties from JSON data
            intervalSettings: intervalSettingsInstance, // Assign the INSTANCE
          };
          newRowElement =
            this.rowManager.addEmptyIntervalRow(lastPastedElement); // Add empty row first
          // Now manually update the content based on intervalUIData,
          // because addEmptyIntervalRow uses defaults.
          // OR modify addEmptyIntervalRow to accept initial data (better).
          // Let's assume addEmptyIntervalRow needs modification or we update manually.
          // For now, let's just log the data that *should* be used.
          console.log(
            "Pasting Interval Data (needs full population):",
            intervalUIData
          );
          // If addEmptyIntervalRow were modified:
          // newRowElement = this.rowManager.addIntervalRow(intervalUIData, lastPastedElement);

          // --- Manual update approach (less ideal) ---
          if (newRowElement) {
            // Query inputs and set values - This is brittle!
            (
              newRowElement.querySelector(
                ".config-duration"
              ) as HTMLInputElement
            ).value = intervalUIData.duration;
            (
              newRowElement.querySelector(".config-task") as HTMLInputElement
            ).value = intervalUIData.task;
            const featureSelect = newRowElement.querySelector(
              ".config-feature-type"
            ) as HTMLSelectElement;
            featureSelect.value = intervalUIData.featureTypeName;
            // Trigger change to update args section, passing the INSTANCE
            (newRowElement as any)._intervalSettings = intervalSettingsInstance; // Store instance
            featureSelect.dispatchEvent(new Event("change"));
            // Args population needs to happen *after* change event finishes? Async issue?
            // It's better to modify addEmptyIntervalRow/create addIntervalRow
          }
        }

        if (newRowElement) {
          lastPastedElement = newRowElement; // Update insertion point for next row
        }
      } catch (error) {
        console.error("Error pasting row:", rowDataJSON, error);
        // Optionally notify user
      }
    });

    // Select the newly pasted rows
    // This needs refinement - how to get references to the actual pasted elements?
    // Maybe RowManager's add methods should return the element? (They do)
    // For now, just clear selection.
    this.selectionManager.clearSelection();
    this.rowManager.updateAllRowIndentation(); // Update indent after pasting
  }

  public hasCopiedData(): boolean {
    return this.clipboardData.length > 0;
  }
}

// ts/schedule/editor/clipboard_manager.ts
// ... (imports remain the same) ...
import { RowManager } from "./row_manager";
import {
  ScheduleRowJSONData,
  IntervalDataJSON,
  GroupDataJSON,
  IntervalRowData,
  GroupRowData,
} from "./interval/types"; // Adjusted import
import { SelectionManager } from "./selection_manager";
import { GuitarIntervalSettings } from "../../guitar/guitar_interval_settings";

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

  // ... (copySelectedRows, pasteRows, hasCopiedData methods remain the same) ...

  /** Clears the internal clipboard data. */
  public clearClipboard(): void {
    this.clipboardData = [];
    console.log("Internal clipboard cleared.");
    this.onClipboardChangeCallback(this.hasCopiedData()); // Update UI paste button state
  }

  // ... copySelectedRows implementation ...
  public copySelectedRows(): void {
    const selectedRows = this.selectionManager.getSelectedElementsInDomOrder();
    if (selectedRows.length === 0) {
      console.log("Nothing selected to copy.");
      return;
    }
    this.clipboardData = selectedRows
      .map((row) => this.rowManager.getRowData(row))
      .filter((data): data is ScheduleRowJSONData => data !== null);

    console.log(
      `Copied ${this.clipboardData.length} rows to internal clipboard:`,
      this.clipboardData
    );
    this.onClipboardChangeCallback(this.hasCopiedData());
  }

  // ... pasteRows implementation ...
  public pasteRows(): void {
    if (!this.hasCopiedData()) {
      console.log("Clipboard is empty, nothing to paste.");
      return;
    }

    console.log(`Pasting ${this.clipboardData.length} rows...`);
    // Determine insertion point: after last selected element in DOM order
    const insertAfterElement =
      this.selectionManager.getLastSelectedElementInDomOrder();
    let lastPastedElement: HTMLElement | null = insertAfterElement; // Track last pasted element for sequential insertion

    this.clipboardData.forEach((rowDataJSON, index) => {
      let newRowElement: HTMLElement | null = null;
      try {
        if (rowDataJSON.rowType === "group") {
          const groupUIData: GroupRowData = { ...rowDataJSON };
          newRowElement = this.rowManager.addGroupRow(
            groupUIData.level,
            groupUIData.name,
            lastPastedElement // Insert after the previous one
          );
        } else if (rowDataJSON.rowType === "interval") {
          // Instantiate settings correctly
          const intervalSettingsInstance = GuitarIntervalSettings.fromJSON(
            rowDataJSON.intervalSettings
          );
          // Create the data structure expected by buildIntervalRowElement
          const intervalUIData: IntervalRowData = {
            ...rowDataJSON,
            intervalSettings: intervalSettingsInstance,
          };
          // Use the RowManager to add the row with the correct data
          // NOTE: This assumes rowManager has a method like addIntervalRow that accepts data,
          // or we adapt buildIntervalRowElement usage here. Let's use build directly.
          newRowElement = buildIntervalRowElement(intervalUIData); // Build element with data
          this.rowManager.insertRowElement(newRowElement, lastPastedElement); // Insert it
        }

        if (newRowElement) {
          lastPastedElement = newRowElement; // Update insertion point
        }
      } catch (error) {
        console.error("Error pasting row:", rowDataJSON, error);
      }
    });

    // Select the newly pasted rows? Optional. For now, clear selection.
    this.selectionManager.clearSelection();
    this.rowManager.updateAllRowIndentation(); // Update indent after pasting
  }

  // ... hasCopiedData implementation ...
  public hasCopiedData(): boolean {
    return this.clipboardData.length > 0;
  }
}

// Need to import buildIntervalRowElement if not already done
import { buildIntervalRowElement } from "./interval/interval_row_ui";

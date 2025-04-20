import { ScheduleRowData, GroupRowData, IntervalRowData, buildGroupRowElement, buildIntervalRowElement } from "./interval_row";
import { RowManager } from "./row_manager";
import { SelectionManager } from "./selection_manager";
import { GuitarIntervalSettings } from "../../guitar/guitar_interval_settings"; // <-- Import the class

export class ClipboardManager {
  private copiedRowsData: ScheduleRowData[] = [];
  private selectionManager: SelectionManager;
  private rowManager: RowManager;
  private onClipboardChange: (canPaste: boolean) => void;

  constructor(
    selectionManager: SelectionManager,
    rowManager: RowManager,
    onClipboardChange: (canPaste: boolean) => void
  ) {
    this.selectionManager = selectionManager;
    this.rowManager = rowManager;
    this.onClipboardChange = onClipboardChange;
  }

  public copySelectedRows(): void {
    const selectedRows = this.selectionManager.getSelectedElementsInDomOrder();
    if (selectedRows.length === 0) {
      this.copiedRowsData = [];
    } else {
      this.copiedRowsData = selectedRows
        .map((row) => this.rowManager.getRowData(row))
        .filter((data): data is ScheduleRowData => data !== null); // Type guard
      console.log(
        `Copied ${this.copiedRowsData.length} rows to internal clipboard.`
      );
    }
    this.onClipboardChange(this.hasCopiedData());
  }

  public pasteRows(): void {
    if (!this.hasCopiedData()) {
      console.log("Nothing in clipboard to paste.");
      return;
    }

    const lastSelected =
      this.selectionManager.getLastSelectedElementInDomOrder();
    let insertAfter: HTMLElement | null = lastSelected;

    console.log(
      `Pasting ${this.copiedRowsData.length} rows after element:`,
      insertAfter
    );

    // Create new elements from copied data
    this.copiedRowsData.forEach((rowData) => {
      let newElement: HTMLElement | null = null;
      // Create deep copies of settings if applicable
      let dataToBuild = { ...rowData };
      if (dataToBuild.rowType === "interval" && dataToBuild.intervalSettings) {
        dataToBuild.intervalSettings = new GuitarIntervalSettings(
            dataToBuild.intervalSettings.metronomeBpm
        );
      }

      if (dataToBuild.rowType === "group") {
        // Cast needed because TS might infer dataToBuild too narrowly after the 'interval' check
        newElement = buildGroupRowElement(dataToBuild as GroupRowData);
      } else if (dataToBuild.rowType === "interval") {
         // Cast needed because TS might infer dataToBuild too narrowly after the 'group' check
        newElement = buildIntervalRowElement(dataToBuild as IntervalRowData);
      }

      if (newElement) {
        this.rowManager.insertRowElement(newElement, insertAfter);
        insertAfter = newElement; // Insert subsequent pasted rows after the previously pasted one
      }
    });

    // Optionally clear selection after paste? Or select the newly pasted items?
    // this.selectionManager.clearSelection();

    this.rowManager.updateAllRowIndentation(); // Update indentation after pasting
  }

  public hasCopiedData(): boolean {
    return this.copiedRowsData.length > 0;
  }
}

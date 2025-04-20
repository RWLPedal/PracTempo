import {
  buildIntervalRowElement,
  buildGroupRowElement,
  applyIndentation,
  ScheduleRowData, // Still used by clipboard/add internally? Review if needed.
  GroupRowData,   // For addGroupRow parameter type check
  IntervalRowData,// For addEmptyIntervalRow parameter type check
  // Import the JSON structure types
  GroupDataJSON,
  IntervalDataJSON,
  ScheduleRowJSONData
} from "./interval_row";
import { GuitarIntervalSettings } from "../../guitar/guitar_interval_settings";
import { SelectionManager } from "./selection_manager";

export class RowManager {
  private configEntriesContainerEl: HTMLElement;
  private selectionManager: SelectionManager;

  constructor(
    configEntriesContainerEl: HTMLElement,
    selectionManager: SelectionManager
  ) {
    this.configEntriesContainerEl = configEntriesContainerEl;
    this.selectionManager = selectionManager;
    this._addRowCopyHandler();
  }

  /** Adds an empty interval row to the UI */
  public addEmptyIntervalRow(
    insertAfterElement?: HTMLElement | null
  ): HTMLElement {
     // Need to create IntervalRowData compatible with buildIntervalRowElement's expectation
     const newRowUIData: IntervalRowData = {
        rowType: "interval",
        duration: "3:00",
        task: "",
        featureTypeName: "",
        featureArgsList: [],
        intervalSettings: new GuitarIntervalSettings(), // Provide instance
      };
    const newRowElement = buildIntervalRowElement(newRowUIData);
    this.insertRowElement(newRowElement, insertAfterElement);
    return newRowElement;
  }

  /** Adds a group row to the UI */
  public addGroupRow(
    level: number = 1,
    name: string = "",
    insertAfterElement?: HTMLElement | null
  ): HTMLElement {
    // Need to create GroupRowData compatible with buildGroupRowElement's expectation
    const newRowUIData: GroupRowData = {
        rowType: "group",
        level: Math.max(1, level),
        name: name || `New Group Level ${level}`,
    };
    const newRowElement = buildGroupRowElement(newRowUIData);
    this.insertRowElement(newRowElement, insertAfterElement);
    return newRowElement;
  }

  public insertRowElement(
    newRowElement: HTMLElement,
    insertAfterElement?: HTMLElement | null
  ): void {
    let effectiveInsertAfter = insertAfterElement;
    if (!effectiveInsertAfter) {
      effectiveInsertAfter =
        this.selectionManager.getLastSelectedElementInDomOrder();
    }

    if (
      effectiveInsertAfter &&
      effectiveInsertAfter.parentNode === this.configEntriesContainerEl
    ) {
      this.configEntriesContainerEl.insertBefore(
        newRowElement,
        effectiveInsertAfter.nextSibling
      );
    } else {
      this.configEntriesContainerEl.appendChild(newRowElement);
    }
    this.updateAllRowIndentation();
  }

  public deleteSelectedRows(): void {
    const selectedRows = this.selectionManager.getSelectedElementsInDomOrder();
    if (selectedRows.length === 0) return;
    selectedRows.forEach((row) => row.remove());
    this.selectionManager.clearSelection();
    this.updateAllRowIndentation();
  }

  public updateAllRowIndentation(): void {
    const rows = Array.from(
      this.configEntriesContainerEl.querySelectorAll<HTMLElement>(".schedule-row")
    );
    const levelStack: number[] = [0];
    rows.forEach((row) => {
      const rowType = row.dataset.rowType;
      let currentIndentLevel = levelStack[levelStack.length - 1];
      if (rowType === "group") {
        const groupLevel = parseInt(row.dataset.level || "1", 10);
        while (levelStack.length > 1 && levelStack[levelStack.length - 1] >= groupLevel) {
          levelStack.pop();
        }
        currentIndentLevel = levelStack[levelStack.length - 1];
        applyIndentation(row, currentIndentLevel);
        levelStack.push(groupLevel);
      } else { // Apply indent to interval or unknown rows
        applyIndentation(row, currentIndentLevel);
      }
    });
  }

  /**
   * Extracts data from a single row element into a JSON-compatible structure.
   * @param rowElement - The HTML element for the schedule row (.schedule-row).
   * @returns {ScheduleRowJSONData | null} Plain data object or null if extraction fails.
   */
  public getRowData(rowElement: HTMLElement): ScheduleRowJSONData | null { // Update return type annotation
    const rowType = rowElement.dataset.rowType;
    try {
      if (rowType === "group") {
        const level = parseInt(rowElement.dataset.level || "1", 10);
        const name = (rowElement.querySelector(".group-name-input") as HTMLInputElement)?.value.trim() || "";
        const groupData: GroupDataJSON = { rowType: "group", level, name }; // Use imported type
        return groupData;

      } else if (rowType === "interval") {
        const duration = (rowElement.querySelector(".config-duration") as HTMLInputElement)?.value.trim() || "0:00";
        const task = (rowElement.querySelector(".config-task") as HTMLInputElement)?.value.trim() || "";
        const featureTypeName = (rowElement.querySelector(".config-feature-type") as HTMLSelectElement)?.value.trim() || "";

        const intervalSettingsInstance = ((rowElement as any)._intervalSettings as GuitarIntervalSettings) ?? new GuitarIntervalSettings();
        const intervalSettingsJSON = intervalSettingsInstance.toJSON();

        const featureArgsList: string[] = [];
        const argsContainer = rowElement.querySelector(".config-feature-args-container .feature-args-inner-container");

        if (argsContainer) {
            // ... (logic for iterating wrappers and extracting args remains the same) ...
             const argWrappers = argsContainer.querySelectorAll<HTMLElement>(":scope > .feature-arg-wrapper");
            argWrappers.forEach(wrapper => {
                const inputsContainer = wrapper.querySelector<HTMLElement>(".feature-arg-inputs-container");
                if (!inputsContainer) return;
                const uiType = inputsContainer.dataset.uiComponentType;
                const isVariadic = inputsContainer.dataset.isVariadic === 'true';
                if (uiType === 'toggle_button_selector') { // Use correct name
                    const activeButtons = inputsContainer.querySelectorAll<HTMLButtonElement>(".numeral-toggle-btn.is-active");
                    const selectedValues = Array.from(activeButtons).map(btn => btn.dataset.value || '');
                    featureArgsList.push(...selectedValues);
                } else if (uiType === 'ellipsis') { /* no-op */ }
                else if (isVariadic) {
                    const variadicInputs = inputsContainer.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".config-feature-arg, .select > select");
                    variadicInputs.forEach(input => { if (input.value?.trim()) featureArgsList.push(input.value.trim()); });
                } else {
                    const inputElement = inputsContainer.querySelector<HTMLInputElement | HTMLSelectElement>(".config-feature-arg, .select > select");
                    featureArgsList.push(inputElement?.value?.trim() ?? "");
                }
            });
        }

        // Construct the plain data object for the interval
        const intervalData: IntervalDataJSON = { // Use imported type
          rowType: "interval",
          duration,
          task,
          featureTypeName,
          featureArgsList,
        };
        if (intervalSettingsJSON) {
            intervalData.intervalSettings = intervalSettingsJSON;
        }
        console.log(`[DEBUG] getRowData (JSON Mode) - Feature: ${featureTypeName}, Data:`, JSON.stringify(intervalData));
        return intervalData;

      } else {
        console.warn("Unknown row type found:", rowType, rowElement);
        return null;
      }
    } catch (error) {
      console.error("Error getting data for row:", rowElement, error);
      return null;
    }
  }

  // Add listener for copy icon clicks within rows
  private _addRowCopyHandler(): void {
    this.configEntriesContainerEl.addEventListener("click", (e) => {
      const targetElement = e.target as HTMLElement;
      const copyButton = targetElement.closest(".copy-row-btn");
      if (copyButton) {
        e.stopPropagation();
        const rowToCopy = targetElement.closest<HTMLElement>(".schedule-row");
        if (rowToCopy) {
          this.selectionManager.selectSingleRow(rowToCopy);
           rowToCopy.style.transition = "background-color 0.1s ease-out";
           rowToCopy.style.backgroundColor = "rgba(72, 199, 116, 0.3)";
           setTimeout(() => { rowToCopy.style.backgroundColor = ""; }, 200);
          console.log("Row selected via icon click for copying.");
        }
      }
    });
  }
}
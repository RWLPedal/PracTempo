import {
  GroupRowData,
  IntervalRowData, // Import IntervalRowData
  GroupDataJSON,
  IntervalDataJSON,
  ScheduleRowJSONData,
  IntervalSettings,
} from "./interval/types";
import { buildGroupRowElement } from "./interval/group_row_ui";
import { buildIntervalRowElement } from "./interval/interval_row_ui";
import { SelectionManager } from "./selection_manager";
import { applyIndentation } from "./interval/common_ui_elements";
import { getIntervalSettingsFactory } from "../../feature_registry"; // Keep factory getter

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

  /**
   * Creates the data structure for a new, empty interval row.
   * @param categoryName The name of the category for the new row.
   * @returns An IntervalRowData object or null if the category is invalid.
   */
  public createEmptyIntervalUIData(
    categoryName: string
  ): IntervalRowData | null {
    const settingsFactory = getIntervalSettingsFactory(categoryName);
    if (!settingsFactory) {
      console.error(
        `Cannot create empty row data: No IntervalSettings factory found for category "${categoryName}".`
      );
      return null; // Indicate failure
    }
    const defaultSettings: IntervalSettings = settingsFactory();

    // Create Row Data using the created default settings instance
    const newRowUIData: IntervalRowData = {
      rowType: "interval",
      duration: "3:00", // Default duration
      task: "",
      categoryName: categoryName, // Assign the category name string
      featureTypeName: "",
      featureArgsList: [],
      intervalSettings: defaultSettings, // Assign instance from factory
    };
    return newRowUIData;
  }

  /** Adds an empty interval row to the UI for a specific category */
  public addEmptyIntervalRow(
    categoryName: string,
    insertAfterElement?: HTMLElement | null
  ): HTMLElement | null {
    // Return null on failure
    // Create the data structure using the new helper method
    const newRowUIData = this.createEmptyIntervalUIData(categoryName);
    if (!newRowUIData) {
      return null; // Failed to create data (e.g., invalid category)
    }

    // Pass the category name string and data to the builder function
    const newRowElement = buildIntervalRowElement(newRowUIData, categoryName);
    this.insertRowElement(newRowElement, insertAfterElement); // Insert into DOM
    return newRowElement;
  }

  /** Adds a group row to the UI (No change needed here) */
  public addGroupRow(
    level: number = 1,
    name: string = "",
    insertAfterElement?: HTMLElement | null
  ): HTMLElement {
    const newRowUIData: GroupRowData = {
      rowType: "group",
      level: Math.max(1, level),
      name: name || `New Group Level ${level}`,
    };
    const newRowElement = buildGroupRowElement(newRowUIData);
    this.insertRowElement(newRowElement, insertAfterElement);
    return newRowElement;
  }

  /** Inserts a row element into the container (No change needed here) */
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

  /** Deletes all currently selected rows (No change needed here) */
  public deleteSelectedRows(): void {
    const selectedRows = this.selectionManager.getSelectedElementsInDomOrder();
    if (selectedRows.length === 0) return;
    selectedRows.forEach((row) => row.remove());
    this.selectionManager.clearSelection();
    this.updateAllRowIndentation();
  }

  /** Recalculates and applies indentation to all rows (No change needed here) */
  public updateAllRowIndentation(): void {
    const rows = Array.from(
      this.configEntriesContainerEl.querySelectorAll<HTMLElement>(
        ".schedule-row"
      )
    );
    const levelStack: number[] = [0];
    rows.forEach((row) => {
      const rowType = row.dataset.rowType;
      let currentIndentLevel = levelStack[levelStack.length - 1];
      if (rowType === "group") {
        const groupLevel = parseInt(row.dataset.level || "1", 10);
        while (
          levelStack.length > 1 &&
          levelStack[levelStack.length - 1] >= groupLevel
        ) {
          levelStack.pop();
        }
        currentIndentLevel = levelStack[levelStack.length - 1];
        applyIndentation(row, currentIndentLevel);
        levelStack.push(groupLevel);
      } else {
        applyIndentation(row, currentIndentLevel);
      }
    });
  }

  /**
   * Extracts data from a single row element into a JSON-compatible structure.
   * Includes the categoryName string for interval rows.
   * @param rowElement - The HTML element for the schedule row (.schedule-row).
   * @returns {ScheduleRowJSONData | null} Plain data object or null if extraction fails.
   */
  public getRowData(rowElement: HTMLElement): ScheduleRowJSONData | null {
    const rowType = rowElement.dataset.rowType;
    try {
      if (rowType === "group") {
        const level = parseInt(rowElement.dataset.level || "1", 10);
        const nameInput = rowElement.querySelector(
          ".group-name-input"
        ) as HTMLInputElement | null;
        const name = nameInput?.value.trim() || "";
        return { rowType: "group", level, name };
      } else if (rowType === "interval") {
        const durationInput = rowElement.querySelector(
          ".config-duration"
        ) as HTMLInputElement | null;
        const taskInput = rowElement.querySelector(
          ".config-task"
        ) as HTMLInputElement | null;
        const featureTypeSelect = rowElement.querySelector(
          ".config-feature-type"
        ) as HTMLSelectElement | null;
        const categoryName = rowElement.dataset.categoryName;
        if (!categoryName) {
          console.error(
            "Failed to get row data: Interval row missing 'data-category-name' attribute.",
            rowElement
          );
          return null;
        }
        const duration = durationInput?.value.trim() || "0:00";
        const task = taskInput?.value.trim() || "";
        const featureTypeName = featureTypeSelect?.value.trim() || "";
        const intervalSettingsInstance =
          ((rowElement as any)._intervalSettings as IntervalSettings) ?? null;
        const intervalSettingsJSON = intervalSettingsInstance?.toJSON();
        const featureArgsList: string[] = [];
        const argsContainer = rowElement.querySelector(
          ".config-feature-args-container .feature-args-inner-container"
        );
        if (argsContainer) {
          const argWrappers = argsContainer.querySelectorAll<HTMLElement>(
            ":scope > .feature-arg-wrapper"
          );
          argWrappers.forEach((wrapper) => {
            const inputsContainer = wrapper.querySelector<HTMLElement>(
              ".feature-arg-inputs-container"
            );
            if (!inputsContainer) return;
            const uiType = inputsContainer.dataset.uiComponentType;
            const isVariadic = inputsContainer.dataset.isVariadic === "true";
            if (uiType === "toggle_button_selector") {
              const activeButtons =
                inputsContainer.querySelectorAll<HTMLButtonElement>(
                  ".numeral-toggle-btn.is-active"
                );
              const selectedValues = Array.from(activeButtons)
                .map((btn) => btn.dataset.value || "")
                .filter((v) => v);
              featureArgsList.push(...selectedValues);
            } else if (uiType === "ellipsis") {
              // Settings handled by intervalSettingsJSON
            } else if (isVariadic) {
              const variadicInputs = inputsContainer.querySelectorAll<
                HTMLInputElement | HTMLSelectElement
              >(".config-feature-arg, .select > select");
              variadicInputs.forEach((input) => {
                if (input.value?.trim()) {
                  featureArgsList.push(input.value.trim());
                }
              });
            } else {
              const inputElement = inputsContainer.querySelector<
                HTMLInputElement | HTMLSelectElement
              >(".config-feature-arg, .select > select");
              featureArgsList.push(inputElement?.value?.trim() ?? "");
            }
          });
        }
        const intervalData: IntervalDataJSON = {
          rowType: "interval",
          duration,
          task,
          categoryName,
          featureTypeName,
          featureArgsList,
        };
        if (
          intervalSettingsJSON &&
          Object.keys(intervalSettingsJSON).length > 0
        ) {
          intervalData.intervalSettings = intervalSettingsJSON;
        }
        return intervalData;
      } else {
        console.warn(
          "Unknown row type found during getRowData:",
          rowType,
          rowElement
        );
        return null;
      }
    } catch (error) {
      console.error("Error getting data for row:", rowElement, error);
      return null;
    }
  }

  /** Attaches event listener for row copy buttons (No change needed) */
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
          setTimeout(() => {
            rowToCopy.style.backgroundColor = "";
            rowToCopy.style.transition = "";
          }, 250);
        }
      }
    });
  }
}

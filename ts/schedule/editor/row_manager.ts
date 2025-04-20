// ts/schedule/editor/row_manager.ts
import {
  GroupRowData,
  IntervalRowData,
  GroupDataJSON,
  IntervalDataJSON,
  ScheduleRowJSONData,
  IntervalSettings // Import generic IntervalSettings
  // REMOVED IntervalSettingsJSON import as it's not directly used here
} from "./interval/types";
import { buildGroupRowElement } from "./interval/group_row_ui";
import { buildIntervalRowElement } from "./interval/interval_row_ui";
// *** REMOVED GuitarIntervalSettings import ***
import { SelectionManager } from "./selection_manager";
import { applyIndentation } from './interval/common_ui_elements';
import { FeatureCategoryName } from "../../feature"; // Import enum
import { getIntervalSettingsFactory } from "../../feature_registry"; // Import factory getter

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

  /** Adds an empty interval row to the UI for a specific category */
  public addEmptyIntervalRow(
    category: FeatureCategoryName, // Require category
    insertAfterElement?: HTMLElement | null
  ): HTMLElement {
     // Get the factory for the specified category to create default settings
     const settingsFactory = getIntervalSettingsFactory(category);
     let defaultSettings: IntervalSettings;

     if (settingsFactory) {
         defaultSettings = settingsFactory(); // Use factory
     } else {
          console.error(`Cannot add empty row: No IntervalSettings factory for category ${category}. Using fallback.`);
          // Minimal fallback satisfying the interface
          defaultSettings = { toJSON: () => ({}) };
     }

     // Create Row Data using the created default settings instance
     const newRowUIData: IntervalRowData = {
        rowType: "interval",
        duration: "3:00", // Default duration
        task: "",         // Default empty task
        featureCategoryName: category, // Assign the category
        featureTypeName: "",           // Default empty feature type
        featureArgsList: [],           // Default empty args
        intervalSettings: defaultSettings, // Assign instance from factory/fallback
      };

    // Pass the category to the builder function
    const newRowElement = buildIntervalRowElement(newRowUIData, category);
    this.insertRowElement(newRowElement, insertAfterElement); // Insert into DOM
    return newRowElement;
  }

  /** Adds a group row to the UI */
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

  /** Inserts a row element into the container, optionally after a specific element */
  public insertRowElement(
    newRowElement: HTMLElement,
    insertAfterElement?: HTMLElement | null
  ): void {
    let effectiveInsertAfter = insertAfterElement;
    // If no specific element provided, try inserting after the last selected element
    if (!effectiveInsertAfter) {
      effectiveInsertAfter = this.selectionManager.getLastSelectedElementInDomOrder();
    }

    // Perform insertion
    if ( effectiveInsertAfter && effectiveInsertAfter.parentNode === this.configEntriesContainerEl ) {
      this.configEntriesContainerEl.insertBefore(
        newRowElement,
        effectiveInsertAfter.nextSibling
      );
    } else {
      // Append to end if no insertion point found or element is detached
      this.configEntriesContainerEl.appendChild(newRowElement);
    }
    this.updateAllRowIndentation(); // Update indentation after DOM change
  }

  /** Deletes all currently selected rows */
  public deleteSelectedRows(): void {
    const selectedRows = this.selectionManager.getSelectedElementsInDomOrder();
    if (selectedRows.length === 0) return; // Nothing to delete

    selectedRows.forEach((row) => row.remove()); // Remove from DOM
    this.selectionManager.clearSelection(); // Clear selection state
    this.updateAllRowIndentation(); // Update indentation
  }

  /** Recalculates and applies indentation to all rows based on group structure */
  public updateAllRowIndentation(): void {
    const rows = Array.from(
      this.configEntriesContainerEl.querySelectorAll<HTMLElement>(".schedule-row")
    );
    const levelStack: number[] = [0]; // Stack to track current group level depth
    rows.forEach((row) => {
      const rowType = row.dataset.rowType;
      let currentIndentLevel = levelStack[levelStack.length - 1]; // Indent based on last group level

      if (rowType === "group") {
        const groupLevel = parseInt(row.dataset.level || "1", 10);
        // Pop levels off stack until current level is <= parent group level
        while (levelStack.length > 1 && levelStack[levelStack.length - 1] >= groupLevel) {
          levelStack.pop();
        }
        currentIndentLevel = levelStack[levelStack.length - 1]; // Recalculate indent for the group row itself
        applyIndentation(row, currentIndentLevel);
        levelStack.push(groupLevel); // Push this group's level onto the stack
      } else { // Apply indent to interval or unknown rows based on current group depth
        applyIndentation(row, currentIndentLevel);
      }
    });
  }

  /**
   * Extracts data from a single row element into a JSON-compatible structure.
   * @param rowElement - The HTML element for the schedule row (.schedule-row).
   * @returns {ScheduleRowJSONData | null} Plain data object or null if extraction fails.
   */
  public getRowData(rowElement: HTMLElement): ScheduleRowJSONData | null {
    const rowType = rowElement.dataset.rowType;
    try {
      if (rowType === "group") {
        // Extract group data
        const level = parseInt(rowElement.dataset.level || "1", 10);
        const nameInput = rowElement.querySelector(".group-name-input") as HTMLInputElement | null;
        const name = nameInput?.value.trim() || "";
        const groupData: GroupDataJSON = { rowType: "group", level, name };
        return groupData;

      } else if (rowType === "interval") {
        // Extract interval data
        const durationInput = rowElement.querySelector(".config-duration") as HTMLInputElement | null;
        const taskInput = rowElement.querySelector(".config-task") as HTMLInputElement | null;
        const featureTypeSelect = rowElement.querySelector(".config-feature-type") as HTMLSelectElement | null;

        const duration = durationInput?.value.trim() || "0:00";
        const task = taskInput?.value.trim() || "";
        const featureTypeName = featureTypeSelect?.value.trim() || "";

        // --- Determine Feature Category from stored data attribute ---
        const categoryNameStr = rowElement.dataset.featureCategory;
        let categoryName : FeatureCategoryName | undefined = undefined; // Start as undefined

        if (categoryNameStr && Object.values(FeatureCategoryName).includes(categoryNameStr as FeatureCategoryName)) {
            categoryName = categoryNameStr as FeatureCategoryName;
        } else {
             console.warn(`Missing or invalid category data attribute on interval row. Cannot reliably determine category for saving.`, rowElement);
             // We MUST have a category to properly represent the interval. What's the best fallback?
             // Option A: Return null (prevents saving potentially incorrect data)
             // Option B: Default to Guitar (might be wrong)
             // Let's choose Option A for data integrity.
             return null; // Cannot determine category, return null
        }
        // ---- End Determine Feature Category ----


        // Get settings instance stored on the element (should be generic IntervalSettings)
        const intervalSettingsInstance = ((rowElement as any)._intervalSettings as IntervalSettings) ?? null;
        // Serialize using the instance's toJSON method
        const intervalSettingsJSON = intervalSettingsInstance?.toJSON();

        // Extract feature arguments list
        const featureArgsList: string[] = [];
        const argsContainer = rowElement.querySelector(".config-feature-args-container .feature-args-inner-container");
        if (argsContainer) {
             const argWrappers = argsContainer.querySelectorAll<HTMLElement>(":scope > .feature-arg-wrapper");
            argWrappers.forEach(wrapper => {
                const inputsContainer = wrapper.querySelector<HTMLElement>(".feature-arg-inputs-container");
                if (!inputsContainer) return;
                const uiType = inputsContainer.dataset.uiComponentType;
                const isVariadic = inputsContainer.dataset.isVariadic === 'true';
                if (uiType === 'toggle_button_selector') {
                    const activeButtons = inputsContainer.querySelectorAll<HTMLButtonElement>(".numeral-toggle-btn.is-active");
                    const selectedValues = Array.from(activeButtons).map(btn => btn.dataset.value || '').filter(v => v); // Filter empty values
                     featureArgsList.push(...selectedValues); // Add selected values
                } else if (uiType === 'ellipsis') {
                    // Ellipsis settings are handled internally by the IntervalSettings object,
                    // no separate args are extracted here. The toJSON() call handles serialization.
                }
                 else if (isVariadic) {
                    // Handle standard variadic inputs
                    const variadicInputs = inputsContainer.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".config-feature-arg, .select > select");
                    variadicInputs.forEach(input => {
                        if (input.value?.trim()) { // Only add non-empty trimmed values
                            featureArgsList.push(input.value.trim());
                        }
                    });
                } else {
                    // Handle standard non-variadic input
                    const inputElement = inputsContainer.querySelector<HTMLInputElement | HTMLSelectElement>(".config-feature-arg, .select > select");
                    // Push the value directly (even if empty, schema might allow it)
                    featureArgsList.push(inputElement?.value?.trim() ?? "");
                }
            });
        }

        // Construct the plain data object for the interval
        const intervalData: IntervalDataJSON = {
          rowType: "interval",
          duration,
          task,
          featureCategoryName: categoryName, // Include category
          featureTypeName,
          featureArgsList,
        };
        // Only add intervalSettings property if it has data
        if (intervalSettingsJSON && Object.keys(intervalSettingsJSON).length > 0) {
            intervalData.intervalSettings = intervalSettingsJSON;
        }
        // console.log(`[DEBUG] getRowData (Interval) - Category: ${categoryName}, Feature: ${featureTypeName}, Data:`, JSON.stringify(intervalData));
        return intervalData;

      } else {
        console.warn("Unknown row type found during getRowData:", rowType, rowElement);
        return null;
      }
    } catch (error) {
      console.error("Error getting data for row:", rowElement, error);
      return null;
    }
  }

  /** Attaches event listener for row copy buttons */
  private _addRowCopyHandler(): void {
    this.configEntriesContainerEl.addEventListener("click", (e) => {
      const targetElement = e.target as HTMLElement;
      const copyButton = targetElement.closest(".copy-row-btn");
      if (copyButton) {
        e.stopPropagation(); // Prevent triggering selection handler
        const rowToCopy = targetElement.closest<HTMLElement>(".schedule-row");
        if (rowToCopy) {
          // Select the row to be copied and provide visual feedback
          this.selectionManager.selectSingleRow(rowToCopy);
           rowToCopy.style.transition = "background-color 0.1s ease-out";
           rowToCopy.style.backgroundColor = "rgba(72, 199, 116, 0.3)"; // Use CSS variable if possible
           setTimeout(() => { rowToCopy.style.backgroundColor = ""; rowToCopy.style.transition = ""; }, 250); // Increased duration slightly
          // console.log("Row selected via icon click for copying.");
        }
      }
    });
  }
}
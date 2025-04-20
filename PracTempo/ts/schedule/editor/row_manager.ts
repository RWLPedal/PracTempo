import {
  buildIntervalRowElement,
  buildGroupRowElement,
  applyIndentation,
  ScheduleRowData,
  GroupRowData,
  IntervalRowData,
} from "./interval_row";
import { GuitarIntervalSettings } from "../../guitar/guitar_interval_settings";
import { getFeatureTypeDescriptor } from "../../feature_registry";
import { FeatureCategoryName } from "../../feature";
import { SelectionManager } from "./selection_manager";

export class RowManager {
  private configEntriesContainerEl: HTMLElement;
  private selectionManager: SelectionManager; // Use import type

  constructor(
    configEntriesContainerEl: HTMLElement,
    selectionManager: SelectionManager
  ) {
    this.configEntriesContainerEl = configEntriesContainerEl;
    this.selectionManager = selectionManager;
    this._addRowCopyHandler();
  }

  public addEmptyIntervalRow(
    insertAfterElement?: HTMLElement | null
  ): HTMLElement {
    const newRowData: IntervalRowData = {
      rowType: "interval",
      duration: "3:00",
      task: "",
      featureTypeName: "",
      featureArgsList: [],
      intervalSettings: new GuitarIntervalSettings(),
    };
    const newRowElement = buildIntervalRowElement(newRowData);
    this.insertRowElement(newRowElement, insertAfterElement);
    return newRowElement;
  }

  public addGroupRow(
    level: number = 1,
    name: string = "",
    insertAfterElement?: HTMLElement | null
  ): HTMLElement {
    const newRowData: GroupRowData = {
      rowType: "group",
      level: Math.max(1, level),
      name: name || `New Group Level ${level}`,
    };
    const newRowElement = buildGroupRowElement(newRowData);
    this.insertRowElement(newRowElement, insertAfterElement);
    return newRowElement;
  }

  public insertRowElement(
    newRowElement: HTMLElement,
    insertAfterElement?: HTMLElement | null
  ): void {
    let effectiveInsertAfter = insertAfterElement;
    if (!effectiveInsertAfter) {
      // If no specific element provided, insert after the last selected element
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
      // Fallback: append to the end if no valid insertion point found
      this.configEntriesContainerEl.appendChild(newRowElement);
    }
    this.updateAllRowIndentation();
  }

  public deleteSelectedRows(): void {
    const selectedRows = this.selectionManager.getSelectedElementsInDomOrder();
    if (selectedRows.length === 0) {
      console.log("Nothing selected to delete.");
      return;
    }

    console.log(`Deleting ${selectedRows.length} selected rows.`);
    // TODO: Implement recursive group deletion later if needed.
    selectedRows.forEach((row) => row.remove());

    this.selectionManager.clearSelection(); // Clear selection state
    this.updateAllRowIndentation(); // Update indentation after deletion
  }

  public updateAllRowIndentation(): void {
    const rows = Array.from(
      this.configEntriesContainerEl.querySelectorAll<HTMLElement>(
        ".schedule-row"
      )
    );
    const levelStack: number[] = [0]; // Start with base level 0

    rows.forEach((row) => {
      const rowType = row.dataset.rowType;
      let currentIndentLevel = levelStack[levelStack.length - 1];

      if (rowType === "group") {
        const groupLevel = parseInt(row.dataset.level || "1", 10);

        // Pop levels off stack until we find a parent level or empty stack
        while (
          levelStack.length > 1 &&
          levelStack[levelStack.length - 1] >= groupLevel
        ) {
          levelStack.pop();
        }
        // The new indent level is the level of the parent group on the stack
        currentIndentLevel = levelStack[levelStack.length - 1];
        applyIndentation(row, currentIndentLevel); // Indent the group itself relative to its parent
        levelStack.push(groupLevel); // Push this group's level onto the stack for its children
      } else if (rowType === "interval") {
        // Interval inherits indentation from the last group on the stack
        applyIndentation(row, currentIndentLevel);
      } else {
        // Unknown row type, apply base indentation
        applyIndentation(row, 0);
      }
    });
  }

  // Extracts data from a single row element
  public getRowData(rowElement: HTMLElement): ScheduleRowData | null {
    const rowType = rowElement.dataset.rowType;
    try {
      if (rowType === "group") {
        const level = parseInt(rowElement.dataset.level || "1", 10);
        const name =
          (
            rowElement.querySelector(".group-name-input") as HTMLInputElement
          )?.value.trim() || "";
        return { rowType: "group", level, name };
      } else if (rowType === "interval") {
        const duration =
          (
            rowElement.querySelector(".config-duration") as HTMLInputElement
          )?.value.trim() || "0:00";
        const task =
          (
            rowElement.querySelector(".config-task") as HTMLInputElement
          )?.value.trim() || "";
        const featureTypeName =
          (
            rowElement.querySelector(
              ".config-feature-type"
            ) as HTMLSelectElement
          )?.value.trim() || "";
        const intervalSettings =
          ((rowElement as any)._intervalSettings as GuitarIntervalSettings) ??
          new GuitarIntervalSettings();

        // Revised argument retrieval logic (from config_parser.ts generateScheduleText)
        const featureArgsList: string[] = [];
        const argsInnerContainer = rowElement.querySelector(
          ".config-feature-args-container .feature-args-inner-container"
        );

        if (argsInnerContainer && featureTypeName) {
          const descriptor = getFeatureTypeDescriptor(
            FeatureCategoryName.Guitar,
            featureTypeName
          );
          const schema = descriptor?.getConfigurationSchema();
          const schemaArgs =
            typeof schema === "object" &&
            "args" in schema &&
            Array.isArray(schema.args)
              ? schema.args.filter((a) => a.type !== "ellipsis") // Exclude ellipsis itself
              : [];

          const argWrappers = argsInnerContainer.querySelectorAll<HTMLElement>(
            ":scope > .feature-arg-wrapper"
          );

          argWrappers.forEach((wrapper, wrapperIndex) => {
            const schemaArg = schemaArgs[wrapperIndex]; // Assumes order matches schema (excluding ellipsis)
            const inputElements = wrapper.querySelectorAll<
              HTMLInputElement | HTMLSelectElement
            >(
              ".feature-arg-inputs-container .config-feature-arg, .feature-arg-inputs-container .select > select"
            );

            if (inputElements.length > 0) {
              if (schemaArg?.isVariadic) {
                inputElements.forEach((el) => {
                  const value = el.value?.trim();
                  if (value) featureArgsList.push(value);
                });
              } else if (inputElements[0]) {
                const value = inputElements[0].value?.trim();
                featureArgsList.push(value ?? ""); // Push even empty for non-variadic
              }
            } else if (schemaArg && !schemaArg.isVariadic) {
              featureArgsList.push(""); // Maintain position for empty non-variadic
            }
          });
        }

        return {
          rowType: "interval",
          duration,
          task,
          featureTypeName,
          featureArgsList,
          intervalSettings,
        };
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
        e.stopPropagation(); // Prevent row selection logic
        const rowToCopy = targetElement.closest<HTMLElement>(".schedule-row");
        if (rowToCopy) {
          // Select just this row before triggering copy action
          this.selectionManager.selectSingleRow(rowToCopy);
          // The actual copy action will be handled by the ClipboardManager via button/shortcut
          // We can trigger the copy button's click event programmatically if needed,
          // or rely on the user clicking the main copy button / using Ctrl+C.
          // For simplicity, let's assume the user uses the main button/shortcut after selection.

          // Optional: Visual feedback
          rowToCopy.style.transition = "background-color 0.1s ease-out";
          rowToCopy.style.backgroundColor = "rgba(72, 199, 116, 0.3)"; // Example flash
          setTimeout(() => {
            rowToCopy.style.backgroundColor = "";
          }, 200);
          console.log("Row selected via icon click for copying.");
        }
      }
    });
  }
}

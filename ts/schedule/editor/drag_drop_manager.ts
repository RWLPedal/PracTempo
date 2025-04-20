import { SelectionManager } from "./selection_manager";
import { RowManager } from "./row_manager";

export class DragDropManager {
  private containerEl: HTMLElement;
  private selectionManager: SelectionManager;
  private rowManager: RowManager;

  private draggedElements: HTMLElement[] = [];
  private isMultiDrag: boolean = false;

  constructor(
    containerEl: HTMLElement,
    selectionManager: SelectionManager,
    rowManager: RowManager
  ) {
    this.containerEl = containerEl;
    this.selectionManager = selectionManager;
    this.rowManager = rowManager;
    this._initialize();
  }

  private _initialize(): void {
    this.containerEl.addEventListener(
      "dragstart",
      this._handleDragStart.bind(this)
    );
    this.containerEl.addEventListener(
      "dragend",
      this._handleDragEnd.bind(this)
    );
    this.containerEl.addEventListener(
      "dragover",
      this._handleDragOver.bind(this)
    );
    this.containerEl.addEventListener("drop", this._handleDrop.bind(this));
    this.containerEl.addEventListener(
      "dragleave",
      this._handleDragLeave.bind(this)
    );
    console.log("DnD Manager Initialized.");
  }

  private _handleDragStart(e: DragEvent): void {
    const target = (e.target as HTMLElement).closest<HTMLElement>(
      ".schedule-row"
    );
    if (!target || !e.dataTransfer) {
      e.preventDefault();
      return;
    }

    // Check if the dragged element is part of the current selection
    this.isMultiDrag = this.selectionManager.getSelectedElements().has(target);

    if (this.isMultiDrag) {
      this.draggedElements =
        this.selectionManager.getSelectedElementsInDomOrder();
      this.draggedElements.forEach((el) =>
        el.classList.add("dragging-selected")
      );
      console.log(
        `Drag Start: Multi-drag initiated with ${this.draggedElements.length} elements.`
      );
      e.dataTransfer.setData("application/x-schedule-multidrag", "true"); // Indicate multi-drag
    } else {
      // If dragging an unselected item, clear selection and drag only that item
      this.selectionManager.clearSelection(); // Clear previous selection
      this.draggedElements = [target];
      target.classList.add("dragging");
      console.log("Drag Start: Single element drag.");
    }

    e.dataTransfer.effectAllowed = "move";
    // Use setTimeout to allow the browser to render the drag image before hiding
    setTimeout(() => {
      this.draggedElements.forEach((el) => (el.style.opacity = "0.5"));
    }, 0);
  }

  private _handleDragEnd(e: DragEvent): void {
    // Clear styles and reset state
    this.draggedElements.forEach((el) => {
      el.classList.remove("dragging", "dragging-selected");
      el.style.opacity = "";
    });
    this._clearDragOverStyles();
    this.draggedElements = [];
    this.isMultiDrag = false;
    console.log("Drag End.");
  }

  private _handleDragOver(e: DragEvent): void {
    e.preventDefault(); // Necessary to allow drop
    if (this.draggedElements.length === 0) return;
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

    const afterElement = this._getDragAfterElement(e.clientY);
    this._clearDragOverStyles();
    this._applyDragOverStyle(afterElement);
  }

  private _handleDrop(e: DragEvent): void {
    e.preventDefault();
    this._clearDragOverStyles();
    if (this.draggedElements.length === 0) return;

    const afterElement = this._getDragAfterElement(e.clientY);
    console.log(
      `Drop: Moving ${this.draggedElements.length} elements ${
        afterElement ? "before target" : "to the end"
      }.`
    );

    // Insert dragged elements at the drop location
    this.draggedElements.forEach((el) => {
      // Check if dropping onto itself or within the dragged set - find next valid target
      let currentTarget = afterElement;
      while (currentTarget && this.draggedElements.includes(currentTarget)) {
        currentTarget = currentTarget.nextElementSibling as HTMLElement | null;
      }

      if (currentTarget === null) {
        this.containerEl.appendChild(el); // Append to end
      } else {
        this.containerEl.insertBefore(el, currentTarget); // Insert before target
      }
    });

    this.rowManager.updateAllRowIndentation();
  }

  private _handleDragLeave(e: DragEvent): void {
    // Clear styles only if leaving the container entirely
    if (!this.containerEl.contains(e.relatedTarget as Node)) {
      this._clearDragOverStyles();
    }
  }

  // Helper to find the element to insert before
  private _getDragAfterElement(y: number): HTMLElement | null {
    const draggableElements = Array.from(
      this.containerEl.querySelectorAll<HTMLElement>(
        ".schedule-row:not(.dragging):not(.dragging-selected)"
      )
    );

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        // Find the element just below the cursor
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY, element: null as HTMLElement | null }
    ).element;
  }

  // Helper to clear visual drop indicators
  private _clearDragOverStyles(): void {
    this.containerEl
      .querySelectorAll<HTMLElement>(".schedule-row")
      .forEach((el) => {
        el.style.borderTop = "";
        el.style.borderBottom = "";
      });
    // Clear container borders if they were used for end-of-list indication
    this.containerEl.style.borderBottom = "";
    this.containerEl.style.borderTop = "";
  }

  // Helper to apply visual drop indicator
  private _applyDragOverStyle(afterElement: HTMLElement | null): void {
    const borderStyle = "3px dashed #485fc7"; // Example style
    if (afterElement) {
      afterElement.style.borderTop = borderStyle;
    } else {
      this.containerEl.style.borderBottom = borderStyle;
    }
  }
}

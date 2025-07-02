import { View } from "../view";
import { FloatingViewInstanceState } from "./floating_view_types";

// Basic Dragging Logic (can be enhanced or use a library)
let dragOffsetX = 0;
let dragOffsetY = 0;
let draggedElement: HTMLElement | null = null;

function startDrag(e: MouseEvent, element: HTMLElement) {
  draggedElement = element;
  const rect = element.getBoundingClientRect();
  // Calculate offset from top-left corner of the element
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  // Use clientX/Y for mouse position relative to viewport
  // dragOffsetX = e.clientX - element.offsetLeft;
  // dragOffsetY = e.clientY - element.offsetTop;
  document.addEventListener("mousemove", doDrag);
  document.addEventListener("mouseup", stopDrag);
  element.style.cursor = "grabbing";
  element.classList.add("is-dragging"); // For visual feedback
}

function doDrag(e: MouseEvent) {
  if (!draggedElement) return;
  // Set position based on viewport coordinates minus offset
  let newX = e.clientX - dragOffsetX;
  let newY = e.clientY - dragOffsetY;

  // --- Basic Boundary Collision ---
  const parent = (draggedElement.offsetParent as HTMLElement) || document.body;
  const parentRect = parent.getBoundingClientRect();
  const elemRect = draggedElement.getBoundingClientRect();

  newX = Math.max(0, Math.min(newX, parentRect.width - elemRect.width));
  newY = Math.max(0, Math.min(newY, parentRect.height - elemRect.height));
  // --- End Basic Boundary Collision ---

  draggedElement.style.left = `${newX}px`;
  draggedElement.style.top = `${newY}px`;
}

function stopDrag() {
  if (draggedElement) {
    draggedElement.style.cursor = "grab";
    draggedElement.classList.remove("is-dragging");
    // Notify manager about position change (e.g., via callback or event)
    const managerCallback = (draggedElement as any)._notifyPositionChange;
    if (managerCallback) {
      managerCallback(
        parseFloat(draggedElement.style.left || "0"),
        parseFloat(draggedElement.style.top || "0")
      );
    }
  }
  draggedElement = null;
  document.removeEventListener("mousemove", doDrag);
  document.removeEventListener("mouseup", stopDrag);
}
// --- End Dragging Logic ---

export class FloatingViewWrapper {
  public element: HTMLElement;
  private contentElement: HTMLElement;
  private viewInstance: View;
  private state: FloatingViewInstanceState;
  private onDestroyCallback: (instanceId: string) => void;
  private onStateChangeCallback: (state: FloatingViewInstanceState) => void;

  constructor(
    state: FloatingViewInstanceState,
    title: string,
    viewInstance: View,
    onDestroy: (instanceId: string) => void,
    onStateChange: (state: FloatingViewInstanceState) => void,
    defaultWidth?: number,
    defaultHeight?: number
  ) {
    this.state = state;
    this.viewInstance = viewInstance;
    this.onDestroyCallback = onDestroy;
    this.onStateChangeCallback = onStateChange;

    this.element = document.createElement("div");
    this.element.classList.add("floating-view-wrapper");
    this.element.style.position = "absolute"; // Crucial for positioning
    this.element.style.left = `${state.position.x}px`;
    this.element.style.top = `${state.position.y}px`;
    this.element.style.zIndex = `${state.zIndex}`;
    if (state.size) {
      this.element.style.width = `${state.size.width}px`;
      this.element.style.height = `${state.size.height}px`;
    } else if (defaultWidth || defaultHeight) {
      if (defaultWidth) this.element.style.width = `${defaultWidth}px`;
      // Height might be better left to content, or provide default
      // if (defaultHeight) this.element.style.height = `${defaultHeight}px`;
    }

    // Make wrapper focusable and handle z-index bring-to-front
    this.element.setAttribute("tabindex", "-1"); // Allows focus
    this.element.addEventListener(
      "mousedown",
      () => {
        this.onStateChangeCallback(this.state); // Notify manager to bring to front
      },
      true
    ); // Use capture phase

    // Store callback for drag end notification
    (this.element as any)._notifyPositionChange = (x: number, y: number) => {
      this.state.position = { x, y };
      this.onStateChangeCallback(this.state);
    };

    // --- Title Bar ---
    const titleBar = document.createElement("div");
    titleBar.classList.add("floating-view-titlebar");
    titleBar.textContent = title;
    titleBar.style.cursor = "grab"; // Indicate draggable
    titleBar.addEventListener("mousedown", (e) => startDrag(e, this.element)); // Attach drag handler

    // --- Close Button ---
    const closeButton = document.createElement("button");
    closeButton.classList.add("floating-view-close");
    closeButton.innerHTML = "&times;"; // 'X' symbol
    closeButton.title = "Close";
    closeButton.onclick = (e) => {
      e.stopPropagation(); // Prevent title bar drag
      this.destroy();
    };
    titleBar.appendChild(closeButton);
    this.element.appendChild(titleBar);

    // --- Content Area ---
    this.contentElement = document.createElement("div");
    this.contentElement.classList.add("floating-view-content");
    this.element.appendChild(this.contentElement);

    // --- Render the actual View ---
    try {
      this.viewInstance.render(this.contentElement);
    } catch (e) {
      console.error(`Error rendering view ${state.viewId}:`, e);
      this.contentElement.textContent = "Error rendering view.";
    }
  }

  public get instanceId(): string {
    return this.state.instanceId;
  }

  public bringToFront(zIndex: number): void {
    this.state.zIndex = zIndex;
    this.element.style.zIndex = `${zIndex}`;
  }

  public destroy(): void {
    try {
      this.viewInstance.destroy();
    } catch (e) {
      console.error(`Error destroying view ${this.state.viewId}:`, e);
    }
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.onDestroyCallback(this.state.instanceId);
  }
}

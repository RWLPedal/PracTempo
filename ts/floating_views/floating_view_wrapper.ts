import { View } from "../view";
import { FloatingViewInstanceState } from "./floating_view_types";

// Basic Dragging Logic (can be enhanced or use a library)
let dragOffsetX = 0;
let dragOffsetY = 0;
let draggedElement: HTMLElement | null = null;

function startDrag(e: MouseEvent, element: HTMLElement) {
  draggedElement = element;
  const rect = element.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  document.addEventListener("mousemove", doDrag);
  document.addEventListener("mouseup", stopDrag);
  element.style.cursor = "grabbing";
  element.classList.add("is-dragging");
}

function doDrag(e: MouseEvent) {
  if (!draggedElement) return;
  let newX = e.clientX - dragOffsetX;
  let newY = e.clientY - dragOffsetY;

  const parent = (draggedElement.offsetParent as HTMLElement) || document.body;
  const parentRect = parent.getBoundingClientRect();
  const elemRect = draggedElement.getBoundingClientRect();

  newX = Math.max(0, Math.min(newX, parentRect.width - elemRect.width));
  newY = Math.max(0, Math.min(newY, parentRect.height - elemRect.height));

  draggedElement.style.left = `${newX}px`;
  draggedElement.style.top = `${newY}px`;
}

function stopDrag() {
  if (draggedElement) {
    draggedElement.style.cursor = "grab";
    draggedElement.classList.remove("is-dragging");
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

  public get contentEl(): HTMLElement { return this.contentElement; }
  private viewInstance: View;
  private state: FloatingViewInstanceState;
  private onDestroyCallback: (instanceId: string) => void;
  private onStateChangeCallback: (state: FloatingViewInstanceState) => void;
  private onSaveCallback: () => void;
  private onRotateCallback: (() => void) | null;
  private onZoomCallback: (() => void) | null;
  private titleTextEl: HTMLElement;
  private zoomButtonEl: HTMLButtonElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private _resizeSaveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Minimum wrapper width (px) — the descriptor's defaultWidth. Used as a floor
   *  when resizing after rotation so the config UI is never clipped. */
  private readonly defaultWidth: number;

  constructor(
    state: FloatingViewInstanceState,
    title: string,
    viewInstance: View,
    onDestroy: (instanceId: string) => void,
    onStateChange: (state: FloatingViewInstanceState) => void,
    onSave: () => void,
    defaultWidth?: number,
    defaultHeight?: number,
    onRotate?: () => void,
    onZoom?: () => void
  ) {
    this.state = state;
    this.viewInstance = viewInstance;
    this.onDestroyCallback = onDestroy;
    this.onStateChangeCallback = onStateChange;
    this.onSaveCallback = onSave;
    this.onRotateCallback = onRotate ?? null;
    this.onZoomCallback = onZoom ?? null;
    this.defaultWidth = defaultWidth ?? 0;

    this.element = document.createElement("div");
    this.element.classList.add("floating-view-wrapper");
    this.element.dataset.instanceId = state.instanceId;
    this.element.style.position = "absolute";
    this.element.style.left = `${state.position.x}px`;
    this.element.style.top = `${state.position.y}px`;
    this.element.style.zIndex = `${state.zIndex}`;
    if (state.size) {
      this.element.style.width = `${state.size.width}px`;
      this.element.style.height = `${state.size.height}px`;
    } else if (defaultWidth || defaultHeight) {
      if (defaultWidth) this.element.style.width = `${defaultWidth}px`;
    }

    // Make wrapper focusable and handle z-index bring-to-front
    this.element.setAttribute("tabindex", "-1");
    this.element.addEventListener(
      "mousedown",
      () => {
        this.onStateChangeCallback(this.state);
      },
      true
    );

    (this.element as any)._notifyPositionChange = (x: number, y: number) => {
      this.state.position = { x, y };
      this.onStateChangeCallback(this.state);
    };

    // --- Title Bar ---
    const titleBar = document.createElement("div");
    titleBar.classList.add("floating-view-titlebar");
    titleBar.style.cursor = "grab";
    titleBar.addEventListener("mousedown", (e) => startDrag(e, this.element));

    this.titleTextEl = document.createElement("span");
    this.titleTextEl.classList.add("floating-view-title-text");
    this.titleTextEl.textContent = title;
    titleBar.appendChild(this.titleTextEl);

    // --- Right-aligned button group (rotate + close) ---
    const buttonGroup = document.createElement("div");
    buttonGroup.classList.add("floating-view-button-group");

    if (this.onRotateCallback) {
      const rotateButton = document.createElement("button");
      rotateButton.classList.add("floating-view-rotate");
      rotateButton.innerHTML = "&#8635;"; // ↻
      rotateButton.title = "Rotate fretboard";
      rotateButton.onclick = (e) => {
        e.stopPropagation();
        this.onRotateCallback!();
      };
      buttonGroup.appendChild(rotateButton);
    }

    if (this.onZoomCallback) {
      const zoomButton = document.createElement("button");
      zoomButton.classList.add("floating-view-zoom");
      zoomButton.innerHTML = "&#8853;"; // ⊕
      zoomButton.title = "Toggle zoom";
      if (state.zoomActive) {
        zoomButton.classList.add("is-active");
      }
      zoomButton.onclick = (e) => {
        e.stopPropagation();
        this.onZoomCallback!();
      };
      buttonGroup.appendChild(zoomButton);
      this.zoomButtonEl = zoomButton;
    }

    const closeButton = document.createElement("button");
    closeButton.classList.add("floating-view-close");
    closeButton.innerHTML = "&times;";
    closeButton.title = "Close";
    closeButton.onclick = (e) => {
      e.stopPropagation();
      this.destroy();
    };
    buttonGroup.appendChild(closeButton);
    titleBar.appendChild(buttonGroup);
    this.element.appendChild(titleBar);

    // --- Content Area ---
    this.contentElement = document.createElement("div");
    this.contentElement.classList.add("floating-view-content");
    this.element.appendChild(this.contentElement);

    // Listen for dynamic title updates - must be registered before render so
    // events fired synchronously during render (e.g. on saved-state restore) are caught.
    this.contentElement.addEventListener('feature-title-changed', (e: Event) => {
      const detail = (e as CustomEvent<{ title: string }>).detail;
      if (detail?.title) {
        this.titleTextEl.textContent = detail.title;
      }
    });

    // Persist view state whenever any child view signals a change.
    this.contentElement.addEventListener('feature-state-changed', (e: Event) => {
      const detail = (e as CustomEvent<Record<string, unknown>>).detail;
      if (detail) {
        this.state.viewState = { ...this.state.viewState, ...detail };
        this.onSaveCallback();
      }
    });

    // --- Render the actual View ---
    try {
      this.viewInstance.render(this.contentElement);
    } catch (e) {
      console.error(`Error rendering view ${state.viewId}:`, e);
      this.contentElement.textContent = "Error rendering view.";
    }

    // Auto-size to canvas content after the element is in the DOM
    if (!state.size) {
      requestAnimationFrame(() => this._autoSizeToContent(false));
    }

    // Capture size after every resize (auto-size and manual CSS resize handle).
    // Uses a separate save callback to avoid triggering z-index bring-to-front logic.
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      // Use borderBoxSize so saved dimensions match what style.width/height restores to.
      // contentRect excludes the border, causing a -2px drift per reload with border-box sizing.
      const bo = entry.borderBoxSize?.[0];
      const w = bo ? Math.round(bo.inlineSize) : Math.round(entry.contentRect.width);
      const h = bo ? Math.round(bo.blockSize) : Math.round(entry.contentRect.height);
      if (w <= 0 || h <= 0) return;
      this.state.size = { width: w, height: h };
      // Debounce to avoid flooding localStorage during manual CSS resize drags
      if (this._resizeSaveTimer !== null) clearTimeout(this._resizeSaveTimer);
      this._resizeSaveTimer = setTimeout(() => {
        this._resizeSaveTimer = null;
        this.onSaveCallback();
      }, 150);
    });
    this.resizeObserver.observe(this.element);
  }

  public get instanceId(): string {
    return this.state.instanceId;
  }

  public bringToFront(zIndex: number): void {
    this.state.zIndex = zIndex;
    this.element.style.zIndex = `${zIndex}`;
  }

  /**
   * Destroys the current view instance, renders a new one in its place,
   * then auto-sizes the wrapper to fit. Used for both manual rotation and
   * settings-driven refreshes; sizing always uses force=true so the window
   * snaps to the new canvas size (floored at this.defaultWidth).
   */
  public replaceViewContent(newViewInstance: View): void {
    try {
      this.viewInstance.destroy();
    } catch (e) {
      console.error(`Error destroying old view ${this.state.viewId}:`, e);
    }

    this.contentElement.innerHTML = "";
    this.viewInstance = newViewInstance;

    try {
      this.viewInstance.render(this.contentElement);
    } catch (e) {
      console.error(`Error rendering rotated view ${this.state.viewId}:`, e);
      this.contentElement.textContent = "Error rendering view.";
    }

    requestAnimationFrame(() => this._autoSizeToContent(true));
  }

  /**
   * Sizes the wrapper to fit all content in the content area.
   *
   * Width is driven by the canvas pixel width (so the fretboard never gets
   * clipped), falling back to scrollWidth when there is no canvas.
   *
   * Height uses contentElement.scrollHeight so that any configuration
   * sections rendered above or below the canvas are included automatically.
   *
   * @param force - When true, resize even if state.size is already set
   *                (used after a rotation where the canvas dimensions change).
   */
  private _autoSizeToContent(force: boolean): void {
    if (!force && this.state.size) return;

    const canvas = this.contentElement.querySelector<HTMLCanvasElement>("canvas");
    if (!canvas || canvas.width === 0) return;

    const titleBarEl = this.element.querySelector<HTMLElement>(".floating-view-titlebar");
    const titleBarH = titleBarEl?.offsetHeight ?? 30;

    // .floating-view-content has 5px padding each side (10px total horizontal).
    // Inner content (e.g. chord-diagram-view) may add another 5px each side.
    // The wrapper border adds 2px and we include a 2px safety buffer = 24px total.
    // This matches the chord diagram layout exactly; fretboard views without an inner
    // wrapper see ~10px extra space, which is harmless.
    const contentPaddingH = 24;
    const canvasBasedWidth = canvas.width + contentPaddingH;

    // On rotate/refresh (force=true): snap to the new canvas size but floor at
    // this.defaultWidth so the config UI above the canvas is never clipped.
    // On initial open (force=false): use canvasBasedWidth directly — the canvas
    // is always the widest content and the config section wraps to fit.
    const newWidth = force
      ? Math.max(canvasBasedWidth, this.defaultWidth)
      : canvasBasedWidth;

    // Set the new width FIRST so that line-wrapping in the config section (flex-wrap)
    // is resolved at the correct width before we read scrollHeight for the height.
    // If we read scrollHeight before changing the width, it reflects the old layout
    // (e.g. the wider zoomed state) and produces an incorrect — too-short — height.
    this.element.style.width = `${newWidth}px`;

    // Clear any explicit height so scrollHeight reflects the natural content height
    // at the new width, not the old explicitly-set value.
    this.element.style.height = "";

    // scrollHeight includes the content element's padding, so it covers everything:
    // config section + feature header + canvas.  Add 4px for wrapper border (2px) +
    // safety buffer (2px) so a rounding pixel never triggers a scrollbar.
    const newHeight = this.contentElement.scrollHeight + titleBarH + 4;

    this.element.style.height = `${newHeight}px`;

    // Persist so the size survives save/restore
    this.state.size = { width: newWidth, height: newHeight };
    this.onStateChangeCallback(this.state);
  }

  /** Reflects the current zoom state on the zoom button (active = zoomed). */
  public updateZoomButtonState(active: boolean): void {
    if (!this.zoomButtonEl) return;
    this.zoomButtonEl.classList.toggle("is-active", active);
  }

  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this._resizeSaveTimer !== null) {
      clearTimeout(this._resizeSaveTimer);
      this._resizeSaveTimer = null;
    }
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

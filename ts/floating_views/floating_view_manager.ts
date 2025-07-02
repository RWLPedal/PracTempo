// ts/floating_views/floating_view_manager.ts
import { FloatingViewWrapper } from "./floating_view_wrapper";
import {
  FloatingViewDescriptor,
  FloatingViewInstanceState,
  FloatingViewManagerSaveState,
} from "./floating_view_types";
import { getFloatingViewDescriptor } from "./floating_view_registry";
import { AppSettings } from "../settings"; // Needed for createView

const FLOATING_VIEW_STATE_KEY = "floatingViewStates";
const FLOATING_VIEW_AREA_ID = "floating-view-area"; // ID of the container element

export class FloatingViewManager {
  private activeViews = new Map<string, FloatingViewWrapper>();
  private viewAreaElement: HTMLElement | null;
  private nextInstanceId = 1;
  private currentMaxZIndex = 100; // Starting z-index
  public appSettings: AppSettings; // Store reference, make public if needed externally

  constructor(appSettings: AppSettings) {
    this.appSettings = appSettings; // Keep settings reference
    this.viewAreaElement = document.getElementById(FLOATING_VIEW_AREA_ID);
    if (!this.viewAreaElement) {
      console.error(
        `Floating View container #${FLOATING_VIEW_AREA_ID} not found! Views will not be displayed.`
      );
    }
  }

  // --- Public API ---

  public spawnView(
    viewId: string,
    initialState?: Partial<FloatingViewInstanceState>
  ): void {
    if (!this.viewAreaElement) return;

    // Removed duplicate check - allow multiple instances

    const descriptor = getFloatingViewDescriptor(viewId);
    if (!descriptor) {
      console.error(
        `Cannot spawn view: Descriptor not found for viewId "${viewId}"`
      );
      return;
    }

    const instanceId = `fv-${this.nextInstanceId++}`;

    // Bring new view to front
    this.currentMaxZIndex++;

    // Merge initial state if provided
    const state: FloatingViewInstanceState = {
      instanceId: instanceId,
      viewId: viewId,
      position: initialState?.position ?? {
        x: 50 + ((this.activeViews.size * 20) % 300),
        y: 50 + ((this.activeViews.size * 20) % 400),
      }, // Simple cascade with wrap
      size: initialState?.size, // Use saved size or let wrapper use default
      zIndex: this.currentMaxZIndex,
      viewState: initialState?.viewState,
    };

    try {
      // Pass settings reference, views might need it
      const viewInstance = descriptor.createView(
        state.viewState,
        this.appSettings
      );

      const wrapper = new FloatingViewWrapper(
        state,
        descriptor.displayName,
        viewInstance,
        (id) => this.destroyView(id), // Callback for close button
        (newState) => this.handleViewStateChange(newState), // Callback for state updates (pos, focus)
        descriptor.defaultWidth,
        descriptor.defaultHeight
      );

      this.activeViews.set(instanceId, wrapper);
      this.viewAreaElement.appendChild(wrapper.element);
      this.saveState(); // Save after adding
      console.log(
        `Spawned floating view instance: ${instanceId} (type: ${viewId})`
      );
    } catch (e) {
      console.error(`Error creating view instance for ${viewId}:`, e);
    }
  }

  public destroyView(instanceId: string): void {
    const wrapper = this.activeViews.get(instanceId);
    if (wrapper) {
      const viewId = wrapper["state"].viewId; // Get viewId before destroying
      // Wrapper's destroy method calls the View's destroy and removes element
      this.activeViews.delete(instanceId);
      this.saveState(); // Save after removing
      console.log(
        `Destroyed floating view instance: ${instanceId} (type: ${viewId})`
      );
      // No longer need to dispatch event for checkbox sync
      // document.dispatchEvent(new CustomEvent('floating-view-destroyed', { detail: { viewId: viewId } }));
    }
  }

  // Removed destroyViewByViewId, isViewActive, getViewInstanceId as they are not needed for this UI model

  public restoreViewsFromState(): void {
    if (!this.viewAreaElement) return;
    console.log("Restoring floating views from state...");
    const savedState = this.loadState();
    if (savedState && savedState.openViews) {
      this.currentMaxZIndex = savedState.nextZIndex || 100; // Restore z-index counter

      // Sort by z-index before spawning to preserve layering
      const sortedStates = Object.values(savedState.openViews).sort(
        (a, b) => a.zIndex - b.zIndex
      );

      sortedStates.forEach((state) => {
        // Use a simplified spawn logic that assumes state is complete
        const descriptor = getFloatingViewDescriptor(state.viewId);
        if (!descriptor) {
          console.warn(
            `Cannot restore view: Descriptor not found for viewId "${state.viewId}"`
          );
          return;
        }
        try {
          // Ensure instanceId counter is beyond any loaded IDs
          const numericId = parseInt(state.instanceId.replace("fv-", ""), 10);
          if (!isNaN(numericId)) {
            this.nextInstanceId = Math.max(this.nextInstanceId, numericId + 1);
          }

          // Pass current settings reference on restore
          const viewInstance = descriptor.createView(
            state.viewState,
            this.appSettings
          );
          const wrapper = new FloatingViewWrapper(
            state, // Pass the full saved state
            descriptor.displayName,
            viewInstance,
            (id) => this.destroyView(id),
            (newState) => this.handleViewStateChange(newState),
            state.size?.width ?? descriptor.defaultWidth, // Use saved size if available
            state.size?.height ?? descriptor.defaultHeight
          );
          this.activeViews.set(state.instanceId, wrapper);
          this.viewAreaElement.appendChild(wrapper.element);
        } catch (e) {
          console.error(
            `Error recreating view instance ${state.instanceId} (${state.viewId}):`,
            e
          );
        }
      });
      console.log(`Restored ${this.activeViews.size} floating views.`);
    } else {
      console.log("No saved floating view state found.");
    }
  }

  // --- Internal State Management ---

  private handleViewStateChange(newState: FloatingViewInstanceState): void {
    const wrapper = this.activeViews.get(newState.instanceId);
    if (!wrapper) return;

    // Bring to front logic
    if (newState.zIndex < this.currentMaxZIndex) {
      this.currentMaxZIndex++;
      newState.zIndex = this.currentMaxZIndex;
      wrapper.bringToFront(newState.zIndex);
      // Save state only if z-index changed to bring to front
      this.saveState();
    } else {
      // Otherwise, just save the potentially changed position/size
      this.saveState();
    }
  }

  private saveState(): void {
    if (typeof localStorage === "undefined") return; // Avoid errors in non-browser envs

    const stateToSave: FloatingViewManagerSaveState = {
      openViews: {},
      nextZIndex: this.currentMaxZIndex,
    };

    this.activeViews.forEach((wrapper, instanceId) => {
      // Get the *current* state from the wrapper instance
      stateToSave.openViews[instanceId] = wrapper["state"]; // Access private state for saving
    });

    try {
      localStorage.setItem(
        FLOATING_VIEW_STATE_KEY,
        JSON.stringify(stateToSave)
      );
    } catch (e) {
      console.error("Failed to save floating view state:", e);
    }
  }

  private loadState(): FloatingViewManagerSaveState | null {
    if (typeof localStorage === "undefined") return null;
    const savedJson = localStorage.getItem(FLOATING_VIEW_STATE_KEY);
    if (savedJson) {
      try {
        return JSON.parse(savedJson) as FloatingViewManagerSaveState;
      } catch (e) {
        console.error("Failed to parse saved floating view state:", e);
        localStorage.removeItem(FLOATING_VIEW_STATE_KEY); // Remove corrupted data
      }
    }
    return null;
  }
}

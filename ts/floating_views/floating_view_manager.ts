// ts/floating_views/floating_view_manager.ts
import { FloatingViewWrapper } from "./floating_view_wrapper";
import {
  FloatingViewDescriptor,
  FloatingViewInstanceState,
  FloatingViewManagerSaveState,
  isFretboardDescriptor,
} from "./floating_view_types";
import { getFloatingViewDescriptor } from "./floating_view_registry";
import { AppSettings } from "../settings"; // Needed for createView

const FLOATING_VIEW_STATE_KEY = "floatingViewStates";
const FLOATING_VIEW_AREA_ID = "floating-view-area";

export class FloatingViewManager {
  private activeViews = new Map<string, FloatingViewWrapper>();
  private viewAreaElement: HTMLElement | null;
  private nextInstanceId = 1;
  private currentMaxZIndex = 100;
  public appSettings: AppSettings;
  private storageKey: string;

  constructor(appSettings: AppSettings, storageKey: string = FLOATING_VIEW_STATE_KEY) {
    this.appSettings = appSettings;
    this.storageKey = storageKey;
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
    options?: {
      viewState?: any;
      position?: { x: number; y: number };
      size?: { width: number; height: number };
      title?: string;
    }
  ): void {
    if (!this.viewAreaElement) return;

    const descriptor = getFloatingViewDescriptor(viewId);
    if (!descriptor) {
      console.error(
        `Cannot spawn view: Descriptor not found for viewId "${viewId}"`
      );
      return;
    }

    const instanceId = `fv-${this.nextInstanceId++}`;
    this.currentMaxZIndex++;

    const state: FloatingViewInstanceState = {
      instanceId: instanceId,
      viewId: viewId,
      position: options?.position ?? {
        x: 50 + ((this.activeViews.size * 20) % 300),
        y: 50 + ((this.activeViews.size * 20) % 400),
      },
      size: options?.size,
      zIndex: this.currentMaxZIndex,
      viewState: options?.viewState,
    };

    try {
      const viewInstance = descriptor.createView(state.viewState, this.appSettings);
      const title = options?.title ?? descriptor.displayName;

      const wrapper = new FloatingViewWrapper(
        state,
        title,
        viewInstance,
        (id) => this.destroyView(id),
        (newState) => this.handleViewStateChange(newState),
        () => this.saveState(),
        descriptor.defaultWidth,
        descriptor.defaultHeight,
        isFretboardDescriptor(descriptor) && descriptor.supportsRotate ? () => this.handleRotateRequest(instanceId) : undefined,
        isFretboardDescriptor(descriptor) && descriptor.supportsZoom ? () => this.handleZoomRequest(instanceId) : undefined
      );

      this.activeViews.set(instanceId, wrapper);
      this.viewAreaElement.appendChild(wrapper.element);
      this.saveState();
      console.log(`Spawned floating view instance: ${instanceId} (type: ${viewId})`);
    } catch (e) {
      console.error(`Error creating view instance for ${viewId}:`, e);
    }
  }

  public destroyView(instanceId: string): void {
    const wrapper = this.activeViews.get(instanceId);
    if (wrapper) {
      const viewId = wrapper["state"].viewId;
      this.activeViews.delete(instanceId);
      this.saveState();
      console.log(`Destroyed floating view instance: ${instanceId} (type: ${viewId})`);
    }
  }

  public updateAllViews(state: any): void {
    this.activeViews.forEach(wrapper => {
      const viewInstance = wrapper['viewInstance'];
      if (viewInstance && typeof (viewInstance as any).update === 'function') {
        try {
          (viewInstance as any).update(state);
        } catch (e) {
          console.error("Error calling update for view:", wrapper['state']?.viewId, e);
        }
      }
    });
  }

  public restoreViewsFromState(): void {
    if (!this.viewAreaElement) return;
    console.log("Restoring floating views from state...");
    const savedState = this.loadState();
    if (savedState && savedState.openViews) {
      this.currentMaxZIndex = savedState.nextZIndex || 100;

      const sortedStates = Object.values(savedState.openViews).sort(
        (a, b) => a.zIndex - b.zIndex
      );

      sortedStates.forEach((state) => {
        const descriptor = getFloatingViewDescriptor(state.viewId);
        if (!descriptor) {
          console.warn(`Cannot restore view: Descriptor not found for viewId "${state.viewId}"`);
          return;
        }
        try {
          const numericId = parseInt(state.instanceId.replace("fv-", ""), 10);
          if (!isNaN(numericId)) {
            this.nextInstanceId = Math.max(this.nextInstanceId, numericId + 1);
          }

          // Apply any saved orientation/zoom overrides when recreating the view.
          const globalOrientation =
            (this.appSettings.categorySettings?.["Guitar"] as any)?.orientation ?? "vertical";
          const effectiveOrientation: "vertical" | "horizontal" =
            state.orientationOverride ?? globalOrientation;
          const zoomMultiplier = this._zoomMultiplierFor(
            effectiveOrientation,
            state.zoomActive ?? false
          );
          const settingsToUse =
            state.orientationOverride || state.zoomActive
              ? this._buildOverriddenSettings(state.orientationOverride, zoomMultiplier)
              : this.appSettings;

          const viewInstance = descriptor.createView(state.viewState, settingsToUse);
          const wrapper = new FloatingViewWrapper(
            state,
            descriptor.displayName,
            viewInstance,
            (id) => this.destroyView(id),
            (newState) => this.handleViewStateChange(newState),
            () => this.saveState(),
            state.size?.width ?? descriptor.defaultWidth,
            state.size?.height ?? descriptor.defaultHeight,
            isFretboardDescriptor(descriptor) && descriptor.supportsRotate ? () => this.handleRotateRequest(state.instanceId) : undefined,
            isFretboardDescriptor(descriptor) && descriptor.supportsZoom ? () => this.handleZoomRequest(state.instanceId) : undefined
          );
          this.activeViews.set(state.instanceId, wrapper);
          this.viewAreaElement.appendChild(wrapper.element);
        } catch (e) {
          console.error(`Error recreating view instance ${state.instanceId} (${state.viewId}):`, e);
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

    if (newState.zIndex < this.currentMaxZIndex) {
      this.currentMaxZIndex++;
      newState.zIndex = this.currentMaxZIndex;
      wrapper.bringToFront(newState.zIndex);
      this.saveState();
    } else {
      this.saveState();
    }
  }

  /**
   * Handles a rotate request from a floating view wrapper. Determines the new
   * orientation (toggling from whatever is currently effective), rebuilds the
   * view with overridden AppSettings, and replaces the wrapper's content.
   */
  private handleRotateRequest(instanceId: string): void {
    const wrapper = this.activeViews.get(instanceId);
    if (!wrapper) return;

    const state = wrapper["state"] as FloatingViewInstanceState;
    const descriptor = getFloatingViewDescriptor(state.viewId);
    if (!descriptor) return;

    // Toggle orientation: if currently vertical (or no override) → horizontal, and vice versa.
    const globalOrientation =
      (this.appSettings.categorySettings?.["Guitar"] as any)?.orientation ?? "vertical";
    const currentEffective: "vertical" | "horizontal" =
      state.orientationOverride ?? globalOrientation;
    const newOverride: "vertical" | "horizontal" =
      currentEffective === "vertical" ? "horizontal" : "vertical";

    state.orientationOverride = newOverride;

    // Recompute zoom multiplier for the new orientation (zoom ratio stays the same,
    // but the per-orientation scale factor changes).
    const zoomMultiplier = this._zoomMultiplierFor(newOverride, state.zoomActive ?? false);

    try {
      const overriddenSettings = this._buildOverriddenSettings(newOverride, zoomMultiplier);
      const newViewInstance = descriptor.createView(state.viewState, overriddenSettings);
      wrapper.replaceViewContent(newViewInstance);
    } catch (e) {
      console.error(`Error recreating view with orientation override for ${instanceId}:`, e);
    }

    this.saveState();
  }

  /**
   * Handles a zoom toggle request. Flips state.zoomActive, rebuilds the view
   * with the appropriate zoomMultiplier, and updates the zoom button appearance.
   */
  private handleZoomRequest(instanceId: string): void {
    const wrapper = this.activeViews.get(instanceId);
    if (!wrapper) return;

    const state = wrapper["state"] as FloatingViewInstanceState;
    const descriptor = getFloatingViewDescriptor(state.viewId);
    if (!descriptor) return;

    state.zoomActive = !state.zoomActive;

    const globalOrientation =
      (this.appSettings.categorySettings?.["Guitar"] as any)?.orientation ?? "vertical";
    const effectiveOrientation: "vertical" | "horizontal" =
      state.orientationOverride ?? globalOrientation;
    const zoomMultiplier = this._zoomMultiplierFor(effectiveOrientation, state.zoomActive);

    try {
      const overriddenSettings = this._buildOverriddenSettings(
        state.orientationOverride,
        zoomMultiplier
      );
      const newViewInstance = descriptor.createView(state.viewState, overriddenSettings);
      wrapper.replaceViewContent(newViewInstance);
      wrapper.updateZoomButtonState(state.zoomActive);
    } catch (e) {
      console.error(`Error recreating view with zoom override for ${instanceId}:`, e);
    }

    this.saveState();
  }

  /**
   * Returns the zoom scale multiplier for a given orientation and zoom state.
   * Horizontal zoomed → 2× size; vertical zoomed → 1.25× size; unzoomed → 1.0.
   */
  private _zoomMultiplierFor(
    orientation: "vertical" | "horizontal",
    zoomActive: boolean
  ): number {
    if (!zoomActive) return 1.0;
    return orientation === "horizontal" ? 2.0 : 1.25;
  }

  /**
   * Returns a shallow copy of appSettings with Guitar orientation and/or zoom
   * multiplier overridden. Pass undefined to leave a value unchanged.
   */
  private _buildOverriddenSettings(
    orientationOverride: "vertical" | "horizontal" | undefined,
    zoomMultiplier: number
  ): AppSettings {
    return {
      ...this.appSettings,
      categorySettings: {
        ...this.appSettings.categorySettings,
        Guitar: {
          ...(this.appSettings.categorySettings?.["Guitar"] ?? {}),
          ...(orientationOverride !== undefined ? { orientation: orientationOverride } : {}),
          zoomMultiplier,
        },
      },
    };
  }

  /**
   * Applies a settings change to all active floating views.
   *
   * - Updates appSettings to newSettings.
   * - Re-creates guitar fretboard views (not metronome/timer) so they
   *   immediately reflect setting changes (orientation, color scheme, etc.).
   * - Views with a per-instance orientationOverride keep their override but
   *   pick up all other setting changes (color scheme, tuning, handedness).
   * - Views without an override follow the new global orientation.
   * - Per-instance zoom state is preserved across settings changes.
   */
  public applySettingsChange(newSettings: AppSettings): void {
    const oldGuitarSettings = this.appSettings.categorySettings?.["Guitar"];
    const newGuitarSettings = newSettings.categorySettings?.["Guitar"];
    const guitarSettingsChanged =
      JSON.stringify(oldGuitarSettings) !== JSON.stringify(newGuitarSettings);

    this.appSettings = newSettings;

    if (!guitarSettingsChanged) return;

    // Views that manage their own runtime state should not be re-created.
    const SKIP_VIEW_IDS = new Set(["guitar_floating_metronome", "floating_timer"]);

    this.activeViews.forEach((wrapper, instanceId) => {
      const state = wrapper["state"] as FloatingViewInstanceState;
      if (SKIP_VIEW_IDS.has(state.viewId)) return;

      const descriptor = getFloatingViewDescriptor(state.viewId);
      if (!descriptor || descriptor.categoryName !== "Guitar") return;

      // Determine effective orientation and preserved zoom.
      const globalOrientation =
        (newSettings.categorySettings?.["Guitar"] as any)?.orientation ?? "vertical";
      const effectiveOrientation: "vertical" | "horizontal" =
        state.orientationOverride ?? globalOrientation;
      const zoomMultiplier = this._zoomMultiplierFor(
        effectiveOrientation,
        state.zoomActive ?? false
      );

      const settingsToUse = this._buildOverriddenSettings(
        state.orientationOverride,
        zoomMultiplier
      );

      try {
        const newViewInstance = descriptor.createView(state.viewState, settingsToUse);
        wrapper.replaceViewContent(newViewInstance);
      } catch (e) {
        console.error(`Error updating view ${instanceId} after settings change:`, e);
      }
    });

    this.saveState();
  }

  public exportStateJson(): string {
    const stateToExport: FloatingViewManagerSaveState = {
      openViews: {},
      nextZIndex: this.currentMaxZIndex,
    };
    this.activeViews.forEach((wrapper, instanceId) => {
      stateToExport.openViews[instanceId] = wrapper["state"];
    });
    return JSON.stringify(stateToExport, null, 2);
  }

  public importStateJson(json: string): void {
    const parsedState = JSON.parse(json) as FloatingViewManagerSaveState;

    const instanceIds = Array.from(this.activeViews.keys());
    instanceIds.forEach(id => {
      const wrapper = this.activeViews.get(id);
      if (wrapper) wrapper.destroy();
    });

    this.nextInstanceId = 1;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(parsedState));
    } catch (e) {
      console.error("Failed to write imported state to localStorage:", e);
      return;
    }
    this.restoreViewsFromState();
  }

  private saveState(): void {
    if (typeof localStorage === "undefined") return;

    const stateToSave: FloatingViewManagerSaveState = {
      openViews: {},
      nextZIndex: this.currentMaxZIndex,
    };

    this.activeViews.forEach((wrapper, instanceId) => {
      stateToSave.openViews[instanceId] = wrapper["state"];
    });

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(stateToSave));
    } catch (e) {
      console.error("Failed to save floating view state:", e);
    }
  }

  private loadState(): FloatingViewManagerSaveState | null {
    if (typeof localStorage === "undefined") return null;
    const savedJson = localStorage.getItem(this.storageKey);
    if (savedJson) {
      try {
        return JSON.parse(savedJson) as FloatingViewManagerSaveState;
      } catch (e) {
        console.error("Failed to parse saved floating view state:", e);
        localStorage.removeItem(this.storageKey);
      }
    }
    return null;
  }
}

import { View } from "../view";
import { AppSettings } from "../settings";
import { LinkRecord } from "./link_types";

// Describes a registered type of floating view
export interface FloatingViewDescriptor {
  viewId: string; // Unique identifier (e.g., "guitar_color_legend")
  displayName: string; // User-friendly name (e.g., "Color Legend (Guitar)")
  categoryName: string; // Category it belongs to (e.g., "Guitar")
  defaultWidth?: number; // Optional default width
  defaultHeight?: number; // Optional default height
  showInMenu?: boolean; // Optional: If false, won't be shown in spawnable view lists. Defaults to true.
  // Factory function to create an instance of the view's logic
  createView: (initialState?: any, appSettings?: AppSettings) => View;
}

/**
 * Descriptor for fretboard-based floating views. These support per-instance
 * orientation rotation and zoom, which are surfaced as title-bar buttons.
 */
export interface FretboardFloatingViewDescriptor extends FloatingViewDescriptor {
  readonly isFretboardView: true;
  /** When true, a rotate button is shown in the title bar. */
  supportsRotate: boolean;
  /** When true, a zoom toggle button is shown in the title bar. */
  supportsZoom: boolean;
}

/** Returns true (and narrows the type) when a descriptor is a fretboard view. */
export function isFretboardDescriptor(
  d: FloatingViewDescriptor
): d is FretboardFloatingViewDescriptor {
  return (d as FretboardFloatingViewDescriptor).isFretboardView === true;
}

// Represents the state of an active, visible floating view instance
export interface FloatingViewInstanceState {
  instanceId: string; // Unique ID for this specific instance
  viewId: string; // Which type of view this is
  position: { x: number; y: number };
  size?: { width: number; height: number }; // Optional if resizable
  zIndex: number;
  viewState?: any; // Optional state specific to the View instance itself
  /** Per-instance orientation override, independent of the global Guitar setting. */
  orientationOverride?: "vertical" | "horizontal";
  /** Whether this instance is currently in the zoomed state. */
  zoomActive?: boolean;
}

// Structure for saving state to localStorage
export interface FloatingViewManagerSaveState {
  openViews: { [instanceId: string]: FloatingViewInstanceState };
  nextZIndex: number;
  links?: LinkRecord[];
}

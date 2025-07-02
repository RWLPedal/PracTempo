import { View } from "../view";
import { AppSettings } from "../settings";

// Describes a registered type of floating view
export interface FloatingViewDescriptor {
  viewId: string; // Unique identifier (e.g., "guitar_color_legend")
  displayName: string; // User-friendly name (e.g., "Color Legend (Guitar)")
  categoryName: string; // Category it belongs to (e.g., "Guitar")
  defaultWidth?: number; // Optional default width
  defaultHeight?: number; // Optional default height
  // Factory function to create an instance of the view's logic
  createView: (initialState?: any, appSettings?: AppSettings) => View;
}

// Represents the state of an active, visible floating view instance
export interface FloatingViewInstanceState {
  instanceId: string; // Unique ID for this specific instance
  viewId: string; // Which type of view this is
  position: { x: number; y: number };
  size?: { width: number; height: number }; // Optional if resizable
  zIndex: number;
  viewState?: any; // Optional state specific to the View instance itself
}

// Structure for saving state to localStorage
export interface FloatingViewManagerSaveState {
  openViews: { [instanceId: string]: FloatingViewInstanceState };
  nextZIndex: number;
}

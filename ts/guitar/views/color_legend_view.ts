import { View } from "../../view";
import { AppSettings, getCategorySettings } from "../../settings";
import {
  GuitarSettings,
  GUITAR_SETTINGS_KEY,
  DEFAULT_GUITAR_SETTINGS,
} from "../guitar_settings";
import { INTERVAL_COLORS, NOTE_COLORS } from "../colors"; // Import color maps

export class ColorLegendView implements View {
  private container: HTMLElement | null = null;
  private appSettings: AppSettings;

  constructor(appSettings?: AppSettings) {
    // Need AppSettings to get the current guitar color scheme
    if (!appSettings) {
      throw new Error("ColorLegendView requires AppSettings instance.");
    }
    this.appSettings = appSettings;
  }

  render(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = ""; // Clear previous content
    this.container.classList.add("color-legend-view"); // For styling

    const guitarSettings =
      getCategorySettings<GuitarSettings>(
        this.appSettings,
        GUITAR_SETTINGS_KEY
      ) ?? DEFAULT_GUITAR_SETTINGS;
    const currentScheme = guitarSettings.colorScheme;

    let colorMap: { [key: string]: string } = {};
    let title = "Color Legend";

    if (currentScheme === "interval") {
      colorMap = INTERVAL_COLORS;
      title = "Interval Color Legend";
    } else if (currentScheme === "note") {
      colorMap = NOTE_COLORS;
      title = "Note Color Legend";
      // Filter out aliases for display? (Optional)
      const primaryNoteMap: { [key: string]: string } = {};
      Object.entries(NOTE_COLORS).forEach(([key, value]) => {
        if (!key.includes("b") || key.length === 2) {
          // Basic filter for primary names (A, A#, B, C...)
          if (key !== "DEFAULT") primaryNoteMap[key] = value;
        }
      });
      colorMap = primaryNoteMap;
    } else {
      // Simplified or others
      colorMap = { R: INTERVAL_COLORS["R"], Other: INTERVAL_COLORS["DEFAULT"] };
      title = "Simplified Color Legend";
    }

    // Add a title inside the view content
    const titleEl = document.createElement("div");
    titleEl.classList.add("legend-title");
    titleEl.textContent = title;
    this.container.appendChild(titleEl);

    // Create legend items
    for (const key in colorMap) {
      if (key === "DEFAULT") continue; // Skip default entry

      const item = document.createElement("div");
      item.classList.add("legend-item");

      const swatch = document.createElement("span");
      swatch.classList.add("color-swatch");
      swatch.style.backgroundColor = colorMap[key];

      const label = document.createElement("span");
      label.classList.add("legend-label");
      label.textContent = key;

      item.appendChild(swatch);
      item.appendChild(label);
      this.container.appendChild(item);
    }
  }

  // --- View Lifecycle Methods (Simple for this static view) ---
  start(): void {}
  stop(): void {}
  destroy(): void {
    // Cleanup if needed (remove listeners, etc.)
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.container = null;
  }
}

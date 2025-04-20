import { ScheduleEditor } from "./editor/schedule_editor";
// Import the structure definition for parsing
import { ScheduleDocument } from "./editor/schedule_serializer";

export class ScheduleLoadModal {
  private modalEl: HTMLElement;
  private scheduleEditor: ScheduleEditor;
  private recentListEl: HTMLElement;
  private previewEl: HTMLElement;
  private previewContentEl: HTMLElement;
  private closePreviewButtonEl: HTMLElement;
  private saveToDiskButtonEl: HTMLElement;
  private loadFromDiskInputEl: HTMLInputElement;
  private loadScheduleModalCloseButtonEl: HTMLElement;
  private loadScheduleModalCancelButtonEl: HTMLElement;
  private recentSchedulesKey: string; // Key for localStorage (e.g., recentSchedulesJSON)

  constructor(
    modalEl: HTMLElement,
    scheduleEditor: ScheduleEditor,
    recentSchedulesKey: string
  ) {
    if (!modalEl) throw new Error("Load Schedule Modal element not provided.");
    this.modalEl = modalEl;
    this.scheduleEditor = scheduleEditor;
    this.recentSchedulesKey = recentSchedulesKey;

    // Find required elements
    const requiredSelectors = {
      recentListEl: "#recent-schedules-list",
      previewEl: "#recent-schedule-preview",
      previewContentEl: "#recent-schedule-preview-content",
      closePreviewButtonEl: "#close-preview-button",
      saveToDiskButtonEl: "#save-schedule-disk",
      loadFromDiskInputEl: "#load-schedule-input-hidden",
      loadScheduleModalCloseButtonEl: "#load-schedule-modal-close",
      loadScheduleModalCancelButtonEl: "#load-schedule-modal-cancel",
    };

    let allFound = true;
    for (const key in requiredSelectors) {
      const element = this.modalEl.querySelector(
        requiredSelectors[key as keyof typeof requiredSelectors]
      );
      if (!element) {
        console.error(
          `Load/Save Modal Error: Element not found for selector "${
            requiredSelectors[key as keyof typeof requiredSelectors]
          }"`
        );
        allFound = false;
      }
      (this as any)[key] = element; // Assign element
    }

    if (!allFound) {
      console.error(
        "Load/Save modal cannot initialize properly due to missing elements."
      );
      // Optionally disable buttons or throw error
      return;
    }

    this._attachHandlers();
  }

  public show(): void {
    this.refreshRecentList();
    this._hidePreview();
    this.modalEl.classList.add("is-active");
  }

  public hide(): void {
    this.modalEl.classList.remove("is-active");
  }

  public isOpen(): boolean {
    return this.modalEl.classList.contains("is-active");
  }

  /** Reloads and displays the recent schedules list from localStorage */
  public refreshRecentList(): void {
    if (!this.recentListEl) return;

    this.recentListEl.innerHTML = ""; // Clear existing list
    const stored = localStorage.getItem(this.recentSchedulesKey);
    let recentSchedulesJSONStrings: string[] = []; // Expect array of JSON strings

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (
          Array.isArray(parsed) &&
          parsed.every((item) => typeof item === "string")
        ) {
          recentSchedulesJSONStrings = parsed;
        }
      } catch (e) {
        console.error(
          "Error parsing recent schedules JSON from localStorage:",
          e
        );
      }
    }

    if (recentSchedulesJSONStrings.length === 0) {
      this.recentListEl.innerHTML =
        '<li class="is-disabled"><a>(No recent schedules saved)</a></li>';
      return;
    }

    recentSchedulesJSONStrings.forEach((scheduleJSONString, index) => {
      const listItem = document.createElement("li");
      const link = document.createElement("a");
      const viewButton = document.createElement("button");

      // Try to parse JSON to get the name for a better preview title
      let previewTitle = `Saved Schedule ${index + 1}`; // Default title
      try {
        const scheduleDoc: ScheduleDocument = JSON.parse(scheduleJSONString);
        if (scheduleDoc.name) {
          previewTitle = scheduleDoc.name;
        } else if (scheduleDoc.items && scheduleDoc.items.length > 0) {
          // Fallback: Find first task or group name if no schedule name
          const firstItem = scheduleDoc.items[0];
          if ("task" in firstItem && firstItem.task) {
            previewTitle = `${firstItem.task.substring(0, 25)}${
              firstItem.task.length > 25 ? "..." : ""
            } (${firstItem.duration || "N/A"})`;
          } else if ("name" in firstItem && firstItem.name) {
            // Group name
            previewTitle = `${firstItem.name.substring(0, 30)}${
              firstItem.name.length > 30 ? "..." : ""
            }`;
          }
        }
      } catch {
        /* Ignore parsing errors for title */
      }

      link.textContent = previewTitle;
      link.title = "Click to load this schedule into the editor";
      link.onclick = (e) => {
        e.preventDefault();
        // Pass the original JSON string to load
        this._loadRecentSchedule(scheduleJSONString);
      };

      viewButton.textContent = "View";
      viewButton.classList.add(
        "button",
        "is-small",
        "is-pulled-right",
        "is-info",
        "is-outlined"
      );
      viewButton.style.marginLeft = "10px";
      viewButton.title = "Preview full schedule content";
      viewButton.onclick = (e) => {
        e.stopPropagation();
        // Pass the original JSON string to preview
        this._showPreview(scheduleJSONString);
      };

      link.appendChild(viewButton);
      listItem.appendChild(link);
      this.recentListEl.appendChild(listItem);
    });
  }

  private _attachHandlers(): void {
    // Close modal
    this.loadScheduleModalCloseButtonEl.onclick = () => this.hide();
    this.loadScheduleModalCancelButtonEl.onclick = () => this.hide();
    this.modalEl
      .querySelector(".modal-background")
      ?.addEventListener("click", () => this.hide());

    // Save/Load
    this.saveToDiskButtonEl.onclick = () => this._saveCurrentScheduleToFile();
    this.loadFromDiskInputEl.onchange = (event) => {
      const file = (event.target as HTMLInputElement)?.files?.[0];
      if (file) {
        this._loadScheduleFromFile(file);
        (event.target as HTMLInputElement).value = ""; // Reset input
      }
    };

    // Preview
    this.closePreviewButtonEl.onclick = () => this._hidePreview();
  }

  private _loadRecentSchedule(scheduleJSONString: string): void {
    if (
      confirm(
        "Load this schedule? This will replace the current content in the editor."
      )
    ) {
      try {
        this.scheduleEditor.setScheduleJSON(scheduleJSONString); // Load the JSON string
        this.hide();
      } catch (e: any) {
        console.error("Error loading recent schedule:", e);
        alert(`Error loading schedule: ${e.message}`);
      }
    }
  }

  private _showPreview(scheduleJSONString: string): void {
    try {
      // Parse and pretty-print the JSON for preview
      const parsedDoc = JSON.parse(scheduleJSONString); // Parse the full document
      const prettyJSON = JSON.stringify(parsedDoc, null, 2); // Stringify the parsed object
      this.previewContentEl.textContent = prettyJSON;
      this.previewEl.style.display = "block";
    } catch (e) {
      console.error("Error parsing JSON for preview:", e);
      this.previewContentEl.textContent =
        "Error: Could not parse schedule data for preview.";
      this.previewEl.style.display = "block";
    }
  }

  private _hidePreview(): void {
    this.previewEl.style.display = "none";
    this.previewContentEl.textContent = "";
  }

  private _saveCurrentScheduleToFile(): void {
    try {
      const scheduleJSONString = this.scheduleEditor.getScheduleJSON(); // Get JSON string
      // Basic check if it's a valid JSON object structure (more than just "[]")
      if (
        !scheduleJSONString ||
        scheduleJSONString.trim().length <= 2 ||
        !scheduleJSONString.trim().startsWith("{")
      ) {
        alert("Cannot save an empty or invalid schedule.");
        return;
      }

      // Try to parse to get name for filename suggestion
      let scheduleName = "";
      try {
        const scheduleDoc: ScheduleDocument = JSON.parse(scheduleJSONString);
        scheduleName = scheduleDoc.name || "";
      } catch {} // Ignore parsing errors for filename

      // Generate filename
      const baseName = (scheduleName || "schedule")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const filename = `${baseName.substring(0, 25)}.json`; // Use .json extension

      // Create Blob and trigger download
      const blob = new Blob([scheduleJSONString], {
        type: "application/json;charset=utf-8",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error("Error saving schedule to file:", e);
      alert(`Error saving schedule: ${e.message}`);
    }
  }

  private _loadScheduleFromFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        try {
          // Validate by parsing into the expected ScheduleDocument structure
          const parsedDoc: ScheduleDocument = JSON.parse(content);
          // Basic validation: check if 'items' is an array
          if (
            typeof parsedDoc !== "object" ||
            !Array.isArray(parsedDoc.items)
          ) {
            throw new Error("Invalid format: Missing 'items' array.");
          }
          // If parse succeeds and basic structure is okay, load it
          this.scheduleEditor.setScheduleJSON(content); // Load raw string
          this.hide();
          alert(`Schedule "${file.name}" loaded successfully.`);
        } catch (e: any) {
          console.error("Error parsing loaded file:", e);
          alert(
            `Error loading file "${file.name}": Invalid JSON format or structure.\n(${e.message})`
          );
        }
      } else {
        alert(
          `Error loading file "${file.name}": Could not read file content.`
        );
      }
    };
    reader.onerror = (event) => {
      console.error("File reading error:", event);
      alert(`Error reading file "${file.name}".`);
    };
    reader.readAsText(file); // Read as text
  }
}

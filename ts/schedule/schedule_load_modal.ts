// ts/schedule_load_modal.ts
import { ScheduleEditor } from "./editor/schedule_editor";

// Constants from main.ts (consider exporting from a shared file later)
const RECENT_SCHEDULES_KEY = "recentSchedules";

export class ScheduleLoadModal {
  private modalElement: HTMLElement;
  private scheduleEditor: ScheduleEditor;

  // DOM Elements within the modal
  private recentSchedulesListEl!: HTMLElement;
  private saveButtonEl!: HTMLElement;
  private loadFileInputEl!: HTMLInputElement; // The hidden file input
  private loadFileButtonEl!: HTMLElement; // The visible label/button
  private closeButtonEl!: HTMLElement; // Modal card close button
  private cancelButtonEl!: HTMLElement; // Modal card foot cancel button
  private modalBackgroundEl!: HTMLElement;

  constructor(modalElement: HTMLElement, scheduleEditor: ScheduleEditor) {
    if (!modalElement || !scheduleEditor) {
      throw new Error(
        "ScheduleLoadModal requires a valid modal element and ScheduleEditor instance."
      );
    }
    this.modalElement = modalElement;
    this.scheduleEditor = scheduleEditor;

    if (!this.findModalElements()) {
      console.error(
        "Could not find all required elements within the schedule load modal. Functionality will be limited."
      );
      // Disable the modal trigger button in Main? Or handle gracefully.
      return; // Prevent attaching listeners if elements are missing
    }

    this.attachEventListeners();
  }

  /** Finds and assigns required elements within the modal */
  private findModalElements(): boolean {
    this.recentSchedulesListEl = this.modalElement.querySelector(
      "#recent-schedules-list"
    ) as HTMLElement;
    this.saveButtonEl = this.modalElement.querySelector(
      "#save-schedule-disk"
    ) as HTMLElement;
    this.loadFileInputEl = this.modalElement.querySelector(
      "#load-schedule-input-hidden"
    ) as HTMLInputElement;
    this.loadFileButtonEl = this.modalElement.querySelector(
      'label[for="load-schedule-input-hidden"]'
    ) as HTMLElement; // Find the label acting as a button
    this.closeButtonEl = this.modalElement.querySelector(
      ".modal-card-head .delete"
    ) as HTMLElement; // Close button in header
    this.cancelButtonEl = this.modalElement.querySelector(
      "#load-schedule-modal-cancel"
    ) as HTMLElement; // Cancel button in footer
    this.modalBackgroundEl = this.modalElement.querySelector(
      ".modal-background"
    ) as HTMLElement;

    return !!(
      this.recentSchedulesListEl &&
      this.saveButtonEl &&
      this.loadFileInputEl &&
      this.loadFileButtonEl &&
      this.closeButtonEl &&
      this.cancelButtonEl &&
      this.modalBackgroundEl
    );
  }

  /** Attaches event listeners to modal elements */
  private attachEventListeners(): void {
    // --- Close Mechanisms ---
    this.closeButtonEl.onclick = () => this.hide();
    this.cancelButtonEl.onclick = () => this.hide();
    this.modalBackgroundEl.onclick = () => this.hide();

    // --- Action Buttons ---
    this.saveButtonEl.onclick = () => this.saveCurrentScheduleToFile();
    // The visible button triggers the hidden file input
    this.loadFileButtonEl.onclick = () => this.loadFileInputEl.click();
    // Handle file selection on the hidden input
    this.loadFileInputEl.onchange = (e) => this.loadScheduleFromFile(e);

    // --- Recent Schedules List (using event delegation) ---
    this.recentSchedulesListEl.onclick = (e) => {
      const target = e.target as HTMLElement;
      // Check if the clicked element is an <a> tag within the list
      if (target && target.tagName === "A" && target.closest("li")) {
        e.preventDefault(); // Prevent default anchor behavior
        const scheduleText = target.dataset.scheduleText;
        if (scheduleText) {
          this.handleRecentScheduleClick(scheduleText);
        } else if (!target.closest("li")?.classList.contains("is-disabled")) {
          // Check if it's not the placeholder
          console.warn("Clicked recent schedule item missing schedule data.");
        }
      }
    };
  }

  /** Checks if the modal is currently active/visible */
  public isOpen(): boolean {
    return this.modalElement.classList.contains("is-active");
  }

  /** Shows the modal and populates recent schedules */
  public show(): void {
    this.populateRecentSchedules();
    this.modalElement.classList.add("is-active");
    console.log("Load Schedule Modal shown.");
  }

  /** Hides the modal */
  public hide(): void {
    this.modalElement.classList.remove("is-active");
    // Reset file input value so 'onchange' fires even if the same file is selected again
    if (this.loadFileInputEl) {
      this.loadFileInputEl.value = "";
    }
    console.log("Load Schedule Modal hidden.");
  }

  /** Populates the list with recent schedules from localStorage */
  public populateRecentSchedules(): void {
    this.recentSchedulesListEl.innerHTML = ""; // Clear existing items
    let recentSchedules: string[] = [];

    try {
      const stored = localStorage.getItem(RECENT_SCHEDULES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          Array.isArray(parsed) &&
          parsed.every((item) => typeof item === "string")
        ) {
          recentSchedules = parsed;
        } else {
          console.warn(
            "Invalid recent schedules data in localStorage during modal population."
          );
        }
      }
    } catch (e) {
      console.error("Error reading recent schedules from localStorage:", e);
    }

    if (recentSchedules.length === 0) {
      const li = document.createElement("li");
      li.classList.add("is-disabled"); // Add class to style placeholder
      li.innerHTML = `<a>(No recent schedules saved)</a>`;
      this.recentSchedulesListEl.appendChild(li);
    } else {
      recentSchedules.forEach((scheduleText, index) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        // Store the full text in a data attribute
        a.dataset.scheduleText = scheduleText;
        // Display a truncated version or first line as the label
        const firstLine = scheduleText.split("\n")[0];
        const displayLabel =
          firstLine.length > 50
            ? firstLine.substring(0, 47) + "..."
            : firstLine;
        a.textContent = `${index + 1}. ${
          displayLabel || "(Untitled Schedule)"
        }`;
        a.title = scheduleText; // Show full text on hover
        li.appendChild(a);
        this.recentSchedulesListEl.appendChild(li);
      });
    }
  }

  /** Handles clicking on a recent schedule item */
  private handleRecentScheduleClick(scheduleText: string): void {
    console.log("Loading recent schedule into editor.");
    try {
      this.scheduleEditor.setScheduleText(scheduleText); // Use the new method
      this.hide(); // Close modal after loading
    } catch (error) {
      console.error("Error setting schedule text from recent item:", error);
      alert("Error loading the selected schedule. Please check the console.");
    }
  }

  /** Saves the current schedule from the editor to a text file */
  private saveCurrentScheduleToFile(): void {
    try {
      const scheduleText = this.scheduleEditor.getScheduleText(); // Get current text
      if (!scheduleText || scheduleText.trim().length === 0) {
        alert("Cannot save an empty schedule.");
        return;
      }

      const blob = new Blob([scheduleText], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // Create a simple filename, e.g., schedule_YYYY-MM-DD_HHMMSS.txt
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, ""); // YYYYMMDD_HHMMSS
      link.download = `schedule_${timestamp}.txt`;
      document.body.appendChild(link); // Required for Firefox
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Clean up
      console.log("Current schedule download initiated.");
      // Optionally hide modal after saving, or keep it open
      // this.hide();
    } catch (error) {
      console.error("Error saving schedule to file:", error);
      alert("Could not save the schedule to a file. See console for details.");
    }
  }

  /** Handles the file input change event to load a schedule from disk */
  private loadScheduleFromFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      console.log("No file selected.");
      return;
    }

    const file = input.files[0];
    if (file.type && !file.type.startsWith("text/")) {
      console.warn(
        `File selected is not a text file (${file.type}). Attempting to read anyway.`
      );
      // alert("Please select a plain text (.txt) file.");
      // return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (content === null || content === undefined) {
          throw new Error("File content is null or undefined.");
        }
        console.log("Loading schedule from file.");
        this.scheduleEditor.setScheduleText(content); // Use the new method
        this.hide(); // Close modal after successful load
      } catch (loadError) {
        console.error("Error loading schedule from file content:", loadError);
        alert(
          "Error reading or loading the schedule from the selected file. Please ensure it's a valid text file. See console for details."
        );
      }
    };

    reader.onerror = (e) => {
      console.error("Error reading file:", e);
      alert("Could not read the selected file.");
    };

    reader.readAsText(file); // Read the file as text
  }
}

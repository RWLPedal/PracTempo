import { AudioController } from "./audio_controller";
import { DisplayController, Status } from "./display_controller";
import { ScheduleEditor } from "./schedule/editor/schedule_editor";
import { featureRegistry, getAvailableCategories } from "./feature_registry";
import { FeatureCategoryName } from "./feature";
import { Schedule, Interval } from "./schedule/schedule";
import "./guitar/guitar";
import {
  AppSettings,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  GuitarSettings,
} from "./settings";
import { AVAILABLE_TUNINGS, TuningName } from "./guitar/fretboard";
import { ScheduleLoadModal } from "./schedule/schedule_load_modal";

// Constants for recent schedules storage
const RECENT_SCHEDULES_KEY = "recentSchedules";
const MAX_RECENT_SCHEDULES = 5;
const LAST_RUN_SCHEDULE_KEY = "lastRunScheduleText";

export class Main {
  currentSchedule: Schedule | null = null;
  displayController!: DisplayController;
  audioController!: AudioController;
  scheduleEditor!: ScheduleEditor;
  controlButtonEl!: HTMLElement;
  settingsButtonEl!: HTMLElement; // Button to open settings
  settingsModalEl!: HTMLElement; // The modal element
  scheduleAccordionEl!: HTMLElement; // The main accordion container
  scheduleAccordionHeaderEl!: HTMLElement; // The clickable header
  settings: AppSettings; // Holds the current settings
  loadScheduleButtonEl!: HTMLElement;
  scheduleLoadModal!: ScheduleLoadModal;

  constructor() {
    console.log("Initializing Main Application...");
    this.settings = this.loadSettings(); // Load settings on start

    if (!this.ensureElementsExist()) {
      return; // Stop initialization if elements are missing
    }

    this.applySettings(); // Apply loaded settings (like theme) immediately

    this.audioController = new AudioController(
      document.querySelector("#intro-end-sound") as HTMLAudioElement,
      document.querySelector("#interval-end-sound") as HTMLAudioElement
    );

    this.displayController = new DisplayController(
      document.querySelector("#timer") as HTMLElement,
      document.querySelector("#total-timer") as HTMLElement,
      document.querySelector("#task-wrapper") as HTMLElement,
      document.querySelector("#task") as HTMLElement,
      document.querySelector("#diagram") as HTMLElement,
      document.querySelector("#status") as HTMLElement,
      document.querySelector("#upcoming") as HTMLElement,
      document.querySelector("#start-control") as HTMLElement
    );

    const editorContainer = document.querySelector(
      "#schedule-editor-container"
    );
    if (editorContainer) {
      this.scheduleEditor = new ScheduleEditor(
        editorContainer as HTMLElement,
        () => this.reset(), // Pass reset as the updateAction
        this.audioController
      );
    } else {
      console.error("CRITICAL: Schedule editor container not found!");
      alert("Error: Schedule editor failed to load.");
      return;
    }

    const loadModalElement = document.querySelector(
      "#load-schedule-modal"
    ) as HTMLElement;
    if (loadModalElement && this.scheduleEditor) {
      // Pass the scheduleEditor instance to the modal
      this.scheduleLoadModal = new ScheduleLoadModal(
        loadModalElement,
        this.scheduleEditor
      );
      console.log("ScheduleLoadModal initialized.");
    } else {
      console.warn(
        "Load schedule modal element (#load-schedule-modal) or ScheduleEditor not found. Load functionality will be unavailable."
      );
      // Optionally, handle the case where the modal doesn't exist gracefully
    }

    this.addControlHandlers();
    this.addSettingsModalHandlers(); // Add handlers for the settings modal
    this.addAccordionHandlers(); // Add handlers for the schedule accordion
    const lastRunText = localStorage.getItem(LAST_RUN_SCHEDULE_KEY);
    let loadedFromStorage = false;
    if (lastRunText) {
      try {
        console.log(
          "Found last run schedule in localStorage. Attempting to load..."
        );
        // Use setScheduleText - it handles parsing, UI update, AND calls reset() internally
        this.scheduleEditor.setScheduleText(lastRunText);
        loadedFromStorage = true;
        console.log("Last run schedule loaded successfully.");
      } catch (e) {
        console.error("Error loading or setting last run schedule:", e);
        // Fallback to default reset if loading fails
        this.reset();
      }
    }

    // If nothing was loaded from storage, perform the initial reset
    if (!loadedFromStorage) {
      console.log(
        "No last run schedule found or loading failed. Performing initial reset."
      );
      this.reset(); // Initial load (will also expand accordion)
    }

    console.log("Initialization complete.");
  }

  // Helper to check essential elements
  private ensureElementsExist(): boolean {
    // Add the new load button and modal IDs
    const requiredIds = [
      "#timer",
      "#total-timer",
      "#task-wrapper",
      "#task",
      "#diagram",
      "#status",
      "#upcoming",
      "#start-control",
      "#reset-control",
      "#intro-end-sound",
      "#interval-end-sound",
      "#schedule-editor-container",
      "#metronome-sound",
      "#settings-button",
      "#settings-modal",
      "#theme-select",
      "#warmup-input",
      "#handedness-select",
      "#tuning-select",
      "#settings-save-button",
      "#settings-cancel-button",
      "#settings-modal-close",
      "#schedule-accordion",
      "#load-schedule-button",
      "#load-schedule-modal",
    ];
    let allFound = true;
    requiredIds.forEach((id) => {
      if (!document.querySelector(id)) {
        // Don't make load modal critical for core function, but warn
        if (id === "#load-schedule-modal" || id === "#load-schedule-button") {
          console.warn(
            `Optional HTML element not found: ${id}. Load functionality will be unavailable.`
          );
        } else {
          console.error(
            `CRITICAL ERROR: Required HTML element not found: ${id}`
          );
          allFound = false;
        }
      }
    });
    if (!allFound) {
      alert(
        "Error: Could not find all necessary page elements. The application might not work correctly."
      );
    } else {
      this.settingsModalEl = document.querySelector(
        "#settings-modal"
      ) as HTMLElement;
      this.scheduleAccordionEl = document.querySelector(
        "#schedule-accordion"
      ) as HTMLElement;
      if (this.scheduleAccordionEl) {
        this.scheduleAccordionHeaderEl = this.scheduleAccordionEl.querySelector(
          ".accordion-header"
        ) as HTMLElement;
        if (!this.scheduleAccordionHeaderEl) {
          console.error(
            `CRITICAL ERROR: Required HTML element not found: #schedule-accordion .accordion-header`
          );
          allFound = false;
        }
      } else {
        console.error(
          `CRITICAL ERROR: Required HTML element not found: #schedule-accordion`
        );
        allFound = false;
      }
      // Assign load button if found
      this.loadScheduleButtonEl = document.querySelector(
        "#load-schedule-button"
      ) as HTMLElement;
      if (!this.loadScheduleButtonEl) {
        // Warning already logged above
      }
    }
    return allFound;
  }

  addControlHandlers(): void {
    const startBtn = document.querySelector("#start-control") as HTMLElement;
    const resetBtn = document.querySelector("#reset-control") as HTMLElement;
    this.settingsButtonEl = document.querySelector(
      "#settings-button"
    ) as HTMLElement;
    this.loadScheduleButtonEl = document.querySelector(
      "#load-schedule-button"
    ) as HTMLElement;

    if (!startBtn || !resetBtn || !this.settingsButtonEl) {
      console.error(
        "Control or Settings buttons not found! Core functionality may be impaired."
      );
      // Don't return early if only load button is missing
    }
    if (!this.loadScheduleButtonEl) {
      console.warn(
        "Load Schedule button (#load-schedule-button) not found. Load functionality disabled."
      );
    }

    this.controlButtonEl = startBtn;
    this.controlButtonEl.onclick = () => this.toggleCountdown();
    resetBtn.onclick = () => this.reset();
    this.settingsButtonEl.onclick = () => this.openSettingsModal();

    if (this.loadScheduleButtonEl && this.scheduleLoadModal) {
      this.loadScheduleButtonEl.onclick = () => {
        if (this.currentSchedule?.isRunning()) {
          alert("Please stop the timer before loading or saving schedules.");
          return;
        }
        this.scheduleLoadModal.show();
      };
    } else if (this.loadScheduleButtonEl) {
      // Disable button if modal wasn't created
      this.loadScheduleButtonEl.setAttribute("disabled", "true");
      this.loadScheduleButtonEl.setAttribute(
        "title",
        "Load modal failed to initialize."
      );
    }
  }

  private loadSettings(): AppSettings {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        // Ensure nested objects are merged properly and defaults applied for missing keys
        const loaded: Partial<AppSettings> = { ...DEFAULT_SETTINGS };
        Object.assign(loaded, parsed); // Overwrite defaults with stored values
        // Explicitly merge nested objects if they exist in parsed
        if (parsed.guitarSettings) {
          loaded.guitarSettings = {
            ...DEFAULT_SETTINGS.guitarSettings,
            ...parsed.guitarSettings,
          };
        } else {
          loaded.guitarSettings = { ...DEFAULT_SETTINGS.guitarSettings };
        }

        // Validate loaded tuning value
        if (!AVAILABLE_TUNINGS[loaded.guitarSettings.tuning]) {
          console.warn(
            `Loaded invalid tuning "${loaded.guitarSettings.tuning}", defaulting to Standard.`
          );
          loaded.guitarSettings.tuning = "Standard";
        }

        return loaded as AppSettings;
      }
    } catch (e) {
      console.error("Failed to load settings from localStorage:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); // Return deep copy of defaults
  }

  private saveSettings(newSettings: AppSettings): void {
    try {
      // Validate tuning before saving
      if (!AVAILABLE_TUNINGS[newSettings.guitarSettings.tuning]) {
        console.warn(
          `Attempted to save invalid tuning "${newSettings.guitarSettings.tuning}", saving 'Standard' instead.`
        );
        newSettings.guitarSettings.tuning = "Standard";
      }
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      this.settings = newSettings; // Update internal state
      console.log("Settings saved:", this.settings);
    } catch (e) {
      console.error("Failed to save settings to localStorage:", e);
    }
  }

  private applySettings(): void {
    // Apply theme
    if (this.settings.theme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }

    console.log("Settings applied.");
    // Re-render the current feature if needed (e.g., handedness/tuning changed)
    // Check if schedule and current interval/feature exist and timer isn't running
    const currentInterval = this.currentSchedule?.getCurrentInterval();
    if (currentInterval?.feature && !this.currentSchedule?.isRunning()) {
      // Re-rendering might be complex if the feature needs full recreation
      // For now, assume reset() after save handles it, or trigger re-render if simple
      console.log(
        "Applying settings might require schedule reset to see visual changes in diagrams."
      );
      // Simple re-render attempt (might not work if feature state depends on construction)
      // this.displayController.renderFeature(currentInterval.feature, this.settings.guitarSettings.handedness);
    }
  }

  private openSettingsModal(): void {
    if (this.currentSchedule?.isRunning()) {
      alert("Please stop the timer before changing settings.");
      return;
    }
    if (!this.settingsModalEl) return;

    // Populate global settings
    (document.getElementById("theme-select") as HTMLSelectElement).value =
      this.settings.theme;
    (document.getElementById("warmup-input") as HTMLInputElement).value =
      String(this.settings.warmupPeriod);

    // Populate Guitar settings
    (document.getElementById("handedness-select") as HTMLSelectElement).value =
      this.settings.guitarSettings.handedness;
    // Ensure the saved tuning exists in the dropdown before setting it
    const tuningSelect = document.getElementById(
      "tuning-select"
    ) as HTMLSelectElement;
    if (AVAILABLE_TUNINGS[this.settings.guitarSettings.tuning]) {
      tuningSelect.value = this.settings.guitarSettings.tuning;
    } else {
      console.warn(
        `Saved tuning "${this.settings.guitarSettings.tuning}" not found in dropdown, selecting Standard.`
      );
      tuningSelect.value = "Standard"; // Fallback
    }

    this.settingsModalEl.classList.add("is-active");
  }

  private closeSettingsModal(): void {
    if (!this.settingsModalEl) return;
    this.settingsModalEl.classList.remove("is-active");
  }

  private addSettingsModalHandlers(): void {
    const saveBtn = document.getElementById("settings-save-button");
    const cancelBtn = document.getElementById("settings-cancel-button");
    const closeBtn = document.getElementById("settings-modal-close"); // Background/close button

    if (!saveBtn || !cancelBtn || !closeBtn || !this.settingsModalEl) return;

    saveBtn.onclick = () => {
      // Read values from modal inputs
      const theme = (
        document.getElementById("theme-select") as HTMLSelectElement
      ).value as "light" | "dark";
      const warmupPeriod =
        parseInt(
          (document.getElementById("warmup-input") as HTMLInputElement).value,
          10
        ) || 0;
      const handedness = (
        document.getElementById("handedness-select") as HTMLSelectElement
      ).value as "right" | "left";
      const tuning = (
        document.getElementById("tuning-select") as HTMLSelectElement
      ).value as TuningName;

      const newSettings: AppSettings = {
        ...this.settings, // Keep other potential settings
        theme: theme,
        warmupPeriod: Math.max(0, warmupPeriod), // Ensure non-negative
        guitarSettings: {
          handedness: handedness,
          tuning: AVAILABLE_TUNINGS[tuning] ? tuning : "Standard", // Validate tuning choice
        },
        // Add other category settings here if dynamically generated later
      };

      this.saveSettings(newSettings);
      this.applySettings();
      this.closeSettingsModal();
      this.reset(); // Force reset to apply timing/diagram changes
    };

    // Close modal on cancel or background click
    cancelBtn.onclick = () => this.closeSettingsModal();
    closeBtn.onclick = () => this.closeSettingsModal();
    const modalBackground =
      this.settingsModalEl.querySelector(".modal-background");
    if (modalBackground) {
      modalBackground.addEventListener("click", () =>
        this.closeSettingsModal()
      );
    }
  }

  // --- Accordion Logic ---

  private addAccordionHandlers(): void {
    if (!this.scheduleAccordionHeaderEl) {
      console.error(
        "Schedule accordion header not found, cannot add handlers."
      );
      return;
    }
    this.scheduleAccordionHeaderEl.onclick = () => {
      // Toggle based on current state
      const isCollapsed =
        this.scheduleAccordionEl.classList.contains("collapsed");
      this.toggleScheduleAccordion(!isCollapsed);
    };
  }

  /**
   * Toggles the schedule accordion's visibility.
   * @param collapse True to collapse, false to expand.
   */
  private toggleScheduleAccordion(collapse: boolean): void {
    if (!this.scheduleAccordionEl) return;
    if (collapse) {
      this.scheduleAccordionEl.classList.add("collapsed");
    } else {
      this.scheduleAccordionEl.classList.remove("collapsed");
    }
  }

  // --- Core Logic ---

  toggleCountdown(): void {
    if (!this.currentSchedule) {
      console.warn(
        "Toggle Countdown: No current schedule, attempting reset first."
      );
      this.reset();
      if (!this.currentSchedule) {
        console.error("Toggle Countdown: Reset failed, cannot start timer.");
        return;
      }
    }
    if (this.settingsModalEl?.classList.contains("is-active")) {
      console.warn(
        "Settings modal is open. Close it before controlling the timer."
      );
      return;
    }
    // *** NEW: Also check if the load modal is active ***
    if (this.scheduleLoadModal?.isOpen()) {
      console.warn(
        "Load Schedule modal is open. Close it before controlling the timer."
      );
      return;
    }

    if (this.currentSchedule!.isFinished()) {
      this.reset(); // Resets and prepares
    } else if (this.currentSchedule!.isRunning()) {
      this.currentSchedule!.pause();
      this.toggleScheduleAccordion(false); // Expand when paused
    } else {
      // --- Save schedule to localStorage before starting --- // *** NEW LOGIC ***
      try {
        const scheduleText = this.scheduleEditor.getScheduleText();
        // Only save if the text is not empty or just whitespace
        if (scheduleText && scheduleText.trim().length > 0) {
          // --- Save as LAST RUN schedule ---
          localStorage.setItem(LAST_RUN_SCHEDULE_KEY, scheduleText);
          console.log("Saved current schedule as last run schedule.");

          // --- Update RECENT schedules list (existing logic) ---
          const stored = localStorage.getItem(RECENT_SCHEDULES_KEY);
          let recentSchedules: string[] = [];
          // ... (rest of the existing recent schedules update logic remains the same) ...
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (
                Array.isArray(parsed) &&
                parsed.every((item) => typeof item === "string")
              ) {
                recentSchedules = parsed;
              } else {
                console.warn(
                  "Invalid data found in localStorage for recent schedules. Resetting."
                );
                recentSchedules = [];
              }
            } catch (parseError) {
              console.error(
                "Error parsing recent schedules from localStorage:",
                parseError
              );
              recentSchedules = []; // Reset on parse error
            }
          }
          recentSchedules = recentSchedules.filter(
            (item) => item !== scheduleText
          );
          recentSchedules.unshift(scheduleText);
          if (recentSchedules.length > MAX_RECENT_SCHEDULES) {
            recentSchedules = recentSchedules.slice(0, MAX_RECENT_SCHEDULES);
          }
          localStorage.setItem(
            RECENT_SCHEDULES_KEY,
            JSON.stringify(recentSchedules)
          );
          console.log(
            `Updated recent schedules list (${recentSchedules.length} items).`
          );
          // --- End RECENT schedules logic ---
        } else {
          console.log("Skipping save for empty schedule text.");
        }
      } catch (storageError) {
        console.error("Error saving schedule to localStorage:", storageError);
        // Don't prevent the timer from starting due to storage error
      }
      // --- End save schedule logic ---

      this.currentSchedule!.start();
      this.toggleScheduleAccordion(true); // Collapse when started
    }
  }

  reset(): void {
    console.log("Resetting schedule using current settings...");
    this.currentSchedule?.pause(); // Pause if running

    // Remove any existing butterbar messages on reset
    const existingButterbar =
      this.scheduleEditor?.containerEl?.querySelector(".butterbar-message");
    if (existingButterbar) existingButterbar.remove();

    try {
      // Pass settings down to ScheduleEditor's getSchedule method
      this.currentSchedule = this.scheduleEditor.getSchedule(
        this.displayController,
        this.settings // Pass the whole settings object
      );

      if (this.currentSchedule && this.currentSchedule.intervals.length > 0) {
        // Prepare renders the initial feature using the settings passed during getSchedule->createFeature
        this.currentSchedule.prepare();
        this.displayController.setStart();
        console.log("Schedule reset and prepared.");
      } else if (!this.currentSchedule) {
        // Handle case where getSchedule returned null due to errors (already logged by getSchedule)
        console.warn(
          "Reset resulted in an empty or invalid schedule (handled in getSchedule)."
        );
        // Display state is likely already set by getSchedule's error handling
        this.displayController.setStart(); // Ensure button is START
        this.displayController.setStatus(Status.Stop); // Ensure status is STOP
        this.currentSchedule = null; // Ensure it's null
      } else {
        // Handle empty schedule after successful parse (e.g., all rows had 0 duration)
        console.warn("Reset resulted in a valid but empty schedule.");
        this.displayController.setTask("No Schedule Loaded", "lightgrey");
        this.displayController.setTime(0);
        this.displayController.setTotalTime(0, 0);
        this.displayController.setUpcoming([], true);
        this.displayController.setStatus(Status.Stop);
        this.displayController.setStart();
        this.currentSchedule = null; // Ensure it's null if empty
      }
    } catch (error) {
      // Catch any unexpected errors during reset itself
      console.error("Unexpected error during reset:", error);
      this.displayController.setTask("Error During Reset", "red");
      this.displayController.setTime(0);
      this.displayController.setTotalTime(0, 0);
      this.displayController.setUpcoming([], true);
      this.displayController.setStatus(Status.Stop);
      this.displayController.setStart();
      this.currentSchedule = null;
    }
    // Update button state after reset attempt
    if (this.currentSchedule?.isRunning()) {
      // Should not be running after reset, but check anyway
      this.displayController.setPause();
      this.displayController.setStatus(Status.Play);
    } else {
      this.displayController.setStart();
      // Set status based on whether there's a valid schedule to be paused/stopped
      this.displayController.setStatus(
        this.currentSchedule ? Status.Pause : Status.Stop
      );
    }
    this.toggleScheduleAccordion(false); // Ensure accordion is expanded on reset
  }
}

// --- App Initialization ---
function initializeApp() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new Main());
  } else {
    new Main();
  }
}
initializeApp();

import { AudioController } from "./audio_controller";
import { DisplayController, Status } from "./display_controller";
import { ScheduleEditor } from "./schedule/editor/schedule_editor";
// feature_registry imports remain the same
import "./guitar/guitar"; // Ensure features are registered
import {
  AppSettings,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  GuitarSettings,
} from "./settings";
import { AVAILABLE_TUNINGS, TuningName } from "./guitar/fretboard";
import { ScheduleLoadModal } from "./schedule/schedule_load_modal";
import { FretboardColorScheme } from "./guitar/colors";
import { Schedule } from "./schedule/schedule"; // Import Schedule for type hint

// --- Constants for JSON Storage ---
const RECENT_SCHEDULES_JSON_KEY = "recentSchedulesJSON";
const MAX_RECENT_SCHEDULES = 5;
const LAST_RUN_SCHEDULE_JSON_KEY = "lastRunScheduleJSON";
const DEFAULT_MAX_CANVAS_HEIGHT = 650; // Use new key for last run JSON string
// --- End Constants ---

export class Main {
  currentSchedule: Schedule | null = null;
  displayController!: DisplayController;
  audioController!: AudioController;
  scheduleEditor!: ScheduleEditor;
  scheduleLoadModal!: ScheduleLoadModal;

  // UI Elements
  controlButtonEl!: HTMLElement;
  skipButtonEl!: HTMLElement;
  settingsButtonEl!: HTMLElement;
  settingsModalEl!: HTMLElement;
  scheduleAccordionEl!: HTMLElement;
  scheduleAccordionHeaderEl!: HTMLElement;
  loadScheduleButtonEl!: HTMLElement;

  settings: AppSettings;

  constructor() {
    // ... (constructor logic mostly remains the same) ...
    console.log("Initializing Main Application...");
    this.settings = this.loadSettings();

    if (!this.ensureElementsExist()) return;

    this.applySettings();

    // Initialize Controllers
    this.audioController = new AudioController(
      document.querySelector("#intro-end-sound") as HTMLAudioElement,
      document.querySelector("#interval-end-sound") as HTMLAudioElement
    );
    this.displayController = new DisplayController(
      document.querySelector("#timer") as HTMLElement,
      document.querySelector("#total-timer") as HTMLElement,
      document.querySelector("#task-wrapper") as HTMLElement,
      document.querySelector("#task") as HTMLElement,
      document.querySelector("#diagram") as HTMLElement, // This is the container where features render
      document.querySelector("#status") as HTMLElement,
      document.querySelector("#upcoming") as HTMLElement,
      document.querySelector("#start-control") as HTMLElement
    );

    // Initialize Schedule Editor
    const editorContainer = document.querySelector(
      "#schedule-editor-container"
    );
    if (editorContainer) {
      this.scheduleEditor = new ScheduleEditor(
        editorContainer as HTMLElement,
        () => this.reset(), // Pass reset as the updateAction callback
        this.audioController
      );
    } else {
      console.error("CRITICAL: Schedule editor container not found!");
      alert("Error: Schedule editor failed to load.");
      return;
    }

    // Initialize Load/Save Modal
    const loadModalElement = document.querySelector(
      "#load-schedule-modal"
    ) as HTMLElement;
    if (loadModalElement && this.scheduleEditor) {
      this.scheduleLoadModal = new ScheduleLoadModal(
        loadModalElement,
        this.scheduleEditor,
        RECENT_SCHEDULES_JSON_KEY // Pass the new key name for JSON storage
      );
      console.log("ScheduleLoadModal initialized.");
    } else {
      console.warn(
        "Load schedule modal element or ScheduleEditor not found. Load functionality unavailable."
      );
    }

    this.addControlHandlers();
    this.addSettingsModalHandlers();
    this.addAccordionHandlers();

    // Load last run schedule (JSON format)
    const lastRunJSON = localStorage.getItem(LAST_RUN_SCHEDULE_JSON_KEY);
    let loadedFromStorage = false;
    if (lastRunJSON) {
      try {
        console.log(
          "Found last run schedule (JSON) in localStorage. Attempting to load..."
        );
        this.scheduleEditor.setScheduleJSON(lastRunJSON, true); // Load JSON, skip sync initially
        loadedFromStorage = true;
        console.log(
          "Last run schedule (JSON) loaded successfully into editor."
        );
        this.reset(); // Trigger reset manually AFTER successful load
      } catch (e: any) {
        console.error("Error loading or setting last run schedule JSON:", e);
        localStorage.removeItem(LAST_RUN_SCHEDULE_JSON_KEY); // Remove corrupted data
        this.reset(); // Fallback to default reset
      }
    }

    // If nothing was loaded from storage, perform the initial reset
    if (!loadedFromStorage) {
      console.log(
        "No last run schedule JSON found or loading failed. Performing initial reset."
      );
      this.reset(); // This will load the default schedule from the editor
    }

    console.log("Initialization complete.");
  }

  // Helper to check essential elements
  private ensureElementsExist(): boolean {
    const requiredIds = [
      // Core UI
      "#timer",
      "#total-timer",
      "#task-wrapper",
      "#task",
      "#diagram",
      "#status",
      "#upcoming",
      "#start-control",
      "#skip-control",
      "#reset-control",
      // Audio
      "#intro-end-sound",
      "#interval-end-sound",
      "#metronome-sound",
      // Editor & Name (Check schedule-editor-container first)
      "#schedule-editor-container",
      "#schedule-accordion",
      "#schedule-name-display",
      "#edit-schedule-name-btn",
      // Settings
      "#settings-button",
      "#settings-modal",
      "#theme-select",
      "#warmup-input",
      "#handedness-select",
      "#tuning-select",
      "#color-scheme-select",
      "#settings-save-button",
      "#settings-cancel-button",
      "#settings-modal-close",
      // Load/save modal (optional but checked)
      "#load-schedule-button",
      "#load-schedule-modal",
    ];
    let allFound = true;
    requiredIds.forEach((id) => {
      const element = document.querySelector(id);
      if (!element) {
        if (id === "#load-schedule-modal" || id === "#load-schedule-button") {
          console.warn(
            `Optional HTML element not found: ${id}. Load/Save functionality might be unavailable.`
          );
        } else if (
          id === "#schedule-name-display" ||
          id === "#edit-schedule-name-btn"
        ) {
          console.warn(
            `Optional HTML element not found: ${id}. Schedule naming UI disabled.`
          );
          // Don't make naming critical for basic function
        } else {
          console.error(
            `CRITICAL ERROR: Required HTML element not found: ${id}`
          );
          allFound = false;
        }
      }
    });

    if (allFound) {
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
          console.error("CRITICAL ERROR: Accordion header not found.");
          allFound = false;
        }
      } else {
        console.error("CRITICAL ERROR: Accordion element not found.");
        allFound = false;
      }
      this.loadScheduleButtonEl = document.querySelector(
        "#load-schedule-button"
      ) as HTMLElement;
    } else if (!allFound) {
      // Only alert if critical elements missing
      alert(
        "Error: Could not find all necessary page elements. The application might not work correctly."
      );
    }

    return allFound;
  }

  // Attaches handlers to main control buttons
  addControlHandlers(): void {
    const startBtn = document.querySelector("#start-control") as HTMLElement;
    const skipBtn = document.querySelector("#skip-control") as HTMLElement;
    const resetBtn = document.querySelector("#reset-control") as HTMLElement;
    this.settingsButtonEl = document.querySelector(
      "#settings-button"
    ) as HTMLElement;
    this.loadScheduleButtonEl = document.querySelector(
      "#load-schedule-button"
    ) as HTMLElement;

    if (!startBtn || !skipBtn || !resetBtn || !this.settingsButtonEl) {
      console.error("Core control or Settings buttons not found!");
    }
    if (!this.loadScheduleButtonEl) {
      console.warn(
        "Load Schedule button (#load-schedule-button) not found. Load/Save modal functionality disabled."
      );
    }

    this.controlButtonEl = startBtn;
    this.skipButtonEl = skipBtn;
    this.controlButtonEl.onclick = () => this.toggleCountdown();
    this.skipButtonEl.onclick = () => this.skipCurrentTask();
    resetBtn.onclick = () => this.reset();
    this.settingsButtonEl.onclick = () => this.openSettingsModal();

    // Attach handler for load/save modal button only if modal instance exists
    if (this.loadScheduleButtonEl && this.scheduleLoadModal) {
      this.loadScheduleButtonEl.onclick = () => {
        if (this.currentSchedule?.isRunning()) {
          alert("Please stop the timer before loading or saving schedules.");
          return;
        }
        this.scheduleLoadModal.show(); // Show the modal
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

  // --- Settings Logic ---
  private loadSettings(): AppSettings {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        const loaded: AppSettings = JSON.parse(
          JSON.stringify(DEFAULT_SETTINGS)
        ); // Deep copy defaults

        // Merge top-level
        for (const key in parsed) {
          if (
            Object.prototype.hasOwnProperty.call(parsed, key) &&
            key !== "guitarSettings" &&
            key in loaded
          ) {
            (loaded as any)[key] = parsed[key];
          }
        }
        // Merge guitarSettings
        if (parsed.guitarSettings) {
          loaded.guitarSettings = {
            ...loaded.guitarSettings, // Start with defaults
            ...parsed.guitarSettings, // Overwrite with stored
          };
        }
        // Validation
        if (!AVAILABLE_TUNINGS[loaded.guitarSettings.tuning]) {
          loaded.guitarSettings.tuning = "Standard";
        }
        const validSchemes: FretboardColorScheme[] = [
          "default",
          "note",
          "interval",
        ];
        if (!validSchemes.includes(loaded.guitarSettings.colorScheme)) {
          loaded.guitarSettings.colorScheme = "default";
        }
        return loaded;
      }
    } catch (e) {
      console.error("Failed to load settings from localStorage:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); // Return deep copy
  }
  private saveSettings(newSettings: AppSettings): void {
    try {
      // Validation before saving
      if (!AVAILABLE_TUNINGS[newSettings.guitarSettings.tuning]) {
        newSettings.guitarSettings.tuning = "Standard";
      }
      const validSchemes: FretboardColorScheme[] = [
        "default",
        "note",
        "interval",
      ];
      if (!validSchemes.includes(newSettings.guitarSettings.colorScheme)) {
        newSettings.guitarSettings.colorScheme = "default";
      }
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      this.settings = newSettings;
      console.log("Settings saved:", this.settings);
    } catch (e) {
      console.error("Failed to save settings to localStorage:", e);
    }
  }
  private applySettings(): void {
    if (this.settings.theme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
    console.log("Settings applied.");
    // Visual changes requiring feature re-render are handled by reset() after save
  }
  private openSettingsModal(): void {
    if (this.currentSchedule?.isRunning()) {
      alert("Please stop the timer before changing settings.");
      return;
    }
    if (!this.settingsModalEl) return;
    // Populate global
    (document.getElementById("theme-select") as HTMLSelectElement).value =
      this.settings.theme;
    (document.getElementById("warmup-input") as HTMLInputElement).value =
      String(this.settings.warmupPeriod);
    // Populate Guitar
    (document.getElementById("handedness-select") as HTMLSelectElement).value =
      this.settings.guitarSettings.handedness;
    const tuningSelect = document.getElementById(
      "tuning-select"
    ) as HTMLSelectElement;
    tuningSelect.value = AVAILABLE_TUNINGS[this.settings.guitarSettings.tuning]
      ? this.settings.guitarSettings.tuning
      : "Standard";
    (
      document.getElementById("color-scheme-select") as HTMLSelectElement
    ).value = this.settings.guitarSettings.colorScheme;
    this.settingsModalEl.classList.add("is-active");
  }
  private closeSettingsModal(): void {
    if (!this.settingsModalEl) return;
    this.settingsModalEl.classList.remove("is-active");
  }
  private addSettingsModalHandlers(): void {
    const saveBtn = document.getElementById("settings-save-button");
    const cancelBtn = document.getElementById("settings-cancel-button");
    const closeBtn = document.getElementById("settings-modal-close");
    if (!saveBtn || !cancelBtn || !closeBtn || !this.settingsModalEl) return;

    saveBtn.onclick = () => {
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
      const colorScheme = (
        document.getElementById("color-scheme-select") as HTMLSelectElement
      ).value as FretboardColorScheme;

      const newSettings: AppSettings = {
        ...this.settings,
        theme: theme,
        warmupPeriod: Math.max(0, warmupPeriod),
        guitarSettings: {
          ...this.settings.guitarSettings,
          handedness: handedness,
          tuning: AVAILABLE_TUNINGS[tuning] ? tuning : "Standard", // Validate
          colorScheme: colorScheme,
        },
      };
      this.saveSettings(newSettings);
      this.applySettings();
      this.closeSettingsModal();
      this.reset(); // Force reset to apply changes
    };

    cancelBtn.onclick = () => this.closeSettingsModal();
    closeBtn.onclick = () => this.closeSettingsModal();
    this.settingsModalEl
      .querySelector(".modal-background")
      ?.addEventListener("click", () => this.closeSettingsModal());
  }

  // --- Accordion Logic ---
  private addAccordionHandlers(): void {
    if (!this.scheduleAccordionHeaderEl) return;
    this.scheduleAccordionHeaderEl.onclick = () => {
      const isCollapsed =
        this.scheduleAccordionEl.classList.contains("collapsed");
      this.toggleScheduleAccordion(!isCollapsed);
    };
  }
  private toggleScheduleAccordion(collapse: boolean): void {
    if (!this.scheduleAccordionEl) return;
    this.scheduleAccordionEl.classList.toggle("collapsed", collapse);
  }

  // --- Core Timer/Schedule Logic ---
  // --- Core Timer/Schedule Logic ---
  toggleCountdown(): void {
    // Prevent control if modals are open
    if (this.settingsModalEl?.classList.contains("is-active")) {
      console.warn("Settings modal is open.");
      return;
    }
    if (this.scheduleLoadModal?.isOpen()) {
      console.warn("Load Schedule modal is open.");
      return;
    }

    // Ensure schedule exists, reset if needed
    if (!this.currentSchedule) {
      this.reset();
      if (!this.currentSchedule) {
        console.error("Cannot start timer: Reset failed.");
        return;
      }
    }

    // Handle timer states
    if (this.currentSchedule.isFinished()) {
      this.reset(); // Reset if finished
    } else if (this.currentSchedule.isRunning()) {
      this.currentSchedule.pause();
      this.toggleScheduleAccordion(false); // Expand when paused
    } else {
      // --- Save schedule (JSON) to localStorage before starting ---
      try {
        const scheduleJSON = this.scheduleEditor.getScheduleJSON(); // Get JSON string
        // Basic check if JSON is not empty object "{}" or empty items "{\"items\":[]}"
        let isValidToSave = false;
        try {
          const parsed = JSON.parse(scheduleJSON);
          isValidToSave =
            parsed && Array.isArray(parsed.items) && parsed.items.length > 0;
        } catch {} // Ignore parse errors for this check

        if (isValidToSave) {
          localStorage.setItem(LAST_RUN_SCHEDULE_JSON_KEY, scheduleJSON); // Use new key
          console.log("Saved current schedule as last run schedule (JSON).");

          // --- Update Recent List ---
          const stored = localStorage.getItem(RECENT_SCHEDULES_JSON_KEY); // Use new key
          let recentSchedules: string[] = []; // Array of JSON strings
          if (stored) {
            try {
              const p = JSON.parse(stored);
              if (Array.isArray(p) && p.every((s) => typeof s === "string"))
                recentSchedules = p;
            } catch (e) {
              console.error(e);
            }
          }
          recentSchedules = recentSchedules.filter(
            (item) => item !== scheduleJSON
          ); // Remove duplicate
          recentSchedules.unshift(scheduleJSON); // Add to front
          if (recentSchedules.length > MAX_RECENT_SCHEDULES)
            recentSchedules.length = MAX_RECENT_SCHEDULES; // Limit size
          localStorage.setItem(
            RECENT_SCHEDULES_JSON_KEY,
            JSON.stringify(recentSchedules)
          );
          console.log(
            `Updated recent schedules list (${recentSchedules.length} items, JSON).`
          );
          if (this.scheduleLoadModal?.isOpen())
            this.scheduleLoadModal.refreshRecentList(); // Refresh modal if open
        } else {
          console.log("Skipping save for empty or invalid schedule JSON.");
        }
      } catch (storageError) {
        console.error(
          "Error saving schedule JSON to localStorage:",
          storageError
        );
      }
      // --- End save logic ---

      this.currentSchedule.start();
      this.toggleScheduleAccordion(true); // Collapse when started
    }
  }

  skipCurrentTask(): void {
    if (!this.currentSchedule || this.currentSchedule.isFinished()) {
      console.warn("Cannot skip: No active schedule or schedule finished.");
      return;
    }
    if (
      this.settingsModalEl?.classList.contains("is-active") ||
      this.scheduleLoadModal?.isOpen()
    ) {
      alert("Please close any open modals before skipping.");
      return;
    }
    this.currentSchedule.skip();
    this.toggleScheduleAccordion(this.currentSchedule.isRunning());
  }

  /** Resets the current schedule based on the editor content and global settings */
  reset(): void {
    console.log("Resetting schedule using current editor state...");
    this.currentSchedule?.pause(); // Pause existing schedule if any
    this.scheduleEditor?.errorDisplay?.removeMessage(); // Clear editor errors

    try {
      // --- Determine maxCanvasHeight from the #diagram container ---
      const diagramContainer = document.getElementById('diagram');
      // Use clientHeight, but ensure it's a reasonable value, otherwise fallback.
      // Checking > 50 avoids using 0 if the element hasn't rendered properly yet.
      const maxCanvasHeight = (diagramContainer?.clientHeight && diagramContainer.clientHeight > 50)
                              ? diagramContainer.clientHeight
                              : DEFAULT_MAX_CANVAS_HEIGHT; // Fallback to default
      console.log(`[Main.reset] Using maxCanvasHeight: ${maxCanvasHeight} (from container: ${diagramContainer?.clientHeight})`);
      // --- End maxCanvasHeight determination ---


      // getSchedule now handles syncing JSON view if needed and uses ScheduleBuilder
      // Pass the dynamically determined maxCanvasHeight constraint to getSchedule
      this.currentSchedule = this.scheduleEditor.getSchedule(
        this.displayController,
        this.settings, // Pass current global settings
        maxCanvasHeight // Pass height constraint
      );

      // Update UI based on whether a valid schedule was built
      if (this.currentSchedule && this.currentSchedule.intervals.length > 0) {
        this.currentSchedule.prepare(); // Prepare the first interval's display
        this.displayController.setStart();
        this.displayController.setStatus(Status.Pause);
        console.log("Schedule reset and prepared.");
      } else {
        // Handle empty or invalid schedule (getSchedule logs errors)
        console.warn("Reset resulted in empty or invalid schedule.");
        // Clear display if schedule is invalid/empty
        this.displayController.setTask("Load/Create Schedule", "lightgrey");
        this.displayController.setTime(0);
        this.displayController.setTotalTime(0, 0);
        this.displayController.setUpcoming([], true);
        this.displayController.setStatus(Status.Stop);
        this.displayController.setStart(); // Ensure button shows START
        this.displayController.clearFeature(); // Clear any old diagram
        this.currentSchedule = null; // Ensure no schedule object exists
      }
    } catch (error) {
      console.error("Unexpected error during reset/getSchedule:", error);
      this.displayController.setTask("Error During Reset", "red");
      this.displayController.setTime(0);
      this.displayController.setTotalTime(0, 0);
      this.displayController.setUpcoming([], true);
      this.displayController.setStatus(Status.Stop);
      this.displayController.setStart();
      this.displayController.clearFeature();
      this.currentSchedule = null;
    }
    this.toggleScheduleAccordion(false); // Ensure accordion is expanded after reset
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

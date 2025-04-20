import { AudioController } from "./audio_controller";
import { DisplayController, Status } from "./display_controller";
import { ScheduleEditor } from "./schedule/editor/schedule_editor";
// Import registry functions and types
import { FeatureCategoryName, SettingsUISchemaItem } from "./feature";
import {
  getAvailableCategories,
  getDefaultSettingsForCategory,
} from "./feature_registry";
// Import settings functions and types
import {
  AppSettings,
  loadSettings,
  getCategorySettings,
  CategorySettingsMap,
  SETTINGS_STORAGE_KEY,
  LAST_RUN_SCHEDULE_JSON_KEY,
  RECENT_SCHEDULES_JSON_KEY,
  MAX_RECENT_SCHEDULES,
} from "./settings";
// Import feature registration files (ensure they run)
import "./guitar/guitar"; // For Guitar category registration
// Other imports
import { ScheduleLoadModal } from "./schedule/schedule_load_modal";
import { Schedule } from "./schedule/schedule";

// --- Constants ---
const DEFAULT_MAX_CANVAS_HEIGHT = 650;
// ID for the container where dynamic settings will be injected
const CATEGORY_SETTINGS_CONTAINER_ID = "category-settings-container";

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

  settings: AppSettings; // Holds the currently active settings

  constructor() {
    console.log("Initializing Main Application...");
    // Load settings using the updated function which incorporates registry defaults
    this.settings = loadSettings();

    if (!this.ensureElementsExist()) return;

    this.applySettings(); // Apply theme initially

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
      document.querySelector("#diagram") as HTMLElement,
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
        () => this.reset(),
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
        RECENT_SCHEDULES_JSON_KEY
      );
      console.log("ScheduleLoadModal initialized.");
    } else {
      console.warn(
        "Load schedule modal element or ScheduleEditor not found. Load functionality unavailable."
      );
    }

    this.addControlHandlers();
    this.addSettingsModalHandlers(); // This needs refactoring
    this.addAccordionHandlers();

    // Load last run schedule (JSON format)
    const lastRunJSON = localStorage.getItem(LAST_RUN_SCHEDULE_JSON_KEY);
    let loadedFromStorage = false;
    if (lastRunJSON) {
      try {
        console.log(
          "Found last run schedule (JSON) in localStorage. Attempting to load..."
        );
        this.scheduleEditor.setScheduleJSON(lastRunJSON, true);
        loadedFromStorage = true;
        console.log(
          "Last run schedule (JSON) loaded successfully into editor."
        );
        this.reset(); // Trigger reset manually AFTER successful load
      } catch (e: any) {
        console.error("Error loading or setting last run schedule JSON:", e);
        localStorage.removeItem(LAST_RUN_SCHEDULE_JSON_KEY);
        this.reset(); // Fallback to default reset
      }
    }

    // If nothing was loaded from storage, perform the initial reset
    if (!loadedFromStorage) {
      console.log(
        "No last run schedule JSON found or loading failed. Performing initial reset."
      );
      this.reset();
    }

    console.log("Initialization complete.");
  }

  // ensureElementsExist remains the same
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
      // Editor & Name
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
      "#color-scheme-select", // Assuming these IDs exist for guitar settings
      "#settings-save-button",
      "#settings-cancel-button",
      "#settings-modal-close",
      // Load/save modal
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
        } else if (
          [
            "#handedness-select",
            "#tuning-select",
            "#color-scheme-select",
          ].includes(id)
        ) {
          console.warn(
            `HTML element for Guitar Setting not found: ${id}. Settings modal might be incomplete.`
          );
          // Don't make it critical if only settings elements are missing initially
        } else {
          console.error(
            `CRITICAL ERROR: Required HTML element not found: ${id}`
          );
          allFound = false;
        }
      }
    });

    if (allFound) {
      // Assign core elements needed by methods
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
      ) as HTMLElement; // May be null if optional element missing
    }
    if (!allFound) {
      alert(
        "Error: Could not find all necessary page elements. The application might not work correctly."
      );
    }
    return allFound;
  }

  // addControlHandlers remains the same
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
      return; // Prevent errors if core buttons are missing
    }

    this.controlButtonEl = startBtn;
    this.skipButtonEl = skipBtn;
    this.controlButtonEl.onclick = () => this.toggleCountdown();
    this.skipButtonEl.onclick = () => this.skipCurrentTask();
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
      this.loadScheduleButtonEl.setAttribute("disabled", "true");
      this.loadScheduleButtonEl.setAttribute(
        "title",
        "Load modal failed to initialize."
      );
    }
  }

  /** Saves the complete AppSettings object to localStorage */
  private saveSettings(newSettings: AppSettings): void {
    try {
      console.log(
        "[saveSettings] Attempting to save:",
        JSON.stringify(newSettings)
      );
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      this.settings = newSettings; // Update the instance's settings
      console.log("[saveSettings] Settings object updated in Main instance.");
    } catch (e) {
      console.error("Failed to save settings to localStorage:", e);
      alert("Error saving settings.");
    }
  }

  /** Applies global settings (like theme) */
  private applySettings(): void {
    if (this.settings.theme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
    console.log("Global settings applied.");
    // Category-specific visual changes are handled by reset() after save
  }

  /** Populates and opens the settings modal */
  private openSettingsModal(): void {
    if (this.currentSchedule?.isRunning()) {
      /* ... alert ... */ return;
    }
    if (!this.settingsModalEl) return;

    // --- Populate Global Settings ---
    (document.getElementById("theme-select") as HTMLSelectElement).value =
      this.settings.theme;
    (document.getElementById("warmup-input") as HTMLInputElement).value =
      String(this.settings.warmupPeriod);

    // --- Populate Dynamic Category Settings ---
    const container = this.settingsModalEl.querySelector<HTMLElement>(
      `#${CATEGORY_SETTINGS_CONTAINER_ID}`
    );
    if (!container) {
      console.error("Cannot find category settings container in modal!");
      return;
    }
    container.innerHTML = ""; // Clear previous dynamic content

    const categories = getAvailableCategories();
    categories.forEach((categoryDesc) => {
      if (typeof categoryDesc.getSettingsUISchema === "function") {
        const schemaItems = categoryDesc.getSettingsUISchema();
        if (schemaItems && schemaItems.length > 0) {
          const currentCategorySettings = getCategorySettings<any>(
            this.settings,
            categoryDesc.categoryName
          );
          // --- Create Category Header ---
          const categoryHeader = document.createElement("h5");
          categoryHeader.textContent = `${categoryDesc.displayName} Settings`;
          categoryHeader.classList.add(
            "title",
            "is-6",
            "category-settings-header",
            "mt-4"
          ); // Added margin-top
          container.appendChild(categoryHeader);
          // --- Create UI elements ---
          schemaItems.forEach((item) => {
            const fieldDiv = document.createElement("div");
            fieldDiv.classList.add("field", "is-horizontal");
            const fieldLabel = document.createElement("div");
            fieldLabel.classList.add("field-label", "is-normal");
            const label = document.createElement("label");
            label.classList.add("label");
            label.textContent = item.label;
            if (item.description) label.title = item.description;
            fieldLabel.appendChild(label);
            const fieldBody = document.createElement("div");
            fieldBody.classList.add("field-body");
            const fieldInner = document.createElement("div");
            fieldInner.classList.add("field");
            const control = document.createElement("div");
            control.classList.add("control");
            let inputElement: HTMLInputElement | HTMLSelectElement;
            const inputId = `setting-${categoryDesc.categoryName}-${item.key}`; // Consistent ID

            if (item.type === "select" && item.options) {
              inputElement = document.createElement("select");
              inputElement.id = inputId;
              const selectWrapper = document.createElement("div");
              selectWrapper.classList.add("select", "is-fullwidth");
              item.options.forEach((opt) => {
                const option = document.createElement("option");
                option.value = opt.value;
                option.textContent = opt.text;
                if (
                  currentCategorySettings &&
                  currentCategorySettings[item.key] === opt.value
                )
                  option.selected = true;
                inputElement.appendChild(option);
              });
              selectWrapper.appendChild(inputElement);
              control.appendChild(selectWrapper);
            } else {
              inputElement = document.createElement("input");
              inputElement.id = inputId;
              inputElement.type = item.type;
              if (item.type === "checkbox") {
                inputElement.classList.add("checkbox");
                inputElement.checked = !!(
                  currentCategorySettings && currentCategorySettings[item.key]
                );
                control.appendChild(inputElement); // Checkbox goes directly into control
              } else {
                inputElement.classList.add("input");
                inputElement.value =
                  currentCategorySettings &&
                  currentCategorySettings[item.key] !== undefined
                    ? String(currentCategorySettings[item.key])
                    : "";
                if (item.placeholder)
                  inputElement.placeholder = item.placeholder;
                if (item.min !== undefined) inputElement.min = String(item.min);
                if (item.max !== undefined) inputElement.max = String(item.max);
                if (item.step !== undefined)
                  inputElement.step = String(item.step);
                control.appendChild(inputElement);
              }
            }
            inputElement.dataset.category = categoryDesc.categoryName;
            inputElement.dataset.setting = item.key;
            label.htmlFor = inputId;
            fieldInner.appendChild(control);
            fieldBody.appendChild(fieldInner);
            fieldDiv.appendChild(fieldLabel);
            fieldDiv.appendChild(fieldBody);
            container.appendChild(fieldDiv);
          });
        }
      }
    });
    this.settingsModalEl.classList.add("is-active");
  }

  // closeSettingsModal remains the same
  private closeSettingsModal(): void {
    if (!this.settingsModalEl) return;
    this.settingsModalEl.classList.remove("is-active");
  }

  /** Attaches handlers for the settings modal buttons */
  private addSettingsModalHandlers(): void {
    const saveBtn = document.getElementById("settings-save-button");
    const cancelBtn = document.getElementById("settings-cancel-button");
    const closeBtn = document.getElementById("settings-modal-close");
    if (!saveBtn || !cancelBtn || !closeBtn || !this.settingsModalEl) return;

    saveBtn.onclick = () => {
      // 1. Create a deep copy of current settings to modify
      const newSettings: AppSettings = JSON.parse(
        JSON.stringify(this.settings)
      );

      // 2. Update global settings
      newSettings.theme = (
        document.getElementById("theme-select") as HTMLSelectElement
      ).value as "light" | "dark";
      newSettings.warmupPeriod = Math.max(
        0,
        parseInt(
          (document.getElementById("warmup-input") as HTMLInputElement).value,
          10
        ) || 0
      );

      // 3. Update Category Settings Dynamically
      const container = this.settingsModalEl.querySelector<HTMLElement>(
        `#${CATEGORY_SETTINGS_CONTAINER_ID}`
      );
      if (container) {
        // Find all input/select elements within the dynamic container
        const settingElements = container.querySelectorAll<
          HTMLInputElement | HTMLSelectElement
        >("input[data-setting], select[data-setting]");

        settingElements.forEach((element) => {
          const categoryKey = element.dataset.category;
          const settingKey = element.dataset.setting;

          if (categoryKey && settingKey) {
            // Ensure the category object exists in the settings map
            if (!newSettings.categorySettings[categoryKey]) {
              // Initialize with defaults if it's missing (shouldn't happen if loadSettings works)
              const defaults =
                getDefaultSettingsForCategory<any>(
                  categoryKey as FeatureCategoryName
                ) ?? {};
              newSettings.categorySettings[categoryKey] = { ...defaults };
              console.warn(
                `Initialized missing settings for category: ${categoryKey}`
              );
            }

            // Get the value based on element type
            let value: string | number | boolean;
            if (element.type === "checkbox") {
              value = (element as HTMLInputElement).checked;
            } else if (element.type === "number") {
              value = parseFloat(element.value) || 0; // Or handle NaN appropriately
              // Optional: Clamp value based on min/max attributes
              const min = element.getAttribute("min");
              const max = element.getAttribute("max");
              if (min !== null) value = Math.max(parseFloat(min), value);
              if (max !== null) value = Math.min(parseFloat(max), value);
            } else {
              value = element.value;
            }

            // Update the specific setting
            newSettings.categorySettings[categoryKey][settingKey] = value;
            console.log(
              `[Settings Save] Updated ${categoryKey}.${settingKey} to:`,
              value
            );
          }
        });
      } else {
        console.error("Category settings container not found during save!");
      }

      // 4. Save, Apply, Close, Reset
      this.saveSettings(newSettings);
      this.applySettings();
      this.closeSettingsModal();
      this.reset();
    };

    cancelBtn.onclick = () => this.closeSettingsModal();
    closeBtn.onclick = () => this.closeSettingsModal();
    this.settingsModalEl
      .querySelector(".modal-background")
      ?.addEventListener("click", () => this.closeSettingsModal());
  }

  // --- Accordion Logic (Remains the same) ---
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

  // --- Core Timer/Schedule Logic (Remains largely the same, uses updated settings) ---
  toggleCountdown(): void {
    if (this.settingsModalEl?.classList.contains("is-active")) {
      console.warn("Settings modal is open.");
      return;
    }
    if (this.scheduleLoadModal?.isOpen()) {
      console.warn("Load Schedule modal is open.");
      return;
    }
    if (!this.currentSchedule) {
      this.reset();
      if (!this.currentSchedule) {
        console.error("Cannot start timer: Reset failed.");
        return;
      }
    }

    if (this.currentSchedule.isFinished()) {
      this.reset();
    } else if (this.currentSchedule.isRunning()) {
      this.currentSchedule.pause();
      this.toggleScheduleAccordion(false);
    } else {
      try {
        const scheduleJSON = this.scheduleEditor.getScheduleJSON();
        let isValidToSave = false;
        try {
          const parsed = JSON.parse(scheduleJSON);
          isValidToSave =
            parsed && Array.isArray(parsed.items) && parsed.items.length > 0;
        } catch {
          /* ignore */
        }

        if (isValidToSave) {
          localStorage.setItem(LAST_RUN_SCHEDULE_JSON_KEY, scheduleJSON);
          console.log("Saved current schedule as last run schedule (JSON).");
          // --- Update Recent List ---
          const stored = localStorage.getItem(RECENT_SCHEDULES_JSON_KEY);
          let recentSchedules: string[] = [];
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
          );
          recentSchedules.unshift(scheduleJSON);
          if (recentSchedules.length > MAX_RECENT_SCHEDULES)
            recentSchedules.length = MAX_RECENT_SCHEDULES;
          localStorage.setItem(
            RECENT_SCHEDULES_JSON_KEY,
            JSON.stringify(recentSchedules)
          );
          if (this.scheduleLoadModal?.isOpen())
            this.scheduleLoadModal.refreshRecentList();
        } else {
          console.log("Skipping save for empty or invalid schedule JSON.");
        }
      } catch (storageError) {
        console.error(
          "Error saving schedule JSON to localStorage:",
          storageError
        );
      }
      this.currentSchedule.start();
      this.toggleScheduleAccordion(true);
    }
  }

  // skipCurrentTask remains the same
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

  /** Resets the schedule using the editor and current settings */
  reset(): void {
    console.log("Resetting schedule using current editor state...");
    this.currentSchedule?.pause();
    this.scheduleEditor?.errorDisplay?.removeMessage();

    try {
      const diagramContainer = document.getElementById("diagram");
      const maxCanvasHeight =
        diagramContainer?.clientHeight && diagramContainer.clientHeight > 50
          ? diagramContainer.clientHeight
          : DEFAULT_MAX_CANVAS_HEIGHT;
      console.log(
        `[Main.reset] Using maxCanvasHeight: ${maxCanvasHeight} (from container: ${diagramContainer?.clientHeight})`
      );

      // getSchedule now uses the current `this.settings` which includes dynamic category settings
      this.currentSchedule = this.scheduleEditor.getSchedule(
        this.displayController,
        this.settings, // Pass the instance's current settings
        maxCanvasHeight
      );

      if (this.currentSchedule && this.currentSchedule.intervals.length > 0) {
        this.currentSchedule.prepare();
        this.displayController.setStart();
        this.displayController.setStatus(Status.Pause);
        console.log("Schedule reset and prepared.");
      } else {
        console.warn("Reset resulted in empty or invalid schedule.");
        this.displayController.setTask("Load/Create Schedule", "lightgrey");
        this.displayController.setTime(0);
        this.displayController.setTotalTime(0, 0);
        this.displayController.setUpcoming([], true);
        this.displayController.setStatus(Status.Stop);
        this.displayController.setStart();
        this.displayController.clearFeature();
        this.currentSchedule = null;
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
    this.toggleScheduleAccordion(false);
  }
}

// --- App Initialization (Remains the same) ---
function initializeApp() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new Main());
  } else {
    new Main();
  }
}
initializeApp();

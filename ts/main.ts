// ts/main.ts
import { AudioController } from "./audio_controller";
import { DisplayController, Status } from "./display_controller";
import { ScheduleEditor } from "./schedule/editor/schedule_editor";
// --- Use new registry functions ---
import {
  registerCategory,
  getCategory,
  getAvailableCategories,
  getDefaultGlobalSettingsForCategory, // Import this
} from "./feature_registry";
import { SettingsUISchemaItem, Feature } from "./feature"; // Import Feature if needed by other parts, SettingsUISchemaItem needed
// --- Import the specific Category class ---
import { GuitarCategory } from "./guitar/guitar_category";
// Import settings functions and types
import {
  AppSettings,
  loadSettings,
  CategorySettingsMap, // Keep this type
  SETTINGS_STORAGE_KEY,
  LAST_RUN_SCHEDULE_JSON_KEY,
  RECENT_SCHEDULES_JSON_KEY,
  MAX_RECENT_SCHEDULES,
} from "./settings";
// Other imports
import { ScheduleLoadModal } from "./schedule/schedule_load_modal";
import { Schedule } from "./schedule/schedule";

// --- Constants ---
const DEFAULT_MAX_CANVAS_HEIGHT = 650;
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

    // --- Register Categories ---
    registerCategory(new GuitarCategory());
    // Register other categories here

    // Load settings - uses the now-populated registry for defaults
    this.settings = loadSettings();

    if (!this.ensureElementsExist()) return;

    this.applySettings(); // Apply theme initially

    // Initialize Controllers
    this.audioController = new AudioController(
      document.querySelector("#intro-end-sound") as HTMLAudioElement,
      document.querySelector("#interval-end-sound") as HTMLAudioElement,
      document.querySelector("#metronome-sound") as HTMLAudioElement,
      document.querySelector("#metronome-accent-sound") as HTMLAudioElement
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
      return; // Stop initialization if editor fails
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
    this.addSettingsModalHandlers(); // Attaches the updated handlers
    this.addAccordionHandlers();

    // Load last run schedule (logic remains similar, relies on editor/serializer updates later)
    const lastRunJSON = localStorage.getItem(LAST_RUN_SCHEDULE_JSON_KEY);
    let loadedFromStorage = false;
    if (lastRunJSON) {
      try {
        console.log(
          "Found last run schedule (JSON) in localStorage. Attempting to load..."
        );
        this.scheduleEditor.setScheduleJSON(lastRunJSON, true); // skipSync=true
        loadedFromStorage = true;
        console.log(
          "Last run schedule (JSON) loaded successfully into editor."
        );
        this.reset(); // Trigger reset manually AFTER successful load
      } catch (e: any) {
        console.error("Error loading or setting last run schedule JSON:", e);
        localStorage.removeItem(LAST_RUN_SCHEDULE_JSON_KEY); // Remove invalid data
        this.reset(); // Fallback to default reset
      }
    }

    if (!loadedFromStorage) {
      console.log(
        "No last run schedule JSON found or loading failed. Performing initial reset."
      );
      this.reset();
    }

    console.log("Initialization complete.");
  }

  // Updated: Remove specific guitar setting IDs
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
      "#metronome-accent-sound",
      // Editor & Name
      "#schedule-editor-container",
      "#schedule-accordion",
      "#schedule-name-display",
      "#edit-schedule-name-btn",
      // Settings Modal Core
      "#settings-button",
      "#settings-modal",
      "#settings-save-button",
      "#settings-cancel-button",
      "#settings-modal-close",
      "#theme-select",
      "#warmup-input", // Global settings inputs
      `#${CATEGORY_SETTINGS_CONTAINER_ID}`, // Container for dynamic settings *MUST EXIST*
      // Load/save modal (Optional check)
      "#load-schedule-button",
      "#load-schedule-modal",
    ];
    let allFound = true;
    requiredIds.forEach((id) => {
      const element = document.querySelector(id);
      if (!element) {
        // Adjust warnings/errors based on criticality
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
        } else if (id === `#${CATEGORY_SETTINGS_CONTAINER_ID}`) {
          console.error(
            `CRITICAL ERROR: Category settings container not found: ${id}`
          );
          allFound = false;
        } else {
          console.error(
            `CRITICAL ERROR: Required HTML element not found: ${id}`
          );
          allFound = false;
        }
      }
    });

    if (allFound) {
      // Assign core elements needed by methods that were validated above
      this.settingsModalEl = document.querySelector(
        "#settings-modal"
      ) as HTMLElement;
      this.scheduleAccordionEl = document.querySelector(
        "#schedule-accordion"
      ) as HTMLElement;
      this.scheduleAccordionHeaderEl = this.scheduleAccordionEl.querySelector(
        ".accordion-header"
      ) as HTMLElement;
      this.loadScheduleButtonEl = document.querySelector(
        "#load-schedule-button"
      ) as HTMLElement; // May be null
      // Ensure header was found if accordion was
      if (this.scheduleAccordionEl && !this.scheduleAccordionHeaderEl) {
        console.error(
          "CRITICAL ERROR: Accordion header not found inside accordion element."
        );
        allFound = false;
      }
    }

    if (!allFound) {
      alert(
        "Error: Could not find all necessary page elements. The application might not work correctly."
      );
    }
    return allFound;
  }

  addControlHandlers(): void {
    const startBtn = document.querySelector("#start-control") as HTMLElement;
    const skipBtn = document.querySelector("#skip-control") as HTMLElement;
    const resetBtn = document.querySelector("#reset-control") as HTMLElement;
    this.settingsButtonEl = document.querySelector(
      "#settings-button"
    ) as HTMLElement;
    this.loadScheduleButtonEl = document.querySelector(
      "#load-schedule-button"
    ) as HTMLElement; // May be null

    if (!startBtn || !skipBtn || !resetBtn || !this.settingsButtonEl) {
      console.error("Core control or Settings buttons not found!");
      return;
    }

    this.controlButtonEl = startBtn;
    this.skipButtonEl = skipBtn;
    this.controlButtonEl.onclick = () => this.toggleCountdown();
    this.skipButtonEl.onclick = () => this.skipCurrentTask();
    resetBtn.onclick = () => this.reset();
    this.settingsButtonEl.onclick = () => this.openSettingsModal();

    // Attach handler for load/save button only if modal is available
    if (this.loadScheduleButtonEl && this.scheduleLoadModal) {
      this.loadScheduleButtonEl.onclick = () => {
        if (this.currentSchedule?.isRunning()) {
          alert("Please stop the timer before loading or saving schedules.");
          return;
        }
        this.scheduleLoadModal.show();
      };
    } else if (this.loadScheduleButtonEl) {
      // Disable button if modal didn't init
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
  }

  /** Helper to get merged category settings using string name */
  private getCategorySettings(categoryName: string): any {
    const defaults =
      getDefaultGlobalSettingsForCategory<any>(categoryName) ?? {};
    const stored = this.settings.categorySettings?.[categoryName] ?? {};
    return { ...defaults, ...stored };
  }

  /** Populates and opens the settings modal dynamically */
  private openSettingsModal(): void {
    if (this.currentSchedule?.isRunning()) {
      alert("Please stop the timer before changing settings.");
      return;
    }
    if (!this.settingsModalEl) return;

    // Populate Global Settings (Theme, Warmup)
    (document.getElementById("theme-select") as HTMLSelectElement).value =
      this.settings.theme;
    (document.getElementById("warmup-input") as HTMLInputElement).value =
      String(this.settings.warmupPeriod);

    // Populate Dynamic Category Settings
    const container = this.settingsModalEl.querySelector<HTMLElement>(
      `#${CATEGORY_SETTINGS_CONTAINER_ID}`
    );
    if (!container) {
      console.error("Cannot find category settings container in modal!");
      return;
    }
    container.innerHTML = ""; // Clear previous dynamic content

    const categories = getAvailableCategories();
    console.log(`Found ${categories.length} registered categories.`);

    categories.forEach((categoryInstance) => {
      if (typeof categoryInstance.getGlobalSettingsUISchema === "function") {
        const schemaItems = categoryInstance.getGlobalSettingsUISchema();
        const categoryName = categoryInstance.getName();
        console.log(
          `Processing category: ${categoryName}, Schema items: ${
            schemaItems?.length ?? 0
          }`
        );

        if (schemaItems && schemaItems.length > 0) {
          const currentCategorySettings =
            this.getCategorySettings(categoryName);

          // Create Category Header
          const categoryHeader = document.createElement("h5");
          categoryHeader.textContent = `${categoryInstance.getDisplayName()} Settings`;
          categoryHeader.classList.add(
            "title",
            "is-6",
            "category-settings-header",
            "mt-4"
          );
          container.appendChild(categoryHeader);

          // Create UI elements from schema
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
            control.classList.add("control", "is-expanded");
            let inputElement: HTMLInputElement | HTMLSelectElement | null =
              null;
            const inputId = `setting-${categoryName}-${item.key}`;
            const currentValue = currentCategorySettings?.[item.key];

            if (item.type === "select" && item.options) {
              const selectElement = document.createElement("select");
              selectElement.id = inputId;
              const selectWrapper = document.createElement("div");
              selectWrapper.classList.add("select", "is-fullwidth");
              item.options.forEach((opt) => {
                const option = document.createElement("option");
                option.value = opt.value;
                option.textContent = opt.text;
                if (
                  currentValue !== undefined &&
                  String(currentValue) === opt.value
                ) {
                  // Compare as strings
                  option.selected = true;
                }
                selectElement.appendChild(option);
              });
              selectWrapper.appendChild(selectElement);
              control.appendChild(selectWrapper);
              inputElement = selectElement;
            } else if (item.type === "checkbox") {
              const checkboxElement = document.createElement("input");
              checkboxElement.id = inputId;
              checkboxElement.type = "checkbox";
              checkboxElement.classList.add("checkbox");
              checkboxElement.checked = !!currentValue;
              const checkboxLabel = document.createElement("label");
              checkboxLabel.classList.add("checkbox");
              checkboxLabel.style.paddingTop = "calc(0.5em - 1px)";
              checkboxLabel.appendChild(checkboxElement);
              control.appendChild(checkboxLabel);
              inputElement = checkboxElement;
            } else {
              const textInputElement = document.createElement("input");
              textInputElement.id = inputId;
              textInputElement.type =
                item.type === "number" ? "number" : "text";
              textInputElement.classList.add("input");
              textInputElement.value =
                currentValue !== undefined ? String(currentValue) : "";
              if (item.placeholder)
                textInputElement.placeholder = item.placeholder;
              if (item.min !== undefined)
                textInputElement.min = String(item.min);
              if (item.max !== undefined)
                textInputElement.max = String(item.max);
              if (item.step !== undefined)
                textInputElement.step = String(item.step);
              control.appendChild(textInputElement);
              inputElement = textInputElement;
            }

            if (inputElement) {
              inputElement.dataset.category = categoryName;
              inputElement.dataset.setting = item.key;
              label.htmlFor = inputId;
            } else {
              console.warn(
                `Could not create input element for setting: ${categoryName}.${item.key}`
              );
            }

            fieldInner.appendChild(control);
            fieldBody.appendChild(fieldInner);
            fieldDiv.appendChild(fieldLabel);
            fieldDiv.appendChild(fieldBody);
            container.appendChild(fieldDiv);
          });
        }
      } else {
        console.log(
          `Category ${categoryInstance.getName()} does not provide a global settings UI schema.`
        );
      }
    });
    this.settingsModalEl.classList.add("is-active");
  }

  /** Closes the settings modal */
  private closeSettingsModal(): void {
    if (!this.settingsModalEl) return;
    this.settingsModalEl.classList.remove("is-active");
  }

  /** Attaches handlers for the settings modal buttons */
  private addSettingsModalHandlers(): void {
    const saveBtn = document.getElementById("settings-save-button");
    const cancelBtn = document.getElementById("settings-cancel-button");
    const closeBtn = document.getElementById("settings-modal-close"); // Standard Bulma modal close
    if (!saveBtn || !cancelBtn || !closeBtn || !this.settingsModalEl) return;

    saveBtn.onclick = () => {
      const newSettings: AppSettings = JSON.parse(
        JSON.stringify(this.settings)
      );

      // 1. Update global settings (Theme, Warmup)
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

      // 2. Update Category Settings Dynamically
      const container = this.settingsModalEl.querySelector<HTMLElement>(
        `#${CATEGORY_SETTINGS_CONTAINER_ID}`
      );
      if (container) {
        const settingElements = container.querySelectorAll<
          HTMLInputElement | HTMLSelectElement
        >("input[data-setting], select[data-setting]");
        settingElements.forEach((element) => {
          const categoryName = element.dataset.category;
          const settingKey = element.dataset.setting;
          if (categoryName && settingKey) {
            if (!newSettings.categorySettings[categoryName]) {
              const defaults =
                getDefaultGlobalSettingsForCategory<any>(categoryName) ?? {};
              newSettings.categorySettings[categoryName] = { ...defaults };
            }
            let value: string | number | boolean;
            if (element.type === "checkbox")
              value = (element as HTMLInputElement).checked;
            else if (element.type === "number") {
              const numVal = parseFloat(element.value);
              value = isNaN(numVal) ? 0 : numVal;
              const min = element.getAttribute("min");
              const max = element.getAttribute("max");
              if (min !== null) value = Math.max(parseFloat(min), value);
              if (max !== null) value = Math.min(parseFloat(max), value);
            } else value = element.value;
            newSettings.categorySettings[categoryName][settingKey] = value;
          } else {
            console.warn(
              "Found settings input missing category or setting data attribute:",
              element
            );
          }
        });
      } else {
        console.error(
          "Category settings container not found during save operation!"
        );
      }

      // 3. Save, Apply, Close, Reset
      this.saveSettings(newSettings);
      this.applySettings();
      this.closeSettingsModal(); // Call the method to close
      this.reset();
    };

    // Add handlers to close the modal
    cancelBtn.onclick = () => this.closeSettingsModal();
    closeBtn.onclick = () => this.closeSettingsModal();
    // Also add handler for the background click (standard Bulma pattern)
    this.settingsModalEl
      .querySelector(".modal-background")
      ?.addEventListener("click", () => this.closeSettingsModal());
  }

  // addAccordionHandlers, toggleScheduleAccordion remain the same
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

  // toggleCountdown, skipCurrentTask remain the same conceptually
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
        } catch {}
        if (isValidToSave) {
          localStorage.setItem(LAST_RUN_SCHEDULE_JSON_KEY, scheduleJSON);
          console.log("Saved current schedule as last run schedule (JSON).");
          // Update Recent List (logic remains same)
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
    console.log(
      "Resetting schedule using current editor state and settings..."
    );
    this.currentSchedule?.pause(); // Pause any existing schedule
    this.scheduleEditor?.errorDisplay?.removeMessage(); // Clear previous errors

    try {
      const diagramContainer = document.getElementById("diagram");
      const maxCanvasHeight =
        diagramContainer?.clientHeight && diagramContainer.clientHeight > 50
          ? diagramContainer.clientHeight
          : DEFAULT_MAX_CANVAS_HEIGHT;

      // getSchedule uses the builder which uses the registry
      this.currentSchedule = this.scheduleEditor.getSchedule(
        this.displayController,
        this.settings,
        maxCanvasHeight
      );

      if (this.currentSchedule && this.currentSchedule.intervals.length > 0) {
        this.currentSchedule.prepare();
        this.displayController.setStart();
        this.displayController.setStatus(Status.Pause);
        console.log("Schedule reset and prepared.");
      } else if (!this.scheduleEditor.errorDisplay.hasMessage()) {
        console.warn("Reset resulted in an empty schedule.");
        this.displayController.setTask("Load/Create Schedule", "lightgrey");
        this.displayController.setTime(0);
        this.displayController.setTotalTime(0, 0);
        this.displayController.setUpcoming([], true);
        this.displayController.setStatus(Status.Stop);
        this.displayController.setStart();
        this.displayController.clearFeature();
        this.currentSchedule = null;
      } else {
        console.error("Schedule reset failed due to errors during build.");
        this.displayController.setTask("Error During Build", "red");
        this.displayController.setTime(0);
        this.displayController.setTotalTime(0, 0);
        this.displayController.setUpcoming([], true);
        this.displayController.setStatus(Status.Stop);
        this.displayController.setStart();
        this.displayController.clearFeature();
        this.currentSchedule = null;
      }
    } catch (error) {
      console.error("Unexpected error during reset:", error);
      this.scheduleEditor?.errorDisplay?.showMessage(
        `Unexpected reset error: ${error}`
      );
      this.displayController.setTask("Unexpected Error", "red");
      this.displayController.setTime(0);
      this.displayController.setTotalTime(0, 0);
      this.displayController.setUpcoming([], true);
      this.displayController.setStatus(Status.Stop);
      this.displayController.setStart();
      this.displayController.clearFeature();
      this.currentSchedule = null;
    }
    // Collapse accordion when paused/reset
    this.toggleScheduleAccordion(false);
  }
}

// --- App Initialization --- (Remains the same)
function initializeApp() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new Main());
  } else {
    new Main();
  }
}
initializeApp();
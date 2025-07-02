// ts/main.ts
import { AudioController } from "./audio_controller";
import { DisplayController, Status } from "./display_controller";
import { ScheduleEditor } from "./schedule/editor/schedule_editor";
// --- Use new registry functions ---
import {
  registerCategory,
  getCategory,
  getAvailableCategories,
  getDefaultGlobalSettingsForCategory,
} from "./feature_registry";
import { SettingsUISchemaItem, Feature } from "./feature"; 
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

import { FloatingViewManager } from './floating_views/floating_view_manager';
import { getAvailableFloatingViews } from './floating_views/floating_view_registry';

// --- Constants ---
const DEFAULT_MAX_CANVAS_HEIGHT = 650;
const CATEGORY_SETTINGS_CONTAINER_ID = "category-settings-container";

export class Main {
  currentSchedule: Schedule | null = null;
  displayController!: DisplayController;
  audioController!: AudioController;
  scheduleEditor!: ScheduleEditor;
  scheduleLoadModal!: ScheduleLoadModal;
  floatingViewManager!: FloatingViewManager; // Add manager property

  // UI Elements
  controlButtonEl!: HTMLElement;
  skipButtonEl!: HTMLElement;
  settingsButtonEl!: HTMLElement;
  floatingViewButtonEl!: HTMLElement; // Add button property
  floatingViewDropdownContainerEl!: HTMLElement; // Dropdown container
  floatingViewDropdownContentEl!: HTMLElement; // Dropdown content area
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

    // --- Instantiate Floating View Manager ---
    this.floatingViewManager = new FloatingViewManager(this.settings);
    // --- End Instantiate ---


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
    this.addFloatingViewDropdownHandlers(); // Add handlers for the new dropdown


    // --- Restore Floating Views AFTER manager is initialized ---
    this.floatingViewManager.restoreViewsFromState();
    // --- End Restore ---


    // Load last run schedule (logic remains similar, relies on editor/serializer updates later)
    let loadedFromStorage = false; // Declare here
    const lastRunJSON = localStorage.getItem(LAST_RUN_SCHEDULE_JSON_KEY);
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

     // Populate dropdown initially (optional, it populates on open anyway)
    // this.populateFloatingViewDropdown();


    console.log("Initialization complete.");
  }

  // Updated: Remove specific guitar setting IDs
  private ensureElementsExist(): boolean {
    const requiredIds = [
      // Core UI
      "#timer", "#total-timer", "#task-wrapper", "#task", "#diagram",
      "#status", "#upcoming", "#start-control", "#skip-control", "#reset-control",
      // Audio
      "#intro-end-sound", "#interval-end-sound", "#metronome-sound", "#metronome-accent-sound",
      // Editor & Name
      "#schedule-editor-container", "#schedule-accordion",
      "#schedule-name-display", "#edit-schedule-name-btn",
      // Settings Modal Core
      "#settings-button", "#settings-modal", "#settings-save-button",
      "#settings-cancel-button", "#settings-modal-close",
      "#theme-select", "#warmup-input", // Global settings inputs
      `#${CATEGORY_SETTINGS_CONTAINER_ID}`, // Container for dynamic settings *MUST EXIST*
      // Load/save modal (Optional check)
      "#load-schedule-button", "#load-schedule-modal",
      // Floating Views (Add new elements)
      '#floating-view-button',
      '#floating-view-area',
      '#floating-view-dropdown-container', // New dropdown container
      '#floating-view-dropdown-content',  // New dropdown content area
    ];
    let allFound = true;
    requiredIds.forEach((id) => {
      const element = document.querySelector(id);
      if (!element) {
        // Adjust warnings/errors based on criticality
        if (id === "#load-schedule-modal" || id === "#load-schedule-button") {
          console.warn(`Optional HTML element not found: ${id}. Load/Save functionality might be unavailable.`);
        } else if (id === "#schedule-name-display" || id === "#edit-schedule-name-btn") {
          console.warn(`Optional HTML element not found: ${id}. Schedule naming UI disabled.`);
        } else if (id === `#${CATEGORY_SETTINGS_CONTAINER_ID}`) {
          console.error(`CRITICAL ERROR: Category settings container not found: ${id}`);
          allFound = false;
        } else if (id === '#floating-view-button' || id === '#floating-view-area' || id === '#floating-view-dropdown-container' || id === '#floating-view-dropdown-content') {
           console.warn(`Optional HTML element not found: ${id}. Floating view functionality might be unavailable.`);
           // Don't set allFound to false for optional elements unless critical
        } else {
          console.error(`CRITICAL ERROR: Required HTML element not found: ${id}`);
          allFound = false;
        }
      }
    });

    if (allFound) {
      // Assign core elements needed by methods that were validated above
      this.settingsModalEl = document.querySelector("#settings-modal") as HTMLElement;
      this.scheduleAccordionEl = document.querySelector("#schedule-accordion") as HTMLElement;
      this.scheduleAccordionHeaderEl = this.scheduleAccordionEl.querySelector(".accordion-header") as HTMLElement;
      this.loadScheduleButtonEl = document.querySelector("#load-schedule-button") as HTMLElement; // May be null
      this.floatingViewButtonEl = document.querySelector('#floating-view-button') as HTMLElement; // Assign new button
      this.floatingViewDropdownContainerEl = document.querySelector('#floating-view-dropdown-container') as HTMLElement;
      this.floatingViewDropdownContentEl = document.querySelector('#floating-view-dropdown-content') as HTMLElement;

      // Ensure header was found if accordion was
      if (this.scheduleAccordionEl && !this.scheduleAccordionHeaderEl) {
        console.error("CRITICAL ERROR: Accordion header not found inside accordion element.");
        allFound = false;
      }
    }

    if (!allFound && !document.querySelector(`#${CATEGORY_SETTINGS_CONTAINER_ID}`)) {
       alert("Error: Critical page element missing (Category Settings Container). Application cannot function correctly.");
    } else if (!allFound && document.querySelector('#floating-view-button')) { // Check if it was just the floating view elements missing
        console.warn("Some non-critical page elements were not found. Application might not work correctly.");
    } else if (!allFound) {
       alert("Error: Some required page elements could not be found. The application might not work correctly.");
    }
    return allFound;
  }

  addControlHandlers(): void {
    const startBtn = document.querySelector("#start-control") as HTMLElement;
    const skipBtn = document.querySelector("#skip-control") as HTMLElement;
    const resetBtn = document.querySelector("#reset-control") as HTMLElement;
    this.settingsButtonEl = document.querySelector("#settings-button") as HTMLElement;
    this.loadScheduleButtonEl = document.querySelector("#load-schedule-button") as HTMLElement; // May be null

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
      this.loadScheduleButtonEl.setAttribute("disabled", "true");
      this.loadScheduleButtonEl.setAttribute("title", "Load modal failed to initialize.");
    }

    // Note: Floating View button handler is moved to addFloatingViewDropdownHandlers
  }

   // --- Method for Dropdown Handling (Updated) ---
   private addFloatingViewDropdownHandlers(): void {
       if (!this.floatingViewButtonEl || !this.floatingViewDropdownContainerEl) {
           console.warn("Floating view button or dropdown container not found, handler not attached.");
           return;
       }

       // Toggle dropdown visibility
       this.floatingViewButtonEl.onclick = (event) => {
           event.stopPropagation(); // Prevent body click handler from closing immediately
           const isActive = this.floatingViewDropdownContainerEl.classList.toggle('is-active');
           if (isActive) {
               this.populateFloatingViewDropdown(); // Refresh content when opening
               // Add listener to close dropdown when clicking outside
               document.addEventListener('click', this.handleClickOutsideDropdown, true);
           } else {
                document.removeEventListener('click', this.handleClickOutsideDropdown, true);
           }
       };

       // Remove the 'floating-view-destroyed' listener as it's no longer needed for checkbox sync
       // document.removeEventListener('floating-view-destroyed', this.handleFloatingViewDestroyed);
   }

    // Removed handleFloatingViewDestroyed method

    // Bound function to remove listener correctly
    private handleClickOutsideDropdown = (event: MouseEvent): void => {
        if (this.floatingViewDropdownContainerEl && !this.floatingViewDropdownContainerEl.contains(event.target as Node)) {
            this.floatingViewDropdownContainerEl.classList.remove('is-active');
            document.removeEventListener('click', this.handleClickOutsideDropdown, true);
        }
    }

   // --- Updated to create buttons instead of checkboxes ---
   private populateFloatingViewDropdown(): void {
        if (!this.floatingViewDropdownContentEl) return;

        this.floatingViewDropdownContentEl.innerHTML = ''; // Clear previous items
        const availableViews = getAvailableFloatingViews();

        if (availableViews.length === 0) {
            const noViewsItem = document.createElement('p');
            noViewsItem.classList.add('dropdown-item', 'is-size-7', 'has-text-grey');
            noViewsItem.textContent = 'No views available';
            this.floatingViewDropdownContentEl.appendChild(noViewsItem);
            return;
        }

        availableViews.forEach(desc => {
            const viewId = desc.viewId;
            const displayName = desc.displayName;
            const categoryName = desc.categoryName;

            // Create a clickable link/button for each view
            const dropdownItem = document.createElement('a');
            dropdownItem.classList.add('dropdown-item');
            dropdownItem.href = "#"; // Make it behave like a link

            // Combine display name and category
            const itemText = document.createElement('span');
            itemText.textContent = displayName;

            const categorySpan = document.createElement('span');
            categorySpan.textContent = ` (${categoryName})`;
            categorySpan.classList.add('is-size-7', 'has-text-grey', 'ml-1');

            dropdownItem.appendChild(itemText);
            dropdownItem.appendChild(categorySpan);


            // Attach onclick to spawn the view
            dropdownItem.onclick = (e) => {
                e.preventDefault(); // Prevent default link behavior
                console.log(`Spawning view: ${viewId}`);
                this.floatingViewManager.spawnView(viewId);
                // Optionally close the dropdown after spawning
                 this.floatingViewDropdownContainerEl.classList.remove('is-active');
                 document.removeEventListener('click', this.handleClickOutsideDropdown, true);
            };

            this.floatingViewDropdownContentEl.appendChild(dropdownItem);
        });
   }
    // --- END Changes ---


   /** Saves the complete AppSettings object to localStorage */
   private saveSettings(newSettings: AppSettings): void {
      try {
        // Update the manager's reference BEFORE saving
        if (this.floatingViewManager) {
            this.floatingViewManager.appSettings = newSettings; // Update public member
            console.log("[saveSettings] Updated FloatingViewManager settings reference.");
        }

        console.log("[saveSettings] Attempting to save:", JSON.stringify(newSettings));
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
        this.settings = newSettings; // Update the Main instance's settings
        console.log("[saveSettings] Settings object updated in Main instance.");

        // --- Settings Change Notification for Floating Views ---
        if (this.floatingViewManager) {
             const activeViews = this.floatingViewManager['activeViews'] as Map<string, any>; // Access private map
             activeViews.forEach(wrapper => {
                 const viewInstance = wrapper['viewInstance'];
                 // Check if the view instance has an onSettingsChange method
                 if (viewInstance && typeof (viewInstance as any).onSettingsChange === 'function') {
                     try {
                         console.log(`Notifying view instance ${wrapper['state']?.instanceId} of settings change.`);
                         (viewInstance as any).onSettingsChange(newSettings);
                     } catch (e) {
                         console.error("Error calling onSettingsChange for view:", wrapper['state']?.viewId, e);
                     }
                 }
                 // Re-render the legend view specifically if it exists, as it depends directly on settings
                  else if (wrapper['state']?.viewId === 'guitar_color_legend') {
                      const contentElement = wrapper['contentElement'];
                      if(contentElement && viewInstance && typeof viewInstance.render === 'function') {
                           console.log("Re-rendering color legend due to settings change.");
                           viewInstance.render(contentElement); // Call render directly
                      }
                 }
             });
        }
        // --- End Notification ---


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
    const defaults = getDefaultGlobalSettingsForCategory<any>(categoryName) ?? {};
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
    (document.getElementById("theme-select") as HTMLSelectElement).value = this.settings.theme;
    (document.getElementById("warmup-input") as HTMLInputElement).value = String(this.settings.warmupPeriod);

    // Populate Dynamic Category Settings
    const container = this.settingsModalEl.querySelector<HTMLElement>(`#${CATEGORY_SETTINGS_CONTAINER_ID}`);
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
        console.log(`Processing category: ${categoryName}, Schema items: ${schemaItems?.length ?? 0}`);

        if (schemaItems && schemaItems.length > 0) {
          const currentCategorySettings = this.getCategorySettings(categoryName);

          // Create Category Header
          const categoryHeader = document.createElement("h5");
          categoryHeader.textContent = `${categoryInstance.getDisplayName()} Settings`;
          categoryHeader.classList.add("title", "is-6", "category-settings-header", "mt-4");
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
            let inputElement: HTMLInputElement | HTMLSelectElement | null = null;
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
                if (currentValue !== undefined && String(currentValue) === opt.value) {
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
              textInputElement.type = item.type === "number" ? "number" : "text";
              textInputElement.classList.add("input");
              textInputElement.value = currentValue !== undefined ? String(currentValue) : "";
              if (item.placeholder) textInputElement.placeholder = item.placeholder;
              if (item.min !== undefined) textInputElement.min = String(item.min);
              if (item.max !== undefined) textInputElement.max = String(item.max);
              if (item.step !== undefined) textInputElement.step = String(item.step);
              control.appendChild(textInputElement);
              inputElement = textInputElement;
            }

            if (inputElement) {
              inputElement.dataset.category = categoryName;
              inputElement.dataset.setting = item.key;
              label.htmlFor = inputId;
            } else {
              console.warn(`Could not create input element for setting: ${categoryName}.${item.key}`);
            }

            fieldInner.appendChild(control);
            fieldBody.appendChild(fieldInner);
            fieldDiv.appendChild(fieldLabel);
            fieldDiv.appendChild(fieldBody);
            container.appendChild(fieldDiv);
          });
        }
      } else {
        console.log(`Category ${categoryInstance.getName()} does not provide a global settings UI schema.`);
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
      const newSettings: AppSettings = JSON.parse(JSON.stringify(this.settings));

      // 1. Update global settings (Theme, Warmup)
      newSettings.theme = (document.getElementById("theme-select") as HTMLSelectElement).value as "light" | "dark";
      newSettings.warmupPeriod = Math.max(0, parseInt((document.getElementById("warmup-input") as HTMLInputElement).value, 10) || 0);

      // 2. Update Category Settings Dynamically
      const container = this.settingsModalEl.querySelector<HTMLElement>(`#${CATEGORY_SETTINGS_CONTAINER_ID}`);
      if (container) {
        const settingElements = container.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input[data-setting], select[data-setting]");
        settingElements.forEach((element) => {
          const categoryName = element.dataset.category;
          const settingKey = element.dataset.setting;
          if (categoryName && settingKey) {
            if (!newSettings.categorySettings[categoryName]) {
              const defaults = getDefaultGlobalSettingsForCategory<any>(categoryName) ?? {};
              newSettings.categorySettings[categoryName] = { ...defaults };
            }
            let value: string | number | boolean;
            if (element.type === "checkbox") value = (element as HTMLInputElement).checked;
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
            console.warn("Found settings input missing category or setting data attribute:", element);
          }
        });
      } else {
        console.error("Category settings container not found during save operation!");
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
    this.settingsModalEl.querySelector(".modal-background")?.addEventListener("click", () => this.closeSettingsModal());
  }

  // addAccordionHandlers, toggleScheduleAccordion remain the same
  private addAccordionHandlers(): void {
    if (!this.scheduleAccordionHeaderEl) return;
    this.scheduleAccordionHeaderEl.onclick = () => {
      const isCollapsed = this.scheduleAccordionEl.classList.contains("collapsed");
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
          isValidToSave = parsed && Array.isArray(parsed.items) && parsed.items.length > 0;
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
              if (Array.isArray(p) && p.every((s) => typeof s === "string")) recentSchedules = p;
            } catch (e) { console.error(e); }
          }
          recentSchedules = recentSchedules.filter((item) => item !== scheduleJSON);
          recentSchedules.unshift(scheduleJSON);
          if (recentSchedules.length > MAX_RECENT_SCHEDULES) recentSchedules.length = MAX_RECENT_SCHEDULES;
          localStorage.setItem(RECENT_SCHEDULES_JSON_KEY, JSON.stringify(recentSchedules));
          if (this.scheduleLoadModal?.isOpen()) this.scheduleLoadModal.refreshRecentList();
        } else {
          console.log("Skipping save for empty or invalid schedule JSON.");
        }
      } catch (storageError) {
        console.error("Error saving schedule JSON to localStorage:", storageError);
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
    if (this.settingsModalEl?.classList.contains("is-active") || this.scheduleLoadModal?.isOpen()) {
      alert("Please close any open modals before skipping.");
      return;
    }
    this.currentSchedule.skip();
    this.toggleScheduleAccordion(this.currentSchedule.isRunning());
  }

  /** Resets the schedule using the editor and current settings */
  reset(): void {
    console.log("Resetting schedule using current editor state and settings...");
    this.currentSchedule?.pause(); // Pause any existing schedule
    this.scheduleEditor?.errorDisplay?.removeMessage(); // Clear previous errors

    try {
      const diagramContainer = document.getElementById("diagram");
      const maxCanvasHeight = diagramContainer?.clientHeight && diagramContainer.clientHeight > 50
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
      this.scheduleEditor?.errorDisplay?.showMessage(`Unexpected reset error: ${error}`);
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
import { FeatureCategoryName, ConfigurationSchemaArg } from "../../feature";
import {
  getAvailableFeatureTypes,
  getFeatureTypeDescriptor,
} from "../../feature_registry";
import { GuitarIntervalSettings, GuitarIntervalSettingsJSON } from "../../guitar/guitar_interval_settings";


// --- Data Structures (used internally and by parser/builder) ---

/** Data structure representing the state of a single interval row (Input/Output for UI build) */
export interface IntervalRowData {
  rowType: "interval";
  duration: string;
  task: string;
  featureTypeName: string;
  featureArgsList: string[]; // Args list received from parser/used for initial population
  intervalSettings: GuitarIntervalSettings; // Now expects an INSTANCE
}

/** Data structure representing a group header row (Input/Output for UI build) */
export interface GroupRowData {
  rowType: "group";
  level: number;
  name: string;
}

export type ScheduleRowData = IntervalRowData | GroupRowData;

export interface GroupDataJSON {
  rowType: "group";
  level: number;
  name: string;
}

export interface IntervalDataJSON {
  rowType: "interval";
  duration: string;
  task: string;
  featureTypeName: string;
  featureArgsList: string[];
  intervalSettings?: GuitarIntervalSettingsJSON; // Uses imported JSON type
}

export type ScheduleRowJSONData = GroupDataJSON | IntervalDataJSON;

// --- UI Building Functions ---

/**
 * Builds and returns the HTMLElement for a single interval configuration row.
 * Expects initialData.intervalSettings to be an instance of GuitarIntervalSettings.
 */
export function buildIntervalRowElement(
  initialData: IntervalRowData
): HTMLElement {
  const entryDiv = document.createElement("div");
  entryDiv.classList.add("config-entry-row", "schedule-row");
  entryDiv.dataset.rowType = "interval";
  entryDiv.draggable = false; // Draggable is false on the row now

  // *** Store the GuitarIntervalSettings INSTANCE directly ***
  // Assumes parseScheduleJSON provides a valid instance
  (entryDiv as any)._intervalSettings =
    initialData.intervalSettings instanceof GuitarIntervalSettings
      ? initialData.intervalSettings
      : new GuitarIntervalSettings(); // Fallback just in case

  // Style row
  entryDiv.style.display = "flex";
  entryDiv.style.alignItems = "center";
  entryDiv.style.gap = "5px";
  entryDiv.style.padding = "2px 0";
  entryDiv.style.position = "relative";

  // Create handle (draggable=true is set inside this function)
  const handleDiv = createDragHandleCell();
  entryDiv.appendChild(handleDiv);

  // Content wrapper (grid layout)
  const contentWrapper = document.createElement("div");
  contentWrapper.style.display = "grid";
  contentWrapper.style.flexGrow = "1";
  contentWrapper.style.gridTemplateColumns = "80px 1fr 1fr minmax(150px, 2fr)";
  contentWrapper.style.gap = "5px";
  contentWrapper.style.alignItems = "center";

  // Create cells with inputs
  const durationDiv = createCellWithInput(
    "text",
    initialData.duration,
    "Time",
    ["config-duration"]
  );
  const taskDiv = createCellWithInput("text", initialData.task, "Task Name", [
    "config-task",
  ]);
  const featureTypeDiv = createFeatureTypeDropdownCell(
    initialData.featureTypeName
  );
  const featureArgsDiv = createCell(
    "feature-args-cell",
    "config-feature-args-container"
  ); // Container for args UI

  contentWrapper.appendChild(durationDiv);
  contentWrapper.appendChild(taskDiv);
  contentWrapper.appendChild(featureTypeDiv);
  contentWrapper.appendChild(featureArgsDiv);
  entryDiv.appendChild(contentWrapper);

  // Actions cell (copy, remove)
  const actionsDiv = document.createElement("div");
  actionsDiv.classList.add("config-cell", "action-cell");
  actionsDiv.style.display = "flex";
  actionsDiv.style.alignItems = "center";
  actionsDiv.style.gap = "3px";

  const copyButton = createCopyButtonCell();
  actionsDiv.appendChild(copyButton);
  const removeButton = createRemoveButtonElement(entryDiv);
  actionsDiv.appendChild(removeButton);
  entryDiv.appendChild(actionsDiv);

  // --- Event Listener & Initial Population ---
  const featureTypeSelect = featureTypeDiv.querySelector(
    "select"
  ) as HTMLSelectElement;
  featureTypeSelect.addEventListener("change", () => {
    // Pass the settings INSTANCE when args section updates
    updateArgsSection(
      featureTypeSelect,
      featureArgsDiv,
      (entryDiv as any)._intervalSettings
    );
  });

  // Initial Population: Pass the settings INSTANCE and initial args list
  updateArgsSection(
    featureTypeSelect,
    featureArgsDiv,
    (entryDiv as any)._intervalSettings, // Pass instance
    initialData.featureArgsList // Pass args list from parsed data
  );

  applyIndentation(entryDiv, 0); // Apply initial indentation
  return entryDiv;
}

/**
 * Builds and returns the HTMLElement for a group header row.
 */
export function buildGroupRowElement(initialData: GroupRowData): HTMLElement {
  const groupDiv = document.createElement("div");
  groupDiv.classList.add("group-row", "schedule-row");
  groupDiv.dataset.rowType = "group";
  groupDiv.dataset.level = String(initialData.level);
  groupDiv.draggable = false; // Draggable is false on the row now

  groupDiv.style.display = "flex";
  groupDiv.style.alignItems = "center";
  groupDiv.style.padding = "5px 8px";
  groupDiv.style.backgroundColor = "var(--clr-tertiary-light)";
  groupDiv.style.marginBottom = "2px";
  groupDiv.style.border = "1px solid var(--clr-border-light)";
  groupDiv.style.borderRadius = "4px";
  groupDiv.style.gap = "5px";

  // Create handle (draggable=true is set inside this function)
  const handleDiv = createDragHandleCell();
  groupDiv.appendChild(handleDiv);

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = initialData.name;
  nameInput.placeholder = `Group Name (Level ${initialData.level})`;
  nameInput.classList.add("input", "is-small", "group-name-input");
  nameInput.style.flexGrow = "1";
  nameInput.style.border = "none";
  nameInput.style.boxShadow = "none";
  nameInput.style.backgroundColor = "transparent";
  nameInput.style.fontWeight = "bold";
  groupDiv.appendChild(nameInput);

  const actionsDiv = document.createElement("div");
  actionsDiv.classList.add("config-cell", "action-cell");
  actionsDiv.style.display = "flex";
  actionsDiv.style.alignItems = "center";
  actionsDiv.style.gap = "3px";

  const copyButton = createCopyButtonCell();
  actionsDiv.appendChild(copyButton);
  const removeButton = createRemoveButtonElement(groupDiv);
  removeButton.title = "Remove Group";
  actionsDiv.appendChild(removeButton);

  groupDiv.appendChild(actionsDiv);

  applyIndentation(groupDiv, initialData.level);
  return groupDiv;
}

/** Updates the content of the feature arguments container based on selected feature */
function updateArgsSection(
  featureTypeSelect: HTMLSelectElement,
  argsContainer: HTMLElement,
  currentSettingsInstance: GuitarIntervalSettings, // Expects an INSTANCE
  initialArgs?: string[] // Initial args from parser or copy/paste
): void {
  const selectedTypeName = featureTypeSelect.value;
  argsContainer.innerHTML = "";

  if (selectedTypeName) {
    // Assuming Guitar category for now
    const descriptor = getFeatureTypeDescriptor(
      FeatureCategoryName.Guitar,
      selectedTypeName
    );
    if (descriptor) {
      const schema = descriptor.getConfigurationSchema();
      if (
        typeof schema === "object" &&
        "args" in schema &&
        Array.isArray(schema.args)
      ) {
        // Pass settings INSTANCE and initial args list to populate function
        populateArgsFromSchema(
          argsContainer,
          schema.args,
          initialArgs || [],
          currentSettingsInstance
        );
      } else if (typeof schema === "string") {
        const infoSpan = document.createElement("span");
        infoSpan.classList.add("has-text-grey-light", "is-italic");
        infoSpan.textContent = schema;
        argsContainer.appendChild(infoSpan);
      } else {
        const infoSpan = document.createElement("span");
        infoSpan.classList.add("has-text-grey-light", "is-italic");
        infoSpan.textContent = "No configurable arguments";
        argsContainer.appendChild(infoSpan);
      }
    } else {
      argsContainer.textContent = `Error: Feature descriptor for "${selectedTypeName}" not found.`;
    }
  } else {
    argsContainer.innerHTML =
      '<span class="has-text-grey-light is-italic">No feature selected</span>';
  }
}

/** Populates the arguments container based on a schema object. */
function populateArgsFromSchema(
  container: HTMLElement,
  schemaArgs: ConfigurationSchemaArg[],
  currentValues: string[], // Args from parser/data. For Prog: [RootNote, "I-V-vi"]
  currentSettingsInstance: GuitarIntervalSettings // The actual settings INSTANCE
): void {
  let valueIndex = 0;
  container.innerHTML = "";

  const argsInnerContainer = document.createElement("div");
  argsInnerContainer.classList.add("feature-args-inner-container");
  argsInnerContainer.style.display = "flex";
  argsInnerContainer.style.flexWrap = "wrap";
  argsInnerContainer.style.gap = "10px";

  schemaArgs.forEach((arg) => {
    const argWrapper = document.createElement("div");
    argWrapper.classList.add("feature-arg-wrapper");
    argWrapper.dataset.argName = arg.name;

    const label = document.createElement("label");
    label.classList.add("label", "is-small");
    const labelText = arg.name.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();
    label.textContent = labelText;
    label.title = (arg.description || "") + (arg.required ? " (Required)" : "");
    argWrapper.appendChild(label);

    const inputsContainer = document.createElement("div");
    inputsContainer.classList.add("feature-arg-inputs-container");
    inputsContainer.dataset.argType = arg.type;
    if (arg.uiComponentType) inputsContainer.dataset.uiComponentType = arg.uiComponentType;
    if (arg.isVariadic) inputsContainer.dataset.isVariadic = 'true';
    argWrapper.appendChild(inputsContainer);

    // --- Determine which UI component to create ---
    // *** FIX: Check uiComponentType *before* isVariadic ***
    const uiType = arg.uiComponentType; // Prioritize specific UI component request

    let valueConsumed = false; // Flag to prevent double consumption

    // --- Handle Custom UI Types First ---
    if (uiType === 'toggle_button_selector') {
         let initialSelection: string[] = [];
         if (arg.isVariadic && valueIndex < currentValues.length) {
             // If marked variadic, assume remaining values are for sequence/selection
             const remainingValues = currentValues.slice(valueIndex);
             if (remainingValues.length === 1 && remainingValues[0].includes('-')) {
                 initialSelection = remainingValues[0].split('-').filter(s => s); // From parser
             } else {
                 initialSelection = remainingValues; // From direct creation
             }
             valueIndex = currentValues.length; // Consume remaining
         } else if (valueIndex < currentValues.length) {
              // Not variadic, assume single string value (parser)
              initialSelection = currentValues[valueIndex].split('-').filter(s => s);
              valueIndex++; // Consume one value
         }
        createToggleButtonInput(inputsContainer, arg, initialSelection);
        valueConsumed = true;
    }
    else if (uiType === 'ellipsis') {
         if (arg.nestedSchema) {
            inputsContainer.appendChild(createEllipsisDropdown(arg, currentSettingsInstance));
         }
        valueConsumed = true; // Doesn't consume value, but handles the arg
    }
    // --- Handle Standard Types (if no custom UI matched and not already handled) ---
    else if (!valueConsumed) {
        if (arg.isVariadic) {
            // Handle standard variadic (text, number, enum)
             const variadicValues = currentValues.slice(valueIndex);
             createVariadicInputElement(arg, inputsContainer, variadicValues);
             valueIndex = currentValues.length;
        } else {
            // Handle standard non-variadic types
             const currentValue = valueIndex < currentValues.length ? currentValues[valueIndex] : "";
            switch(arg.type) { // Use base type if no specific uiType
                case 'enum':
                    inputsContainer.appendChild(createDropdownInput(arg.name, arg.enum || [], currentValue));
                    break;
                case 'number':
                    inputsContainer.appendChild(createNumberInput(arg.name, currentValue));
                    break;
                case 'boolean':
                    inputsContainer.appendChild(createDropdownInput(arg.name, ["true", "false"], currentValue || "false"));
                    break;
                case 'string':
                default:
                     inputsContainer.appendChild(createTextInput(arg.name, currentValue, arg.example));
                    break;
            }
             valueIndex++; // Increment for non-variadic standard types
        }
    }

    argsInnerContainer.appendChild(argWrapper);
  });
  container.appendChild(argsInnerContainer);
}

// --- UI Component Creation Functions ---

/** Creates the toggle button UI */
function createToggleButtonInput(
  container: HTMLElement,
  arg: ConfigurationSchemaArg,
  initialSelection: string[] // Array of initially selected values
): void {
  container.style.display = "flex";
  container.style.flexWrap = "wrap";
  container.style.gap = "5px";
  container.style.width = "100%";
  const selectionSet = new Set(initialSelection);
  const buttonLabels = arg.uiComponentData?.buttonLabels || [];

  if (buttonLabels.length === 0) {
    /* ... handle error ... */ return;
  }

  buttonLabels.forEach((label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add(
      "button",
      "is-small",
      "is-outlined",
      "numeral-toggle-btn"
    ); // Use this class
    button.textContent = label;
    button.dataset.value = label;
    button.title = `Toggle ${label}`;
    if (selectionSet.has(label)) {
      button.classList.add("is-active", "is-info");
    }
    button.onclick = () => {
      button.classList.toggle("is-active");
      button.classList.toggle("is-info");
    };
    container.appendChild(button);
  });
}

/** Creates the ellipsis dropdown UI */
function createEllipsisDropdown(
  arg: ConfigurationSchemaArg,
  currentSettingsInstance: GuitarIntervalSettings // Expects INSTANCE
): HTMLElement {
  // ... (Implementation remains the same, but ensure it uses currentSettingsInstance) ...
  if (!arg.nestedSchema) {
    /* ... handle no schema ... */ const p = document.createElement("span");
    return p;
  }
  const dropdownDiv = document.createElement("div");
  dropdownDiv.classList.add("dropdown", "config-ellipsis-dropdown");
  const triggerDiv = document.createElement("div");
  triggerDiv.classList.add("dropdown-trigger");
  const button = document.createElement("button");
  button.classList.add(
    "button",
    "is-small",
    "is-outlined",
    "config-ellipsis-button"
  );
  button.setAttribute("aria-haspopup", "true");
  const uniqueId = `dropdown-menu-${arg.name.replace(
    /\s+/g,
    "-"
  )}-${Math.random().toString(36).substring(2, 7)}`;
  button.setAttribute("aria-controls", uniqueId);
  button.innerHTML = "<span>...</span>";
  button.title = arg.description || "Advanced Settings";
  triggerDiv.appendChild(button);
  dropdownDiv.appendChild(triggerDiv);
  const menuDiv = document.createElement("div");
  menuDiv.classList.add("dropdown-menu");
  menuDiv.id = uniqueId;
  menuDiv.setAttribute("role", "menu");
  dropdownDiv.appendChild(menuDiv);
  const contentDiv = document.createElement("div");
  contentDiv.classList.add("dropdown-content");
  contentDiv.style.padding = "10px";
  contentDiv.style.minWidth = "200px";
  menuDiv.appendChild(contentDiv);
  const toggleDropdown = (event?: MouseEvent) => {
    event?.stopPropagation();
    const isActive = dropdownDiv.classList.toggle("is-active");
    if (isActive) {
      populateEllipsisDropdownContent(
        contentDiv,
        arg.nestedSchema!,
        currentSettingsInstance
      );
      document.addEventListener("click", handleClickOutside, true);
    } else {
      document.removeEventListener("click", handleClickOutside, true);
    }
  };
  const handleClickOutside = (event: MouseEvent) => {
    if (!dropdownDiv.contains(event.target as Node)) {
      dropdownDiv.classList.remove("is-active");
      document.removeEventListener("click", handleClickOutside, true);
    }
  };
  button.addEventListener("click", toggleDropdown);
  return dropdownDiv;
}

/** Populates the ellipsis dropdown content with form elements. */
function populateEllipsisDropdownContent(
  contentContainer: HTMLElement,
  nestedSchema: ConfigurationSchemaArg[],
  settingsInstance: GuitarIntervalSettings // Expects INSTANCE
): void {
  contentContainer.innerHTML = "";
  nestedSchema.forEach((nestedArg) => {
    const fieldDiv = document.createElement("div");
    fieldDiv.classList.add("field");
    const label = document.createElement("label");
    label.classList.add("label", "is-small");
    label.textContent = nestedArg.name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
    label.title = nestedArg.description || "";
    fieldDiv.appendChild(label);
    const controlDiv = document.createElement("div");
    controlDiv.classList.add("control");
    // Use the INSTANCE to get current value
    const currentValue = (settingsInstance as any)[nestedArg.name];
    const currentValueStr =
      currentValue !== undefined && currentValue !== null
        ? String(currentValue)
        : "";
    let inputElement: HTMLElement | null = null;
    if (nestedArg.enum) {
      inputElement = createDropdownInput(
        nestedArg.name,
        nestedArg.enum,
        currentValueStr
      );
    } else if (nestedArg.type === "number") {
      inputElement = createNumberInput(
        nestedArg.name,
        currentValueStr,
        nestedArg.description
      );
    } else if (nestedArg.type === "boolean") {
      inputElement = createDropdownInput(
        nestedArg.name,
        ["true", "false"],
        currentValueStr || "false"
      );
    } else {
      inputElement = createTextInput(
        nestedArg.name,
        currentValueStr,
        nestedArg.description
      );
    }
    if (inputElement) {
      const inputField =
        inputElement.tagName === "DIV"
          ? inputElement.querySelector("select, input")
          : inputElement;
      if (inputField) {
        inputField.addEventListener("change", (e) => {
          const target = e.target as HTMLInputElement | HTMLSelectElement;
          let newValue: string | number | boolean = target.value;
          if (nestedArg.type === "number") {
            newValue = parseInt(target.value, 10);
            if (isNaN(newValue)) newValue = 0;
          } else if (nestedArg.type === "boolean") {
            newValue = target.value === "true";
          }
          // Update the INSTANCE directly
          (settingsInstance as any)[nestedArg.name] = newValue;
          console.log(
            `Updated setting '${nestedArg.name}' to:`,
            newValue,
            settingsInstance
          );
        });
      }
      controlDiv.appendChild(inputElement);
    }
    fieldDiv.appendChild(controlDiv);
    contentContainer.appendChild(fieldDiv);
  });
}

// --- Helper Functions (ensure implementations are present) ---
function createTextInput(
  name: string,
  value?: string,
  placeholder?: string
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  input.classList.add("input", "is-small", "config-feature-arg");
  input.placeholder = placeholder || name;
  input.value = value ?? "";
  input.name = name;
  return input;
}
function createNumberInput(
  name: string,
  value?: string,
  placeholder?: string
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "number";
  input.classList.add("input", "is-small", "config-feature-arg");
  input.placeholder = placeholder || name;
  input.value = value ?? "";
  input.name = name;
  return input;
}
function createDropdownInput(
  name: string,
  options: string[],
  selectedValue?: string
): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.classList.add("select", "is-small", "is-fullwidth");
  const select = document.createElement("select");
  select.classList.add("config-feature-arg");
  select.name = name;
  options.forEach((optionValue) => {
    const option = new Option(optionValue, optionValue);
    if (optionValue === selectedValue) option.selected = true;
    select.appendChild(option);
  });
  wrapper.appendChild(select);
  return wrapper;
}
/** Creates a variadic input element wrapper allowing adding/removing inputs. */
function createVariadicInputElement(
  arg: ConfigurationSchemaArg,
  container: HTMLElement,
  currentValues?: string[]
): void {
  // Container for the vertical group of inputs
  const variadicGroupContainer = document.createElement("div");
  variadicGroupContainer.classList.add("variadic-group-container");
  variadicGroupContainer.style.display = "flex";
  variadicGroupContainer.style.flexDirection = "column";
  variadicGroupContainer.style.gap = "3px";
  variadicGroupContainer.style.width = "100%";

  /** --- Inner function to add a single input row --- */
  const addInputRow = (value?: string) => {
    const inputWrapper = document.createElement("div");
    inputWrapper.classList.add("variadic-input-wrapper"); // Used for styling/grouping
    inputWrapper.style.display = "flex";
    inputWrapper.style.alignItems = "center";
    inputWrapper.style.gap = "5px";

    let inputElement: HTMLElement | null = null;
    // Create appropriate input based on schema (handles enum within variadic now)
    if (arg.enum) {
      inputElement = createDropdownInput(arg.name, arg.enum, value);
    } else if (arg.type === "number") {
      inputElement = createNumberInput(arg.name, value);
    } else {
      // Default to text
      inputElement = createTextInput(arg.name, value, arg.example);
    }

    if (inputElement) {
      inputElement.style.flexGrow = "1"; // Allow input/select to take space
      // Adjust width for select wrapper to accommodate button
      if (
        inputElement.tagName === "DIV" &&
        inputElement.classList.contains("select")
      ) {
        inputElement.style.width = "calc(100% - 35px)";
      }
      inputWrapper.appendChild(inputElement);

      // --- Add "[-]" Remove Button ---
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.classList.add(
        "button",
        "is-small",
        "is-danger",
        "is-outlined",
        "remove-variadic-arg-btn"
      );
      removeButton.innerHTML = "&minus;"; // Use minus symbol
      removeButton.title = `Remove ${arg.name}`;
      removeButton.style.flexShrink = "0";
      removeButton.onclick = () => {
        inputWrapper.remove();
        // Optional: Disable remove button if only one input remains?
      };
      inputWrapper.appendChild(removeButton);

      variadicGroupContainer.appendChild(inputWrapper); // Add the row to the container
    }
  };
  /** --- End inner function --- */

  // Add initial input rows based on currentValues
  if (currentValues && currentValues.length > 0) {
    currentValues.forEach((val) => addInputRow(val));
  } else {
    addInputRow(); // Add at least one empty input row initially
  }

  container.appendChild(variadicGroupContainer); // Add the group of inputs

  // --- Add "[+]" Add More Button ---
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.classList.add(
    "button",
    "is-small",
    "is-outlined",
    "is-link",
    "add-variadic-group-btn"
  ); // Use link style maybe
  addButton.textContent = `+ Add ${arg.name}`;
  addButton.title = `Add another ${arg.name}`;
  addButton.style.marginTop = "5px";
  addButton.style.width = "100%"; // Make add button full width? Or align left?
  addButton.onclick = () => {
    addInputRow(); // Add a new empty input row to the group
  };
  container.appendChild(addButton); // Add below the group of inputs
}
function createCell(...classes: string[]): HTMLDivElement {
  const div = document.createElement("div");
  div.classList.add("config-cell", ...classes);
  return div;
}
function createCellWithInput(
  type: string,
  value: string,
  placeholder: string,
  inputClasses: string[]
): HTMLDivElement {
  const cellDiv = createCell(
    ...inputClasses.map((c) => c.replace("config-", "") + "-cell")
  );
  const input = document.createElement("input");
  input.type = type;
  input.placeholder = placeholder;
  input.value = value;
  input.classList.add("input", "is-small", ...inputClasses);
  cellDiv.appendChild(input);
  return cellDiv;
}
function createFeatureTypeDropdownCell(
  selectedTypeName: string
): HTMLDivElement {
  const cellDiv = createCell("feature-type-cell");
  const selectWrapper = document.createElement("div");
  selectWrapper.classList.add("select", "is-small", "is-fullwidth");
  const select = document.createElement("select");
  select.classList.add("config-feature-type");
  select.appendChild(new Option("None", ""));
  getAvailableFeatureTypes(FeatureCategoryName.Guitar).forEach(
    (featureType) => {
      const option = new Option(featureType.displayName, featureType.typeName);
      if (featureType.typeName === selectedTypeName) option.selected = true;
      select.appendChild(option);
    }
  );
  selectWrapper.appendChild(select);
  cellDiv.appendChild(selectWrapper);
  return cellDiv;
}
function createDragHandleCell(): HTMLDivElement {
  const cellDiv = createCell("drag-handle-cell");
  cellDiv.draggable = true;
  cellDiv.style.cursor = "grab";
  cellDiv.style.padding = "0 5px";
  cellDiv.innerHTML = "&#x2630;";
  cellDiv.title = "Drag to reorder";
  cellDiv.style.display = "flex";
  cellDiv.style.alignItems = "center";
  cellDiv.style.justifyContent = "center";
  cellDiv.style.color = "var(--clr-text-subtle)";
  return cellDiv;
}
function createCopyButtonCell(): HTMLButtonElement {
  const copyButton = document.createElement("button");
  copyButton.classList.add(
    "button",
    "is-small",
    "is-info",
    "is-outlined",
    "copy-row-btn"
  );
  copyButton.innerHTML = "&#x2398;";
  copyButton.title = "Copy Row";
  return copyButton;
}
function createRemoveButtonElement(rowElement: HTMLElement): HTMLButtonElement {
  const removeButton = document.createElement("button");
  removeButton.classList.add(
    "button",
    "is-small",
    "is-danger",
    "is-outlined",
    "remove-row-btn"
  );
  removeButton.innerHTML = "&#10005;";
  removeButton.title = "Remove Row";
  removeButton.onclick = (e) => {
    e.stopPropagation();
    rowElement.remove();
    // Trigger indentation update? Maybe via event.
  };
  return removeButton;
}
export function applyIndentation(element: HTMLElement, level: number): void {
  const indentSize = 15;
  const effectiveLevel =
    element.dataset.rowType === "group" ? Math.max(0, level - 1) : level;
  element.style.marginLeft = `${effectiveLevel * indentSize}px`;
}
function clearAllChildren(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

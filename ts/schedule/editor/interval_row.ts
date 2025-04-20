import { FeatureCategoryName, ConfigurationSchemaArg } from "../../feature";
import {
  getAvailableFeatureTypes,
  getFeatureTypeDescriptor,
} from "../../feature_registry";
import { GuitarIntervalSettings } from "../../guitar/guitar_interval_settings";

/** Data structure representing the state of a single interval row */
export interface IntervalRowData {
  rowType: "interval"; // Added rowType discriminator
  duration: string;
  task: string;
  featureTypeName: string;
  featureArgsList: string[]; // Regular args only
  intervalSettings: GuitarIntervalSettings;
}

/** Data structure representing a group header row */
export interface GroupRowData {
  rowType: "group"; // Added rowType discriminator
  level: number; // Nesting level (1 for #, 2 for ##, etc.)
  name: string; // Name of the group
}

/** Represents either an Interval row or a Group row */
export type ScheduleRowData = IntervalRowData | GroupRowData;

/**
 * Builds and returns the HTMLElement for a single interval configuration row.
 * Includes drag handle and copy button.
 */
export function buildIntervalRowElement(
  initialData: IntervalRowData
): HTMLElement {
  const entryDiv = document.createElement("div");
  entryDiv.classList.add("config-entry-row", "schedule-row");
  entryDiv.dataset.rowType = "interval"; // Set data attribute for type
  entryDiv.draggable = true; // Draggable applied to the whole row
  // *** Store the settings object directly on the element ***
  (entryDiv as any)._intervalSettings = initialData.intervalSettings;

  // Use flexbox for row layout
  entryDiv.style.display = "flex";
  entryDiv.style.alignItems = "center"; // Align items vertically
  entryDiv.style.gap = "5px"; // Space between elements
  entryDiv.style.padding = "2px 0"; // Minimal vertical padding
  entryDiv.style.position = "relative"; // For absolute positioning if needed

  // --- Drag Handle ("Grippy") ---
  const handleDiv = createDragHandleCell();
  entryDiv.appendChild(handleDiv);

  // --- Interval Cells (Wrap remaining in a flex container) ---
  const contentWrapper = document.createElement("div");
  contentWrapper.style.display = "grid"; // Use grid for the interval fields
  contentWrapper.style.flexGrow = "1"; // Allow content to take space
  // Adjusted columns to give args more space potentially
  contentWrapper.style.gridTemplateColumns = "80px 1fr 1fr minmax(150px, 2fr)";
  contentWrapper.style.gap = "5px";
  contentWrapper.style.alignItems = "center";

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
  );

  contentWrapper.appendChild(durationDiv);
  contentWrapper.appendChild(taskDiv);
  contentWrapper.appendChild(featureTypeDiv);
  contentWrapper.appendChild(featureArgsDiv);
  entryDiv.appendChild(contentWrapper); // Add content wrapper to main row

  // --- Action Buttons Cell (Copy, Remove) ---
  const actionsDiv = document.createElement("div");
  actionsDiv.classList.add("config-cell", "action-cell");
  actionsDiv.style.display = "flex"; // Align buttons horizontally
  actionsDiv.style.alignItems = "center";
  actionsDiv.style.gap = "3px";

  const copyButton = createCopyButtonCell(); // Create copy button
  actionsDiv.appendChild(copyButton);

  const removeButton = createRemoveButtonElement(entryDiv); // Get remove button element
  actionsDiv.appendChild(removeButton);

  entryDiv.appendChild(actionsDiv); // Add actions cell to the main row

  // --- Setup Feature Type Change Handler ---
  const featureTypeSelect = featureTypeDiv.querySelector(
    "select"
  ) as HTMLSelectElement;
  featureTypeSelect.addEventListener("change", () => {
    // Pass the settings object stored on the row
    updateArgsSection(
      featureTypeSelect,
      featureArgsDiv,
      (entryDiv as any)._intervalSettings
    );
  });

  // --- Initial Population of Args/Ellipsis ---
  // Pass the settings object stored on the row
  updateArgsSection(
    featureTypeSelect,
    featureArgsDiv,
    initialData.intervalSettings,
    initialData.featureArgsList
  );

  // Apply initial indentation (level 0 for top-level intervals)
  applyIndentation(entryDiv, 0);

  return entryDiv;
}

/**
 * Builds and returns the HTMLElement for a group header row.
 * Includes drag handle and copy button.
 */
export function buildGroupRowElement(initialData: GroupRowData): HTMLElement {
  const groupDiv = document.createElement("div");
  groupDiv.classList.add("group-row", "schedule-row");
  groupDiv.dataset.rowType = "group";
  groupDiv.dataset.level = String(initialData.level);
  groupDiv.draggable = true; // Draggable applied to the whole row

  // Style the group row
  groupDiv.style.display = "flex";
  groupDiv.style.alignItems = "center";
  groupDiv.style.padding = "5px 8px";
  groupDiv.style.backgroundColor = "#f0f0f0";
  groupDiv.style.marginBottom = "2px";
  groupDiv.style.border = "1px solid #dbdbdb";
  groupDiv.style.borderRadius = "4px";
  groupDiv.style.gap = "5px"; // Space between handle, input, buttons

  // --- Drag Handle ("Grippy") ---
  const handleDiv = createDragHandleCell();
  groupDiv.appendChild(handleDiv);

  // --- Group Name Input ---
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

  // --- Action Buttons Cell (Copy, Remove) ---
  const actionsDiv = document.createElement("div");
  actionsDiv.classList.add("config-cell", "action-cell");
  actionsDiv.style.display = "flex";
  actionsDiv.style.alignItems = "center";
  actionsDiv.style.gap = "3px";

  const copyButton = createCopyButtonCell(); // Create copy button
  actionsDiv.appendChild(copyButton);

  const removeButton = createRemoveButtonElement(groupDiv); // Get remove button element
  removeButton.title = "Remove Group"; // Modify remove tooltip for groups
  actionsDiv.appendChild(removeButton);

  groupDiv.appendChild(actionsDiv); // Add actions cell

  // Apply indentation based on level
  applyIndentation(groupDiv, initialData.level);

  return groupDiv;
}

// ==================================
// Internal Helper Functions for Row Building
// ==================================

/** Creates the cell containing the drag handle ("grippy") */
function createDragHandleCell(): HTMLDivElement {
  const cellDiv = createCell("drag-handle-cell");
  cellDiv.style.cursor = "grab"; // Indicate draggable
  cellDiv.style.padding = "0 5px"; // Spacing around handle
  cellDiv.innerHTML = "&#x2630;"; // Simple grippy symbol (☰)
  cellDiv.title = "Drag to reorder";
  return cellDiv;
}

/** Creates the cell containing the copy button */
function createCopyButtonCell(): HTMLButtonElement {
  const copyButton = document.createElement("button");
  copyButton.classList.add(
    "button",
    "is-small",
    "is-info",
    "is-outlined",
    "copy-row-btn"
  );
  copyButton.innerHTML = "&#x2398;"; // Example symbol (⎘)
  copyButton.title = "Copy Row";
  return copyButton;
}

/** Creates the remove button element */
function createRemoveButtonElement(rowElement: HTMLElement): HTMLButtonElement {
  const removeButton = document.createElement("button");
  removeButton.classList.add(
    "button",
    "is-small",
    "is-danger",
    "is-outlined",
    "remove-row-btn"
  );
  removeButton.innerHTML = "&#10005;"; // Cross symbol
  removeButton.title = "Remove Row";
  removeButton.onclick = (e) => {
    e.stopPropagation();
    rowElement.remove();
    // TODO: Consider calling a function here to update indentation after removal
    // This might require passing a callback or referencing the container.
    // For now, indentation updates happen on drop or explicit calls.
  };
  return removeButton;
}

/** Creates a basic cell div */
function createCell(...classes: string[]): HTMLDivElement {
  const div = document.createElement("div");
  div.classList.add("config-cell", ...classes);
  return div;
}

/** Creates a cell containing a standard input element */
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

/** Creates the cell containing the Feature Type dropdown */
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

/** Updates the content of the feature arguments container */
function updateArgsSection(
  featureTypeSelect: HTMLSelectElement,
  argsContainer: HTMLElement,
  currentSettings: GuitarIntervalSettings, // Pass the settings object
  initialArgs?: string[]
): void {
  const selectedTypeName = featureTypeSelect.value;
  argsContainer.innerHTML = ""; // Clear previous content
  if (selectedTypeName) {
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
        // Pass settings object to populateArgsFromSchema
        populateArgsFromSchema(
          argsContainer,
          schema.args,
          initialArgs || [],
          currentSettings
        );
      } else if (typeof schema === "string") {
        const infoSpan = document.createElement("span");
        infoSpan.classList.add("has-text-grey-light", "is-italic");
        infoSpan.textContent = "No configurable arguments";
        argsContainer.appendChild(infoSpan);
      }
    } else {
      argsContainer.textContent = `Feature "${selectedTypeName}" not found.`;
    }
  } else {
    argsContainer.innerHTML =
      '<span class="has-text-grey-light is-italic">No feature selected</span>';
  }
}

/** Creates a text input element wrapped for styling. */
function createTextInput(
  name: string,
  value?: string,
  placeholder?: string
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  input.classList.add("input", "is-small", "config-feature-arg"); // Added common class
  input.placeholder = placeholder || name; // Use name as placeholder if none provided
  input.value = value ?? "";
  input.name = name; // Set name attribute, might be useful
  return input;
}

/** Creates a number input element wrapped for styling. */
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

/** Creates a dropdown (select) input element wrapped for styling. */
function createDropdownInput(
  name: string,
  options: string[],
  selectedValue?: string
): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.classList.add("select", "is-small", "is-fullwidth"); // Bulma select wrapper

  const select = document.createElement("select");
  select.classList.add("config-feature-arg"); 
  select.name = name;

  // Add options
  options.forEach((optionValue) => {
    const option = new Option(optionValue, optionValue);
    if (optionValue === selectedValue) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  wrapper.appendChild(select);
  return wrapper; // Return the wrapper div
}

/** Creates a variadic input element wrapper allowing adding/removing inputs. */
function createVariadicInputElement(
  arg: ConfigurationSchemaArg,
  container: HTMLElement, // The container to add elements to (.feature-arg-inputs-container)
  currentValues?: string[] // Optional initial values
): void {
  const addInput = (value?: string) => {
    const inputWrapper = document.createElement("div");
    inputWrapper.classList.add("variadic-input-wrapper");
    inputWrapper.style.display = "flex";
    inputWrapper.style.alignItems = "center";
    inputWrapper.style.gap = "5px";
    inputWrapper.style.marginBottom = "3px"; // Space between variadic items

    let inputElement: HTMLElement | null = null;
    if (arg.enum) {
      // For enum, create dropdown
      inputElement = createDropdownInput(arg.name, arg.enum, value);
    } else if (arg.type === "number") {
      inputElement = createNumberInput(arg.name, value);
    } else {
      // Default to text for other variadic types (boolean usually isn't variadic)
      inputElement = createTextInput(arg.name, value);
    }

    if (inputElement) {
      inputWrapper.appendChild(inputElement);

      // Add Remove Button
      const removeButton = document.createElement("button");
      removeButton.type = "button"; // Prevent form submission if ever inside a form
      removeButton.classList.add(
        "button",
        "is-small",
        "is-danger",
        "is-outlined"
      );
      removeButton.innerHTML = "&times;"; // Simple 'x'
      removeButton.title = `Remove ${arg.name}`;
      removeButton.onclick = () => {
        inputWrapper.remove();
        // Optionally: trigger an update or validation
      };
      inputWrapper.appendChild(removeButton);

      container.appendChild(inputWrapper); // Add the whole wrapper to the container
    }
  };

  // Add initial inputs based on currentValues
  if (currentValues && currentValues.length > 0) {
    currentValues.forEach((val) => addInput(val));
  } else {
    // Add at least one input field even if no currentValues provided, unless it's optional?
    // For simplicity, always add one initial input for variadic fields.
    addInput();
  }

  // Add "Add More" Button
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.classList.add(
    "button",
    "is-small",
    "is-outlined",
    "add-variadic-btn"
  );
  // Use just '+' for a smaller button
  addButton.textContent = `+`;
  addButton.title = `Add ${arg.name}`; // Add title for clarity
  addButton.style.marginTop = "5px";
  addButton.onclick = () => {
    addInput(); // Add a new empty input
  };
  container.appendChild(addButton);
}

/** Populates the arguments container based on a schema object. */
function populateArgsFromSchema(
  container: HTMLElement,
  schemaArgs: ConfigurationSchemaArg[],
  currentValues: string[],
  currentSettings: GuitarIntervalSettings // Receive the settings object
): void {
  let valueIndex = 0; // Track index for non-variadic values
  container.innerHTML = ""; // Clear existing content

  const argsInnerContainer = document.createElement("div");
  argsInnerContainer.classList.add("feature-args-inner-container");
  argsInnerContainer.style.display = "flex"; // Use flex for layout
  argsInnerContainer.style.flexWrap = "wrap"; // Allow wrapping
  argsInnerContainer.style.gap = "10px"; // Space between args

  schemaArgs.forEach((arg) => {
    if (arg.type === "ellipsis") {
      // Ellipsis handling: Create the dropdown button
      if (!arg.nestedSchema) {
        console.warn("Ellipsis arg found without nestedSchema:", arg.name);
        return; // Skip if no nested schema defined
      }
      // Pass the settings object to createEllipsisDropdown
      argsInnerContainer.appendChild(
        createEllipsisDropdown(arg, currentSettings)
      );
      return; // Don't process further as a regular arg
    }

    // --- Regular Argument Handling (Non-Ellipsis) ---
    const argWrapper = document.createElement("div");
    argWrapper.classList.add("feature-arg-wrapper");
    // Optional: Add some flex styling to wrappers if needed
    // argWrapper.style.flex = '1 1 auto'; // Allow shrinking/growing

    const label = document.createElement("label");
    label.classList.add("label", "is-small");
    // Simple label text generation
    const labelText = arg.name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
    label.textContent = labelText;
    label.title = (arg.description || "") + (arg.required ? " (Required)" : "");
    argWrapper.appendChild(label);

    const inputsContainer = document.createElement("div");
    inputsContainer.classList.add("feature-arg-inputs-container");
    // inputsContainer.style.marginLeft = '10px'; // Indent inputs under label
    argWrapper.appendChild(inputsContainer);

    if (arg.isVariadic) {
      // *** FIX: Call the variadic creator function ***
      // Pass the container for the inputs, and slice relevant values
      // This simple slicing assumes variadic args come last, which might not be true.
      // A more robust approach would identify all values intended for this variadic arg.
      const variadicValues = currentValues.slice(valueIndex);
      createVariadicInputElement(arg, inputsContainer, variadicValues);
      // Note: This simple approach means only ONE variadic arg is supported per feature easily.
      valueIndex = currentValues.length; // Consume all remaining values
    } else {
      // --- Handle Non-Variadic Args ---
      let inputElement: HTMLElement | null = null;
      const value =
        currentValues.length > valueIndex ? currentValues[valueIndex] : "";

      if (arg.enum) {
        inputElement = createDropdownInput(arg.name, arg.enum, value);
      } else if (arg.type === "number") {
        inputElement = createNumberInput(arg.name, value);
      } else if (arg.type === "boolean") {
        // Represent boolean as dropdown
        inputElement = createDropdownInput(
          arg.name,
          ["true", "false"],
          value || "false"
        );
      } else {
        inputElement = createTextInput(arg.name, value); // Default to text
      }

      if (inputElement) {
        inputsContainer.appendChild(inputElement);
      }
      valueIndex++; // Increment index only for non-variadic args
    }
    argsInnerContainer.appendChild(argWrapper);
  });

  container.appendChild(argsInnerContainer); // Add the container with all wrappers
}

// ==================================
// Ellipsis Dropdown Implementation
// ==================================

/**
 * Creates the ellipsis button and its associated dropdown for nested settings.
 * @param arg The ConfigurationSchemaArg of type 'ellipsis'.
 * @param currentSettings The GuitarIntervalSettings object for the current row.
 * @returns The HTMLElement for the dropdown (wrapper div).
 */
function createEllipsisDropdown(
  arg: ConfigurationSchemaArg,
  currentSettings: GuitarIntervalSettings
): HTMLElement {
  if (!arg.nestedSchema) {
    console.error(
      "createEllipsisDropdown called without nestedSchema in arg:",
      arg
    );
    const disabledButton = document.createElement("button");
    disabledButton.classList.add(
      "button",
      "is-small",
      "is-outlined",
      "config-ellipsis-button"
    );
    disabledButton.textContent = "...";
    disabledButton.title = "Error: No nested settings defined";
    disabledButton.disabled = true;
    return disabledButton;
  }

  const dropdownDiv = document.createElement("div");
  dropdownDiv.classList.add("dropdown", "config-ellipsis-dropdown"); // Add specific class

  // --- Dropdown Trigger (the '...' button) ---
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
  button.setAttribute(
    "aria-controls",
    `dropdown-menu-${arg.name.replace(/\s+/g, "-")}`
  ); // Unique ID for menu
  button.innerHTML = "<span>...</span>"; // Use span for potential icon later
  button.title = arg.description || "Advanced Settings";
  triggerDiv.appendChild(button);
  dropdownDiv.appendChild(triggerDiv);

  // --- Dropdown Menu (contains the form) ---
  const menuDiv = document.createElement("div");
  menuDiv.classList.add("dropdown-menu");
  menuDiv.id = `dropdown-menu-${arg.name.replace(/\s+/g, "-")}`;
  menuDiv.setAttribute("role", "menu");
  dropdownDiv.appendChild(menuDiv);

  const contentDiv = document.createElement("div");
  contentDiv.classList.add("dropdown-content");
  contentDiv.style.padding = "10px"; // Add padding to content area
  contentDiv.style.minWidth = "200px"; // Give it some minimum width
  menuDiv.appendChild(contentDiv);

  // --- Dropdown Activation Logic ---
  const toggleDropdown = (event?: MouseEvent) => {
    event?.stopPropagation(); // Prevent triggering other listeners
    const isActive = dropdownDiv.classList.toggle("is-active");
    if (isActive) {
      // Populate content when opening
      populateEllipsisDropdownContent(
        contentDiv,
        arg.nestedSchema!,
        currentSettings
      );
      // Add listener to close when clicking outside
      document.addEventListener("click", handleClickOutside, true); // Use capture phase
    } else {
      // Remove listener when closing
      document.removeEventListener("click", handleClickOutside, true);
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (!dropdownDiv.contains(event.target as Node)) {
      dropdownDiv.classList.remove("is-active");
      document.removeEventListener("click", handleClickOutside, true); // Clean up listener
    }
  };

  button.addEventListener("click", toggleDropdown);

  return dropdownDiv; // Return the main dropdown wrapper
}

/**
 * Populates the content area of the ellipsis dropdown with form elements.
 * @param contentContainer The HTMLElement to populate (e.g., .dropdown-content).
 * @param nestedSchema The schema defining the inputs.
 * @param settings The GuitarIntervalSettings object to read from and write to.
 */
function populateEllipsisDropdownContent(
  contentContainer: HTMLElement,
  nestedSchema: ConfigurationSchemaArg[],
  settings: GuitarIntervalSettings
): void {
  contentContainer.innerHTML = ""; // Clear previous content

  nestedSchema.forEach((nestedArg) => {
    // Use Bulma's 'field' and 'control' for structure
    const fieldDiv = document.createElement("div");
    fieldDiv.classList.add("field");

    // Add Label
    const label = document.createElement("label");
    label.classList.add("label", "is-small");
    // Use name directly for nested settings label
    label.textContent = nestedArg.name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
    label.title = nestedArg.description || "";
    fieldDiv.appendChild(label);

    // Add Control (input wrapper)
    const controlDiv = document.createElement("div");
    controlDiv.classList.add("control");

    // Get current value (handle potential undefined property)
    // Use 'as any' for dynamic property access, or define index signature on GuitarIntervalSettings
    const currentValue = (settings as any)[nestedArg.name];
    // Convert value to string for input elements, handle undefined/null
    const currentValueStr =
      currentValue !== undefined && currentValue !== null
        ? String(currentValue)
        : "";

    let inputElement: HTMLElement | null = null;

    // Create Input based on type
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
      // Default to text
      inputElement = createTextInput(
        nestedArg.name,
        currentValueStr,
        nestedArg.description
      );
    }

    if (inputElement) {
      // Add event listener to update settings on change
      const inputField =
        inputElement.tagName === "DIV" // Handle select wrapper
          ? inputElement.querySelector("select, input")
          : inputElement;

      if (inputField) {
        inputField.addEventListener("change", (e) => {
          const target = e.target as HTMLInputElement | HTMLSelectElement;
          let newValue: string | number | boolean = target.value;

          // Parse value based on schema type
          if (nestedArg.type === "number") {
            newValue = parseInt(target.value, 10);
            if (isNaN(newValue)) newValue = 0; // Default to 0 if parsing fails
          } else if (nestedArg.type === "boolean") {
            newValue = target.value === "true";
          }

          // Update the settings object directly
          (settings as any)[nestedArg.name] = newValue;
          console.log(
            `Updated setting '${nestedArg.name}' to:`,
            newValue,
            settings
          );
          // Optional: Add visual feedback (e.g., flash background)
        });
      }

      controlDiv.appendChild(inputElement);
    }

    fieldDiv.appendChild(controlDiv);
    contentContainer.appendChild(fieldDiv);
  });
}


/** Applies left margin for indentation based on level. */
export function applyIndentation(element: HTMLElement, level: number): void {
  const indentSize = 15; // Pixels per level
  // Adjust level for groups (level 1 group has 0 indent, level 2 has 1 indent, etc.)
  const effectiveLevel =
    element.dataset.rowType === "group" ? Math.max(0, level - 1) : level;
  element.style.marginLeft = `${effectiveLevel * indentSize}px`;
}

// ts/schedule/editor/interval/interval_row_ui.ts
import {
  FeatureCategoryName,
  ConfigurationSchemaArg,
  FeatureTypeDescriptor,
} from "../../../feature";
import {
  getAvailableFeatureTypes,
  getFeatureTypeDescriptor,
  getIntervalSettingsFactory,
} from "../../../feature_registry"; // Import factory getter
// Import generic settings types
import { IntervalSettings, IntervalRowData } from "./types";
// *** NO import for GuitarIntervalSettings here ***

// Import UI helpers
import {
  createCell,
  createCellWithInput,
  createTextInput,
  createNumberInput,
  createDropdownInput,
  createToggleButtonInput,
  createEllipsisDropdown,
  populateEllipsisDropdownContent,
  createVariadicInputElement,
  createDragHandleCell,
  createCopyButtonCell,
  createRemoveButtonElement,
  applyIndentation,
} from "./common_ui_elements";

/**
 * Builds and returns the HTMLElement for a single interval configuration row.
 * Expects initialData.intervalSettings to be an instance implementing IntervalSettings.
 * Requires the featureCategory to determine available features and the correct settings factory.
 */
export function buildIntervalRowElement(
  initialData: IntervalRowData,
  featureCategory: FeatureCategoryName // Make category mandatory
): HTMLElement {
  const entryDiv = document.createElement("div");
  entryDiv.classList.add("config-entry-row", "schedule-row");
  entryDiv.dataset.rowType = "interval";
  entryDiv.dataset.featureCategory = featureCategory; // Store category for later retrieval (e.g., by getRowData)
  entryDiv.draggable = false;

  // --- Get or Create IntervalSettings Instance ---
  let settingsInstance: IntervalSettings;
  if (
    initialData.intervalSettings &&
    typeof initialData.intervalSettings.toJSON === "function"
  ) {
    // Use provided instance if valid
    settingsInstance = initialData.intervalSettings;
  } else {
    // Get the factory for the specified category
    const settingsFactory = getIntervalSettingsFactory(featureCategory);
    if (settingsFactory) {
      // Create default settings using the registered factory
      console.log(
        `Creating default interval settings using factory for category: ${featureCategory}`
      );
      settingsInstance = settingsFactory();
    } else {
      // Fallback if no factory is registered (critical issue)
      console.error(
        `No IntervalSettings factory registered for category: ${featureCategory}. Using plain object fallback.`
      );
      // Provide a minimal object satisfying the IntervalSettings interface (only toJSON needed)
      settingsInstance = {
        toJSON: () => {
          console.warn(
            `toJSON called on fallback settings object for category ${featureCategory}`
          );
          return {}; // Return empty JSON
        },
      };
    }
  }
  // Store the resolved instance on the element
  (entryDiv as any)._intervalSettings = settingsInstance;

  // --- Create Row Structure and Cells ---
  entryDiv.style.display = "flex";
  entryDiv.style.alignItems = "center";
  entryDiv.style.gap = "5px";
  entryDiv.style.padding = "2px 0";
  entryDiv.style.position = "relative";

  const handleDiv = createDragHandleCell();
  entryDiv.appendChild(handleDiv);

  const contentWrapper = document.createElement("div");
  contentWrapper.style.display = "grid";
  contentWrapper.style.flexGrow = "1";
  contentWrapper.style.gridTemplateColumns = "80px 1fr 1fr minmax(150px, 2fr)"; // Adjust as needed
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
  // Pass category to dropdown builder
  const featureTypeDiv = createFeatureTypeDropdownCell(
    initialData.featureTypeName,
    featureCategory
  );
  const featureArgsDiv = createCell(
    "feature-args-cell",
    "config-feature-args-container"
  ); // Container for args

  contentWrapper.appendChild(durationDiv);
  contentWrapper.appendChild(taskDiv);
  contentWrapper.appendChild(featureTypeDiv);
  contentWrapper.appendChild(featureArgsDiv);
  entryDiv.appendChild(contentWrapper);

  // --- Actions Cell ---
  const actionsDiv = document.createElement("div");
  actionsDiv.classList.add("config-cell", "action-cell");
  actionsDiv.style.display = "flex";
  actionsDiv.style.alignItems = "center";
  actionsDiv.style.gap = "3px";
  actionsDiv.appendChild(createCopyButtonCell());
  actionsDiv.appendChild(createRemoveButtonElement(entryDiv));
  entryDiv.appendChild(actionsDiv);

  // --- Event Listener & Initial Population ---
  const featureTypeSelect = featureTypeDiv.querySelector(
    "select"
  ) as HTMLSelectElement;
  featureTypeSelect.addEventListener("change", () => {
    // Pass the category and generic settings instance when args section updates
    updateArgsSection(
      featureTypeSelect,
      featureArgsDiv,
      settingsInstance, // Pass generic instance
      featureCategory, // Pass category
      [] // Clear initial args on change
    );
  });

  // Initial Population: Pass category, generic instance, and initial args list
  updateArgsSection(
    featureTypeSelect,
    featureArgsDiv,
    settingsInstance, // Pass generic instance
    featureCategory, // Pass category
    initialData.featureArgsList
  );

  applyIndentation(entryDiv, 0); // Apply initial indentation
  return entryDiv;
}

/** Creates the specific feature type dropdown cell for a given category */
function createFeatureTypeDropdownCell(
  selectedTypeName: string,
  category: FeatureCategoryName // Requires category
): HTMLDivElement {
  const cellDiv = createCell("feature-type-cell");
  const selectWrapper = document.createElement("div");
  selectWrapper.classList.add("select", "is-small", "is-fullwidth");
  const select = document.createElement("select");
  select.classList.add("config-feature-type");

  select.appendChild(new Option("None", "")); // "None" option

  // Populate with available feature types for the SPECIFIED category
  const availableTypes: FeatureTypeDescriptor[] =
    getAvailableFeatureTypes(category);
  if (availableTypes.length === 0) {
    console.warn(`No feature types found registered for category: ${category}`);
    select.disabled = true;
    select.appendChild(new Option(`No ${category} features`, ""));
  } else {
    availableTypes.forEach((featureType) => {
      const option = new Option(featureType.displayName, featureType.typeName);
      if (featureType.typeName === selectedTypeName) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  selectWrapper.appendChild(select);
  cellDiv.appendChild(selectWrapper);
  return cellDiv;
}

/** Updates the content of the feature arguments container based on selected feature */
function updateArgsSection(
  featureTypeSelect: HTMLSelectElement,
  argsContainer: HTMLElement,
  currentSettingsInstance: IntervalSettings, // Expect generic instance
  category: FeatureCategoryName, // Requires category
  initialArgs?: string[]
): void {
  const selectedTypeName = featureTypeSelect.value;
  argsContainer.innerHTML = ""; // Clear previous args

  if (selectedTypeName) {
    // Use the passed category to get the descriptor
    const descriptor = getFeatureTypeDescriptor(category, selectedTypeName);
    if (descriptor) {
      const schema = descriptor.getConfigurationSchema();
      if (
        typeof schema === "object" &&
        "args" in schema &&
        Array.isArray(schema.args)
      ) {
        // Pass generic settings INSTANCE and initial args list to populate function
        populateArgsFromSchema(
          argsContainer,
          schema.args,
          initialArgs || [],
          currentSettingsInstance
        );
      } else if (typeof schema === "string") {
        // Handle simple string schema description (no args)
        const infoSpan = document.createElement("span");
        infoSpan.classList.add("has-text-grey-light", "is-italic", "is-size-7");
        infoSpan.textContent = schema;
        argsContainer.appendChild(infoSpan);
      } else {
        // Handle case where schema is empty or has no args property
        const infoSpan = document.createElement("span");
        infoSpan.classList.add("has-text-grey-light", "is-italic", "is-size-7");
        infoSpan.textContent = "No configurable arguments";
        argsContainer.appendChild(infoSpan);
      }
    } else {
      // Handle case where descriptor isn't found
      argsContainer.textContent = `Error: Feature descriptor for "${selectedTypeName}" in category "${category}" not found.`;
    }
  } else {
    // Handle case where "None" is selected
    argsContainer.innerHTML =
      '<span class="has-text-grey-light is-italic is-size-7">No feature selected</span>';
  }
}

/** Populates the arguments container based on a schema object. */
function populateArgsFromSchema(
  container: HTMLElement,
  schemaArgs: ConfigurationSchemaArg[],
  currentValues: string[],
  currentSettingsInstance: IntervalSettings // Expect generic instance
): void {
  let valueIndex = 0;
  container.innerHTML = ""; // Clear container

  const argsInnerContainer = document.createElement("div");
  argsInnerContainer.classList.add("feature-args-inner-container");
  argsInnerContainer.style.display = "flex";
  argsInnerContainer.style.flexWrap = "wrap";
  argsInnerContainer.style.gap = "10px";

  schemaArgs.forEach((arg) => {
    const argWrapper = document.createElement("div");
    argWrapper.classList.add("feature-arg-wrapper");
    argWrapper.dataset.argName = arg.name;

    // Add Label
    const label = document.createElement("label");
    label.classList.add("label", "is-small");
    const labelText = arg.name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
    label.textContent = labelText;
    label.title = (arg.description || "") + (arg.required ? " (Required)" : "");
    argWrapper.appendChild(label);

    // Container for the actual input(s)
    const inputsContainer = document.createElement("div");
    inputsContainer.classList.add("feature-arg-inputs-container");
    inputsContainer.dataset.argType = arg.type;
    if (arg.uiComponentType)
      inputsContainer.dataset.uiComponentType = arg.uiComponentType;
    if (arg.isVariadic) inputsContainer.dataset.isVariadic = "true";
    argWrapper.appendChild(inputsContainer);

    // Determine which UI component to create
    const uiType = arg.uiComponentType;
    let valueConsumed = false;

    // --- Handle Custom UI Types First ---
    if (uiType === "toggle_button_selector") {
      let initialSelection: string[] = [];
      if (arg.isVariadic && valueIndex < currentValues.length) {
        const remainingValues = currentValues.slice(valueIndex);
        if (remainingValues.length === 1 && remainingValues[0].includes("-")) {
          initialSelection = remainingValues[0].split("-").filter((s) => s);
        } else {
          initialSelection = remainingValues;
        }
        valueIndex = currentValues.length;
      } else if (!arg.isVariadic && valueIndex < currentValues.length) {
        initialSelection = currentValues[valueIndex]
          .split("-")
          .filter((s) => s);
        valueIndex++;
      }
      createToggleButtonInput(inputsContainer, arg, initialSelection);
      valueConsumed = true;
    } else if (uiType === "ellipsis") {
      if (arg.nestedSchema) {
        // Pass generic instance here
        inputsContainer.appendChild(
          createEllipsisDropdown(arg, currentSettingsInstance)
        );
      } else {
        inputsContainer.textContent = "[Ellipsis config missing]";
        inputsContainer.classList.add(
          "has-text-grey-light",
          "is-italic",
          "is-size-7"
        );
      }
      valueConsumed = true; // Doesn't consume value, but handles arg display
    }
    // --- Handle Standard Types (if no custom UI matched and not already handled) ---
    else if (!valueConsumed) {
      if (arg.isVariadic) {
        // Standard variadic (text, number, enum): pass remaining values
        const variadicValues = currentValues.slice(valueIndex);
        createVariadicInputElement(arg, inputsContainer, variadicValues);
        valueIndex = currentValues.length; // Consume remaining values
      } else {
        // Standard non-variadic: use single value
        const currentValue =
          valueIndex < currentValues.length ? currentValues[valueIndex] : "";
        switch (
          arg.type // Use base type if no specific uiType
        ) {
          case "enum":
            if (!arg.enum)
              console.warn(`Enum arg "${arg.name}" missing enum values.`);
            inputsContainer.appendChild(
              createDropdownInput(arg.name, arg.enum || [], currentValue)
            );
            break;
          case "number":
            inputsContainer.appendChild(
              createNumberInput(arg.name, currentValue)
            );
            break;
          case "boolean":
            // Represent boolean as dropdown for consistency
            inputsContainer.appendChild(
              createDropdownInput(
                arg.name,
                ["true", "false"],
                currentValue || "false"
              )
            );
            break;
          case "string": // Default case
          default:
            inputsContainer.appendChild(
              createTextInput(arg.name, currentValue, arg.example)
            );
            break;
        }
        valueIndex++; // Increment for non-variadic standard types
      }
    }

    argsInnerContainer.appendChild(argWrapper); // Add the complete arg wrapper to the layout container
  });
  container.appendChild(argsInnerContainer); // Add the layout container to the main args cell
}

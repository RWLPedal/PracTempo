// ts/schedule/editor/interval/interval_row_ui.ts
import {
  FeatureTypeDescriptor,
  ConfigurationSchemaArg,
  // FeatureCategoryName removed
} from "../../../feature";
import {
  getAvailableFeatureTypes,
  getFeatureTypeDescriptor,
  getIntervalSettingsFactory,
  getCategory, // Import category getter
} from "../../../feature_registry";
// Import generic settings types
import { IntervalSettings, IntervalRowData } from "./types";

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
 * Requires the categoryName (string) to determine available features and settings.
 */
export function buildIntervalRowElement(
  initialData: IntervalRowData,
  categoryName: string // **** CHANGED: Expect string name ****
): HTMLElement {
  const entryDiv = document.createElement("div");
  entryDiv.classList.add("config-entry-row", "schedule-row");
  entryDiv.dataset.rowType = "interval";
  entryDiv.dataset.categoryName = categoryName; // **** Store category name ****
  entryDiv.draggable = false; // Dragging starts from handle

  // --- Get or Create IntervalSettings Instance ---
  let settingsInstance: IntervalSettings;
  if (
    initialData.intervalSettings &&
    typeof initialData.intervalSettings.toJSON === "function"
  ) {
    settingsInstance = initialData.intervalSettings;
  } else {
    const settingsFactory = getIntervalSettingsFactory(categoryName); // Use name string
    if (settingsFactory) {
      console.log(
        `Creating default interval settings using factory for category: ${categoryName}`
      );
      settingsInstance = settingsFactory();
    } else {
      console.error(
        `No IntervalSettings factory registered for category: ${categoryName}. Using plain object fallback.`
      );
      settingsInstance = { toJSON: () => ({}) };
    }
  }
  // Store the resolved instance on the element
  (entryDiv as any)._intervalSettings = settingsInstance;

  // --- Create Row Structure and Cells ---
  entryDiv.style.display = "flex";
  // ... (rest of styling) ...
  entryDiv.style.alignItems = "center";
  entryDiv.style.gap = "5px";
  entryDiv.style.padding = "2px 0";
  entryDiv.style.position = "relative";

  const handleDiv = createDragHandleCell();
  entryDiv.appendChild(handleDiv);

  const contentWrapper = document.createElement("div");
  contentWrapper.style.display = "grid";
  contentWrapper.style.flexGrow = "1";
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
  // Pass category name string to dropdown builder
  const featureTypeDiv = createFeatureTypeDropdownCell(
    initialData.featureTypeName,
    categoryName
  );
  const featureArgsDiv = createCell(
    "feature-args-cell",
    "config-feature-args-container"
  );

  contentWrapper.appendChild(durationDiv);
  contentWrapper.appendChild(taskDiv);
  contentWrapper.appendChild(featureTypeDiv);
  contentWrapper.appendChild(featureArgsDiv);
  entryDiv.appendChild(contentWrapper);

  // Actions Cell
  const actionsDiv = document.createElement("div");
  // ... (actions cell setup) ...
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
    // Pass category name string and settings instance
    updateArgsSection(
      featureTypeSelect,
      featureArgsDiv,
      settingsInstance,
      categoryName, // Pass name string
      [] // Clear initial args on change
    );
  });

  // Initial Population: Pass category name string, settings instance, and initial args
  updateArgsSection(
    featureTypeSelect,
    featureArgsDiv,
    settingsInstance,
    categoryName, // Pass name string
    initialData.featureArgsList
  );

  applyIndentation(entryDiv, 0); // Apply initial indentation
  return entryDiv;
}

/** Creates the specific feature type dropdown cell for a given category name */
function createFeatureTypeDropdownCell(
  selectedTypeName: string,
  categoryName: string // **** CHANGED: Expect string name ****
): HTMLDivElement {
  const cellDiv = createCell("feature-type-cell");
  const selectWrapper = document.createElement("div");
  selectWrapper.classList.add("select", "is-small", "is-fullwidth");
  const select = document.createElement("select");
  select.classList.add("config-feature-type");

  select.appendChild(new Option("None", ""));

  // Populate with available feature types for the SPECIFIED category name
  const availableTypes: FeatureTypeDescriptor[] =
    getAvailableFeatureTypes(categoryName); // Use name string
  const category = getCategory(categoryName); // Get category for display name fallback

  if (availableTypes.length === 0) {
    console.warn(
      `No feature types found registered for category: ${categoryName}`
    );
    select.disabled = true;
    select.appendChild(
      new Option(
        `No ${category?.getDisplayName() ?? categoryName} features`,
        ""
      )
    );
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
  categoryName: string, // **** CHANGED: Expect string name ****
  initialArgs?: string[]
): void {
  const selectedTypeName = featureTypeSelect.value;
  argsContainer.innerHTML = "";

  if (selectedTypeName) {
    // Use the category name string to get the descriptor
    const descriptor = getFeatureTypeDescriptor(categoryName, selectedTypeName); // Use name string
    if (descriptor) {
      const schema = descriptor.getConfigurationSchema();
      // ... (rest of schema handling remains the same, passes generic settings instance) ...
      if (
        typeof schema === "object" &&
        "args" in schema &&
        Array.isArray(schema.args)
      ) {
        populateArgsFromSchema(
          argsContainer,
          schema.args,
          initialArgs || [],
          currentSettingsInstance
        );
      } else if (typeof schema === "string") {
        const infoSpan = document.createElement("span");
        infoSpan.classList.add("has-text-grey-light", "is-italic", "is-size-7");
        infoSpan.textContent = schema;
        argsContainer.appendChild(infoSpan);
      } else {
        const infoSpan = document.createElement("span");
        infoSpan.classList.add("has-text-grey-light", "is-italic", "is-size-7");
        infoSpan.textContent = "No configurable arguments";
        argsContainer.appendChild(infoSpan);
      }
    } else {
      argsContainer.textContent = `Error: Feature descriptor for "${selectedTypeName}" in category "${categoryName}" not found.`;
    }
  } else {
    argsContainer.innerHTML =
      '<span class="has-text-grey-light is-italic is-size-7">No feature selected</span>';
  }
}

/** Populates the arguments container based on a schema object. (No changes needed here as it already uses the generic settings instance) */
function populateArgsFromSchema(
  container: HTMLElement,
  schemaArgs: ConfigurationSchemaArg[],
  currentValues: string[],
  currentSettingsInstance: IntervalSettings // Expect generic instance
): void {
  // ... (Implementation remains the same as in previous response) ...
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
    const label = document.createElement("label");
    label.classList.add("label", "is-small");
    const labelText = arg.name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
    label.textContent = labelText;
    label.title = (arg.description || "") + (arg.required ? " (Required)" : "");
    argWrapper.appendChild(label);
    const inputsContainer = document.createElement("div");
    inputsContainer.classList.add("feature-arg-inputs-container");
    inputsContainer.dataset.argType = arg.type;
    if (arg.uiComponentType)
      inputsContainer.dataset.uiComponentType = arg.uiComponentType;
    if (arg.isVariadic) inputsContainer.dataset.isVariadic = "true";
    argWrapper.appendChild(inputsContainer);
    const uiType = arg.uiComponentType;
    let valueConsumed = false;
    if (uiType === "toggle_button_selector") {
      let initialSelection: string[] = [];
      // ... (toggle button logic remains same) ...
      createToggleButtonInput(inputsContainer, arg, initialSelection);
      valueConsumed = true;
    } else if (uiType === "ellipsis") {
      if (arg.nestedSchema) {
        inputsContainer.appendChild(
          createEllipsisDropdown(arg, currentSettingsInstance)
        ); // Pass generic instance
      } else {
        /* ... error handling ... */
      }
      valueConsumed = true;
    } else if (!valueConsumed) {
      if (arg.isVariadic) {
        const variadicValues = currentValues.slice(valueIndex);
        createVariadicInputElement(arg, inputsContainer, variadicValues);
        valueIndex = currentValues.length;
      } else {
        const currentValue =
          valueIndex < currentValues.length ? currentValues[valueIndex] : "";
        switch (arg.type) {
          // ... (standard input creation logic remains same) ...
          case "enum":
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
            inputsContainer.appendChild(
              createDropdownInput(
                arg.name,
                ["true", "false"],
                currentValue || "false"
              )
            );
            break;
          default:
            inputsContainer.appendChild(
              createTextInput(arg.name, currentValue, arg.example)
            );
            break;
        }
        valueIndex++;
      }
    }
    argsInnerContainer.appendChild(argWrapper);
  });
  container.appendChild(argsInnerContainer);
}

// ts/schedule/editor/interval/interval_row_ui.ts
import { FeatureCategoryName, ConfigurationSchemaArg } from "../../../feature";
import { getAvailableFeatureTypes, getFeatureTypeDescriptor } from "../../../feature_registry";
import { GuitarIntervalSettings } from "../../../guitar/guitar_interval_settings";
import { IntervalRowData } from "./types";
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
    applyIndentation
} from "./common_ui_elements";

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

  // Store the GuitarIntervalSettings INSTANCE directly
  (entryDiv as any)._intervalSettings =
    initialData.intervalSettings instanceof GuitarIntervalSettings
      ? initialData.intervalSettings
      : new GuitarIntervalSettings(); // Fallback just in case

  // Style row
  entryDiv.style.display = "flex";
  entryDiv.style.alignItems = "center"; // Align items vertically centered
  entryDiv.style.gap = "5px";
  entryDiv.style.padding = "2px 0"; // Minimal vertical padding
  entryDiv.style.position = "relative"; // For potential absolute positioning inside?

  // Create handle (draggable=true is set inside createDragHandleCell)
  const handleDiv = createDragHandleCell();
  entryDiv.appendChild(handleDiv);

  // Content wrapper (using grid for alignment)
  const contentWrapper = document.createElement("div");
  contentWrapper.style.display = "grid";
  contentWrapper.style.flexGrow = "1"; // Allow wrapper to take available space
  // Adjust grid columns as needed
  contentWrapper.style.gridTemplateColumns = "80px 1fr 1fr minmax(150px, 2fr)";
  contentWrapper.style.gap = "5px";
  contentWrapper.style.alignItems = "center"; // Vertically align items in grid cells

  // Create cells with inputs using helpers
  const durationDiv = createCellWithInput("text", initialData.duration, "Time", ["config-duration"]);
  const taskDiv = createCellWithInput("text", initialData.task, "Task Name", ["config-task"]);
  const featureTypeDiv = createFeatureTypeDropdownCell(initialData.featureTypeName); // Specific helper
  const featureArgsDiv = createCell("feature-args-cell", "config-feature-args-container"); // Container for args UI

  // Append cells to the grid wrapper
  contentWrapper.appendChild(durationDiv);
  contentWrapper.appendChild(taskDiv);
  contentWrapper.appendChild(featureTypeDiv);
  contentWrapper.appendChild(featureArgsDiv);
  entryDiv.appendChild(contentWrapper); // Append grid wrapper to main row div

  // Actions cell (copy, remove) - appended after the grid
  const actionsDiv = document.createElement("div");
  actionsDiv.classList.add("config-cell", "action-cell");
  actionsDiv.style.display = "flex";
  actionsDiv.style.alignItems = "center";
  actionsDiv.style.gap = "3px"; // Small gap between buttons

  const copyButton = createCopyButtonCell();
  actionsDiv.appendChild(copyButton);
  const removeButton = createRemoveButtonElement(entryDiv); // Pass the row to remove
  actionsDiv.appendChild(removeButton);
  entryDiv.appendChild(actionsDiv); // Append actions cell to main row div

  // --- Event Listener & Initial Population ---
  const featureTypeSelect = featureTypeDiv.querySelector("select") as HTMLSelectElement;
  featureTypeSelect.addEventListener("change", () => {
    // Pass the settings INSTANCE when args section updates
    updateArgsSection(
      featureTypeSelect,
      featureArgsDiv,
      (entryDiv as any)._intervalSettings // Get stored instance
    );
  });

  // Initial Population: Pass the settings INSTANCE and initial args list
  updateArgsSection(
    featureTypeSelect,
    featureArgsDiv,
    (entryDiv as any)._intervalSettings, // Pass instance
    initialData.featureArgsList // Pass args list from parsed data
  );

  applyIndentation(entryDiv, 0); // Apply initial indentation (level 0 by default)
  return entryDiv;
}


/** Creates the specific feature type dropdown cell */
function createFeatureTypeDropdownCell(
  selectedTypeName: string
): HTMLDivElement {
  const cellDiv = createCell("feature-type-cell");
  const selectWrapper = document.createElement("div");
  selectWrapper.classList.add("select", "is-small", "is-fullwidth");
  const select = document.createElement("select");
  select.classList.add("config-feature-type"); // Class for selection

  // Add "None" option
  select.appendChild(new Option("None", ""));

  // Populate with available feature types (assuming Guitar category for now)
  getAvailableFeatureTypes(FeatureCategoryName.Guitar).forEach((featureType) => {
    const option = new Option(featureType.displayName, featureType.typeName);
    if (featureType.typeName === selectedTypeName) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  selectWrapper.appendChild(select);
  cellDiv.appendChild(selectWrapper);
  return cellDiv;
}


/** Updates the content of the feature arguments container based on selected feature */
function updateArgsSection(
  featureTypeSelect: HTMLSelectElement,
  argsContainer: HTMLElement,
  currentSettingsInstance: GuitarIntervalSettings, // Expects an INSTANCE
  initialArgs?: string[] // Initial args from parser or copy/paste
): void {
  const selectedTypeName = featureTypeSelect.value;
  argsContainer.innerHTML = ""; // Clear previous args

  if (selectedTypeName) {
    // Assuming Guitar category for now
    const descriptor = getFeatureTypeDescriptor(FeatureCategoryName.Guitar, selectedTypeName);
    if (descriptor) {
      const schema = descriptor.getConfigurationSchema();
      if (typeof schema === "object" && "args" in schema && Array.isArray(schema.args)) {
        // Pass settings INSTANCE and initial args list to populate function
        populateArgsFromSchema(argsContainer, schema.args, initialArgs || [], currentSettingsInstance);
      } else if (typeof schema === 'string') {
        // If schema is just a string description (no args)
        const infoSpan = document.createElement('span');
        infoSpan.classList.add("has-text-grey-light", "is-italic", "is-size-7");
        infoSpan.textContent = schema;
        argsContainer.appendChild(infoSpan);
      } else {
         // No args defined or schema is empty/invalid
         const infoSpan = document.createElement('span');
         infoSpan.classList.add("has-text-grey-light", "is-italic", "is-size-7");
         infoSpan.textContent = "No configurable arguments";
         argsContainer.appendChild(infoSpan);
      }
    } else {
      argsContainer.textContent = `Error: Feature descriptor for "${selectedTypeName}" not found.`;
    }
  } else {
    // No feature selected
    argsContainer.innerHTML = '<span class="has-text-grey-light is-italic is-size-7">No feature selected</span>';
  }
}


/** Populates the arguments container based on a schema object. */
function populateArgsFromSchema(
  container: HTMLElement,
  schemaArgs: ConfigurationSchemaArg[],
  currentValues: string[], // Args from parser/data.
  currentSettingsInstance: GuitarIntervalSettings // The actual settings INSTANCE
): void {
    let valueIndex = 0; // Keep track of which value from currentValues we're using
    container.innerHTML = ""; // Clear previous content

    const argsInnerContainer = document.createElement("div");
    argsInnerContainer.classList.add("feature-args-inner-container");
    argsInnerContainer.style.display = "flex"; // Use flexbox for layout
    argsInnerContainer.style.flexWrap = "wrap"; // Allow wrapping
    argsInnerContainer.style.gap = "10px"; // Space between arg wrappers

    schemaArgs.forEach((arg) => {
        const argWrapper = document.createElement("div");
        argWrapper.classList.add("feature-arg-wrapper");
        argWrapper.dataset.argName = arg.name; // Store arg name for potential reference

        // Add Label
        const label = document.createElement("label");
        label.classList.add("label", "is-small");
        // Basic label generation (CamelCase -> Title Case)
        const labelText = arg.name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
        label.textContent = labelText;
        label.title = (arg.description || "") + (arg.required ? " (Required)" : "");
        argWrapper.appendChild(label);

        // Container for the actual input(s)
        const inputsContainer = document.createElement("div");
        inputsContainer.classList.add("feature-arg-inputs-container");
        inputsContainer.dataset.argType = arg.type; // Store base type
        if (arg.uiComponentType) inputsContainer.dataset.uiComponentType = arg.uiComponentType;
        if (arg.isVariadic) inputsContainer.dataset.isVariadic = 'true';
        argWrapper.appendChild(inputsContainer);

        // --- Determine which UI component to create ---
        const uiType = arg.uiComponentType; // Prioritize specific UI component request
        let valueConsumed = false; // Flag to track if value was used by a custom UI

        // --- Handle Custom UI Types First ---
        if (uiType === 'toggle_button_selector') {
            let initialSelection: string[] = [];
             if (arg.isVariadic && valueIndex < currentValues.length) {
                 // Variadic toggle: assume remaining values are for the sequence
                 const remainingValues = currentValues.slice(valueIndex);
                 // Handle sequence string ("I-V-vi") or multiple individual values
                 if (remainingValues.length === 1 && remainingValues[0].includes('-')) {
                     initialSelection = remainingValues[0].split('-').filter(s => s); // Split sequence
                 } else {
                     initialSelection = remainingValues; // Use as individual values
                 }
                 valueIndex = currentValues.length; // Consume all remaining values
             } else if (!arg.isVariadic && valueIndex < currentValues.length) {
                // Non-variadic toggle: assume single value, potentially hyphenated sequence
                initialSelection = currentValues[valueIndex].split('-').filter(s => s);
                valueIndex++; // Consume one value
             }
            createToggleButtonInput(inputsContainer, arg, initialSelection);
            valueConsumed = true;
        }
        else if (uiType === 'ellipsis') {
            if (arg.nestedSchema) {
                inputsContainer.appendChild(createEllipsisDropdown(arg, currentSettingsInstance));
            } else {
                 inputsContainer.textContent = "[Ellipsis config missing]";
                 inputsContainer.classList.add("has-text-grey-light", "is-italic", "is-size-7");
            }
            valueConsumed = true; // Doesn't consume value, but handles the arg display
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
                const currentValue = valueIndex < currentValues.length ? currentValues[valueIndex] : "";
                switch(arg.type) { // Use base type if no specific uiType
                    case 'enum':
                        if (!arg.enum) console.warn(`Enum arg "${arg.name}" missing enum values.`);
                        inputsContainer.appendChild(createDropdownInput(arg.name, arg.enum || [], currentValue));
                        break;
                    case 'number':
                        inputsContainer.appendChild(createNumberInput(arg.name, currentValue));
                        break;
                    case 'boolean':
                         // Represent boolean as dropdown for consistency
                        inputsContainer.appendChild(createDropdownInput(arg.name, ["true", "false"], currentValue || "false"));
                        break;
                    case 'string': // Default case
                    default:
                         inputsContainer.appendChild(createTextInput(arg.name, currentValue, arg.example));
                        break;
                }
                valueIndex++; // Increment for non-variadic standard types
            }
        }

        argsInnerContainer.appendChild(argWrapper); // Add the complete arg wrapper to the layout container
    });
    container.appendChild(argsInnerContainer); // Add the layout container to the main args cell
}
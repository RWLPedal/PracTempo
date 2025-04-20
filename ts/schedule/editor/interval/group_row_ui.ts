// ts/schedule/editor/interval/group_row_ui.ts
import { GroupRowData } from "./types";
import {
    createDragHandleCell,
    createCopyButtonCell,
    createRemoveButtonElement,
    applyIndentation
} from "./common_ui_elements";

/**
 * Builds and returns the HTMLElement for a group header row.
 */
export function buildGroupRowElement(initialData: GroupRowData): HTMLElement {
  const groupDiv = document.createElement("div");
  groupDiv.classList.add("group-row", "schedule-row");
  groupDiv.dataset.rowType = "group";
  groupDiv.dataset.level = String(initialData.level); // Store level for indentation logic
  groupDiv.draggable = false; // Draggable is false on the row itself

  // Basic Styling
  groupDiv.style.display = "flex";
  groupDiv.style.alignItems = "center";
  groupDiv.style.padding = "5px 8px"; // Padding inside the group row
  groupDiv.style.backgroundColor = "var(--clr-tertiary-light)"; // Use CSS variable
  groupDiv.style.marginBottom = "2px"; // Small gap below group row
  groupDiv.style.border = "1px solid var(--clr-border-light)"; // Use CSS variable
  groupDiv.style.borderRadius = "4px";
  groupDiv.style.gap = "5px"; // Gap between elements (handle, input, actions)

  // Drag Handle
  const handleDiv = createDragHandleCell();
  groupDiv.appendChild(handleDiv);

  // Group Name Input
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = initialData.name;
  nameInput.placeholder = `Group Name (Level ${initialData.level})`;
  nameInput.classList.add("input", "is-small", "group-name-input"); // Specific class for identification
  nameInput.style.flexGrow = "1"; // Allow input to take remaining space
  // Make input look less like a standard input field
  nameInput.style.border = "none";
  nameInput.style.boxShadow = "none";
  nameInput.style.backgroundColor = "transparent";
  nameInput.style.fontWeight = "bold"; // Make group name stand out
  groupDiv.appendChild(nameInput);

  // Actions Cell (Copy, Remove)
  const actionsDiv = document.createElement("div");
  actionsDiv.classList.add("config-cell", "action-cell"); // Reuse action-cell class potentially
  actionsDiv.style.display = "flex";
  actionsDiv.style.alignItems = "center";
  actionsDiv.style.gap = "3px"; // Gap between buttons

  const copyButton = createCopyButtonCell(); // Reuse copy button
  actionsDiv.appendChild(copyButton);
  const removeButton = createRemoveButtonElement(groupDiv); // Reuse remove button
  removeButton.title = "Remove Group"; // Specific title
  actionsDiv.appendChild(removeButton);

  groupDiv.appendChild(actionsDiv); // Append actions to the group row

  // Apply initial indentation based on the group's level
  // Note: applyIndentation now indents based on the *parent* group level visually.
  // A level 1 group gets indent 0, level 2 gets indent 1, etc. This might need adjustment
  // if nested groups are implemented later, but follows current logic.
  applyIndentation(groupDiv, initialData.level);
  return groupDiv;
}
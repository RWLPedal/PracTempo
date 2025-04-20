export class EditorUIManager {
  public containerEl: HTMLElement;
  public textEditorWrapperEl!: HTMLElement;
  public textEl!: HTMLTextAreaElement;
  public configEditorWrapperEl!: HTMLElement;
  public configEntriesContainerEl!: HTMLElement;
  public editorControlsContainerEl!: HTMLElement;
  public modeToggleEl!: HTMLButtonElement;
  public addConfigEntryButtonEl!: HTMLButtonElement;
  public addGroupButtonEl!: HTMLButtonElement;
  public loadSaveButtonEl!: HTMLButtonElement; // Found by ID in Main.ts
  public copyButtonEl!: HTMLButtonElement;
  public pasteButtonEl!: HTMLButtonElement;
  public setScheduleButtonEl!: HTMLButtonElement;

  constructor(containerEl: HTMLElement) {
    if (!containerEl)
      throw new Error("EditorUIManager: Container element is required.");
    this.containerEl = containerEl;
    this._renderBaseHTML();
  }

  private _renderBaseHTML(): void {
    this.containerEl.innerHTML = ""; // Clear container

    // --- Text Editor ---
    this.textEditorWrapperEl = document.createElement("div");
    this.textEditorWrapperEl.id = "text-editor-wrapper";
    this.textEditorWrapperEl.style.padding = "10px";
    this.textEditorWrapperEl.style.border = "1px solid #ccc";
    this.textEditorWrapperEl.style.marginBottom = "10px";

    this.textEl = document.createElement("textarea");
    this.textEl.id = "schedule-text-editor";
    this.textEl.classList.add("textarea");
    this.textEl.rows = 15;
    this.textEl.placeholder =
      "Enter schedule text here (e.g., 5:00, Warmup, Notes)";
    this.textEditorWrapperEl.appendChild(this.textEl);
    this.containerEl.appendChild(this.textEditorWrapperEl);

    // --- Config Editor ---
    this.configEditorWrapperEl = document.createElement("div");
    this.configEditorWrapperEl.id = "config-editor-wrapper";
    this.containerEl.appendChild(this.configEditorWrapperEl);

    this.configEntriesContainerEl = document.createElement("div");
    this.configEntriesContainerEl.id = "config-entries-container";
    // Make focusable for keyboard shortcuts
    this.configEntriesContainerEl.setAttribute("tabindex", "-1");
    this.configEntriesContainerEl.style.outline = "none";
    this.configEditorWrapperEl.appendChild(this.configEntriesContainerEl);

    // --- Editor Controls ---
    this.editorControlsContainerEl = document.createElement("div");
    this.editorControlsContainerEl.id = "editor-controls";
    this.editorControlsContainerEl.style.display = "flex";
    this.editorControlsContainerEl.style.gap = "10px";
    this.editorControlsContainerEl.style.marginTop = "10px";
    this.containerEl.appendChild(this.editorControlsContainerEl);

    // Buttons
    this.modeToggleEl = this._createButton(
      "mode-toggle",
      "Switch to Text Editor",
      ["is-outlined"],
      "Switch Mode"
    );
    this.addConfigEntryButtonEl = this._createButton(
      "add-config-entry",
      "<span>+ Interval</span>",
      ["is-outlined"],
      "Add Interval"
    );
    this.addGroupButtonEl = this._createButton(
      "add-group-entry",
      "<span>+ Group</span>",
      ["is-outlined"],
      "Add Group Header"
    );
    this.loadSaveButtonEl = this._createButton(
      "load-schedule-button",
      "<span>Load/Save</span>",
      ["is-info", "is-outlined"],
      "Load/Save Schedules"
    );
    this.copyButtonEl = this._createButton(
      "copy-schedule-rows",
      "<span>Copy</span>",
      ["is-outlined"],
      "Copy Selected Rows (Ctrl+C)"
    );
    this.pasteButtonEl = this._createButton(
      "paste-schedule-rows",
      "<span>Paste</span>",
      ["is-outlined"],
      "Paste Copied Rows (Ctrl+V)"
    );
    this.setScheduleButtonEl = this._createButton(
      "set-schedule-control",
      "Set Schedule & Reset Timer",
      ["is-primary"]
    );
    this.setScheduleButtonEl.style.marginLeft = "auto";

    this.editorControlsContainerEl.append(
      this.modeToggleEl,
      this.addConfigEntryButtonEl,
      this.addGroupButtonEl,
      this.loadSaveButtonEl,
      this.copyButtonEl,
      this.pasteButtonEl,
      this.setScheduleButtonEl
    );

    this.updateCopyPasteButtonState(false, false);
  }

  private _createButton(
    id: string,
    innerHTML: string,
    bulmaClasses: string[] = [],
    title: string = ""
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.id = id;
    button.classList.add("button", "is-small", ...bulmaClasses);
    button.innerHTML = innerHTML;
    if (title) button.title = title;
    return button;
  }

  public setModeUI(isTextMode: boolean): void {
    this.textEditorWrapperEl.style.display = isTextMode ? "block" : "none";
    this.configEditorWrapperEl.style.display = isTextMode ? "none" : "block";
    this.modeToggleEl.textContent = isTextMode
      ? "Switch to Config Editor"
      : "Switch to Text Editor";
    this.addConfigEntryButtonEl.style.display = isTextMode
      ? "none"
      : "inline-block";
    this.addGroupButtonEl.style.display = isTextMode ? "none" : "inline-block";
    this.copyButtonEl.style.display = isTextMode ? "none" : "inline-block";
    this.pasteButtonEl.style.display = isTextMode ? "none" : "inline-block";
  }

  public updateCopyPasteButtonState(canCopy: boolean, canPaste: boolean): void {
    this.copyButtonEl.toggleAttribute("disabled", !canCopy);
    this.pasteButtonEl.toggleAttribute("disabled", !canPaste);
  }

  public populateConfigUI(
    buildRowCallback: (rowData: any) => HTMLElement | null,
    rowDataArray: any[]
  ): void {
    while (this.configEntriesContainerEl.firstChild) {
      this.configEntriesContainerEl.removeChild(
        this.configEntriesContainerEl.firstChild
      );
    }

    rowDataArray.forEach((rowData) => {
      const rowElement = buildRowCallback(rowData);
      if (rowElement) {
        this.configEntriesContainerEl.appendChild(rowElement);
      }
    });
  }
}

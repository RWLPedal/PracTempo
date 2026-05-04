import { AppSettings } from "./settings";
import { getAvailableCategories, getDefaultGlobalSettingsForCategory } from "./feature_registry";
import { Theme } from "./theme_manager";

type PageType = 'practice' | 'reference';
type SaveCallback = (newSettings: AppSettings) => void;

const MODAL_HTML = `
<div class="modal" id="settings-modal">
  <div class="modal-background"></div>
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title">Application Settings</p>
      <button class="delete" aria-label="close" id="settings-modal-close"></button>
    </header>
    <section class="modal-card-body">
      <!-- Content will be generated here -->
    </section>
    <footer class="modal-card-foot is-justify-content-flex-end">
      <button class="button is-success" id="settings-save-button">Save changes</button>
      <button class="button" id="settings-cancel-button">Cancel</button>
    </footer>
  </div>
</div>
`;

const PRACTICE_SETTINGS_HTML = `
<h4 class="title is-6">Practice Settings</h4>
<div class="field is-horizontal">
    <div class="field-label is-normal"><label class="label">Warmup (sec)</label></div>
    <div class="field-body"><div class="field"><div class="control">
        <input class="input" type="number" id="warmup-input" min="0" step="1" value="0">
    </div></div></div>
</div>
`;

const GLOBAL_SETTINGS_HTML = `
<h4 class="title is-6">Global Settings</h4>
<div class="field is-horizontal">
  <div class="field-label is-normal"><label class="label">Theme</label></div>
  <div class="field-body"><div class="field"><div class="control">
      <div class="select is-fullwidth"><select id="theme-select">
          <option value="warm">Warm</option>
          <option value="dark">Dark</option>
          <option value="forest">Forest</option>
          <option value="neon">Neon</option>
      </select></div>
  </div></div></div>
</div>
<hr>
<div id="category-settings-container"></div>
`;

export class SettingsManager {
    private settings: AppSettings;
    private pageType: PageType;
    private modalEl: HTMLElement | null = null;
    private onSave: SaveCallback;

    constructor(settings: AppSettings, pageType: PageType, onSave: SaveCallback) {
        this.settings = settings;
        this.pageType = pageType;
        this.onSave = onSave;
        this.injectModal();
    }

    private injectModal(): void {
        if (document.getElementById('settings-modal')) {
            return;
        }
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = MODAL_HTML;
        document.body.appendChild(modalContainer);
        this.modalEl = document.getElementById('settings-modal');

        // Add event listeners for closing
        this.modalEl.querySelector('#settings-modal-close').addEventListener('click', () => this.close());
        this.modalEl.querySelector('.modal-background').addEventListener('click', () => this.close());
        this.modalEl.querySelector('#settings-cancel-button').addEventListener('click', () => this.close());
        this.modalEl.querySelector('#settings-save-button').addEventListener('click', () => this.save());
    }

    public open(): void {
        if (!this.modalEl) return;
        this.populate();
        this.modalEl.classList.add('is-active');
    }

    public close(): void {
        this.modalEl?.classList.remove('is-active');
    }

    public isOpen(): boolean {
        return this.modalEl?.classList.contains('is-active') ?? false;
    }

    public updateSettings(settings: AppSettings): void {
        this.settings = settings;
        if (this.isOpen()) {
            const themeSelect = this.modalEl?.querySelector('#theme-select') as HTMLSelectElement | null;
            if (themeSelect) themeSelect.value = settings.theme;
        }
    }

    private populate(): void {
        const body = this.modalEl.querySelector('.modal-card-body');
        let content = '';

        if (this.pageType === 'practice') {
            content += PRACTICE_SETTINGS_HTML;
        }
        
        content += GLOBAL_SETTINGS_HTML;
        body.innerHTML = content;
        
        // Populate fields
        (body.querySelector("#theme-select") as HTMLSelectElement).value = this.settings.theme;
        if (this.pageType === 'practice') {
            (body.querySelector("#warmup-input") as HTMLInputElement).value = String(this.settings.practice.warmupPeriod);
        }

        this.populateCategorySettings(body.querySelector('#category-settings-container'));
    }

    private populateCategorySettings(container: HTMLElement): void {
        if (!container) {
            console.error("Cannot find category settings container in modal!");
            return;
        }
        container.innerHTML = "";

        const categories = getAvailableCategories();
        categories.forEach((categoryInstance) => {
            if (typeof categoryInstance.getGlobalSettingsUISchema !== "function") return;
            const schemaItems = categoryInstance.getGlobalSettingsUISchema();
            const categoryName = categoryInstance.getName();
            if (!schemaItems || schemaItems.length === 0) return;

            const initialDraft = this.getCategorySettings(categoryName);

            const categoryHeader = document.createElement("h5");
            categoryHeader.textContent = `${categoryInstance.getDisplayName()} Settings`;
            categoryHeader.classList.add("title", "is-6", "category-settings-header", "mt-4");
            container.appendChild(categoryHeader);

            // Wrapper for this category's fields so we can re-render it in place.
            const sectionEl = document.createElement("div");
            sectionEl.dataset.categorySectionName = categoryName;
            container.appendChild(sectionEl);

            this._renderCategorySection(sectionEl, schemaItems, categoryName, initialDraft);
        });
    }

    /**
     * Renders (or re-renders) one category's settings fields into `sectionEl`.
     * `draft` is the current in-memory values to show; fields with `triggersRebuild`
     * will re-render the section when their value changes.
     */
    private _renderCategorySection(
        sectionEl: HTMLElement,
        schemaItems: import("./feature").SettingsUISchemaItem[],
        categoryName: string,
        draft: Record<string, any>
    ): void {
        sectionEl.innerHTML = "";

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
            const currentValue = draft[item.key];

            if (item.type === "select") {
                const options = item.getDynamicOptions
                    ? item.getDynamicOptions(draft)
                    : (item.options ?? []);
                const selectElement = document.createElement("select");
                selectElement.id = inputId;
                const selectWrapper = document.createElement("div");
                selectWrapper.classList.add("select", "is-fullwidth");
                options.forEach((opt) => {
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

                if (item.triggersRebuild) {
                    selectElement.addEventListener("change", () => {
                        const newDraft = this._readSectionDraft(sectionEl, draft);
                        this._renderCategorySection(sectionEl, schemaItems, categoryName, newDraft);
                    });
                }
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
                if (item.triggersRebuild) {
                    checkboxElement.addEventListener("change", () => {
                        const newDraft = this._readSectionDraft(sectionEl, draft);
                        this._renderCategorySection(sectionEl, schemaItems, categoryName, newDraft);
                    });
                }
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
            sectionEl.appendChild(fieldDiv);
        });
    }

    /** Reads current form values within a category section into a draft object. */
    private _readSectionDraft(sectionEl: HTMLElement, baseDraft: Record<string, any>): Record<string, any> {
        const draft = { ...baseDraft };
        sectionEl.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input[data-setting], select[data-setting]")
            .forEach((el) => {
                const key = el.dataset.setting;
                if (!key) return;
                if (el.type === "checkbox") draft[key] = (el as HTMLInputElement).checked;
                else if (el.type === "number") draft[key] = parseFloat(el.value) || 0;
                else draft[key] = el.value;
            });
        return draft;
    }

    private getCategorySettings(categoryName: string): any {
        const defaults = getDefaultGlobalSettingsForCategory<any>(categoryName) ?? {};
        const stored = this.settings.categorySettings?.[categoryName] ?? {};
        return { ...defaults, ...stored };
    }


    private save(): void {
        const newSettings: AppSettings = JSON.parse(JSON.stringify(this.settings));

        // 1. Update global settings (Theme)
        newSettings.theme = (this.modalEl.querySelector("#theme-select") as HTMLSelectElement).value as Theme;

        // 2. Update page-specific settings
        if (this.pageType === 'practice') {
            newSettings.practice.warmupPeriod = Math.max(0, parseInt((this.modalEl.querySelector("#warmup-input") as HTMLInputElement).value, 10) || 0);
        }

        // 3. Update Category Settings Dynamically
        const container = this.modalEl.querySelector<HTMLElement>(`#category-settings-container`);
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

        this.settings = newSettings;
        this.onSave(newSettings);
        this.close();
    }
}

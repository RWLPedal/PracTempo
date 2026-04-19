import { ConfigurationSchema, ConfigurationSchemaArg } from "../feature";
import { createLayerListInput, extractLayerListValues } from "../schedule/editor/interval/common_ui_elements";

export type ConfigChangeCallback = (config: (string | null)[]) => void;

/** Renders a compact configuration UI for a feature schema inside a floating view. */
export class ConfigView {
    private schema: ConfigurationSchema;
    private container: HTMLElement;
    private callback: ConfigChangeCallback;

    // Values keyed by schema arg index.
    // Non-variadic args: string | null.  Variadic (toggle) args: string[].
    private argValues: Map<number, string | string[] | null> = new Map();
    // Containers for layer_list args — values extracted from DOM at read time.
    private layerListContainers: Map<number, HTMLElement> = new Map();

    constructor(schema: ConfigurationSchema, container: HTMLElement, callback: ConfigChangeCallback) {
        this.schema = schema;
        this.container = container;
        this.callback = callback;
    }

    /** Flat config consumed by ConfigurableFeatureView (accessed as configView['currentConfig']). */
    get currentConfig(): (string | null)[] {
        return this.buildFlatConfig();
    }

    private buildFlatConfig(): (string | null)[] {
        if (typeof this.schema === 'string') return [];
        const result: (string | null)[] = [];
        this.schema.args.forEach((arg, index) => {
            // Checkbox is UI-only; ellipsis (guitar settings) is handled externally — both skipped.
            if (arg.uiComponentType === 'checkbox' || arg.uiComponentType === 'ellipsis') return;
            if (arg.uiComponentType === 'layer_list') {
                const listContainer = this.layerListContainers.get(index);
                if (listContainer) {
                    extractLayerListValues(listContainer).forEach(v => result.push(v));
                }
                return;
            }
            const val = this.argValues.get(index) ?? null;
            if (arg.isVariadic) {
                const arr = Array.isArray(val) ? val : (val !== null ? [val as string] : []);
                arr.forEach(v => result.push(v));
            } else {
                result.push(val as string | null);
            }
        });
        return result;
    }

    private notifyChange(): void {
        this.callback(this.buildFlatConfig());
    }

    public render(): void {
        if (typeof this.schema === 'string') {
            this.container.innerHTML = `<p>${this.schema}</p>`;
            return;
        }

        this.container.innerHTML = '';

        this.schema.args.forEach((arg, index) => {
            if (arg.uiComponentType === 'ellipsis') return; // handled externally

            const field = document.createElement('div');
            field.classList.add('field');
            field.dataset.argIndex = String(index);
            field.dataset.argName = arg.name;

            // Checkbox and layer_list manage their own labels — skip the separate label element.
            if (arg.uiComponentType !== 'checkbox' && arg.uiComponentType !== 'layer_list') {
                const label = document.createElement('label');
                label.classList.add('label', 'is-small');
                label.innerText = arg.name;
                field.appendChild(label);
            }

            const control = document.createElement('div');
            control.classList.add('control');
            field.appendChild(control);

            this.renderArg(control, arg, index);
            this.container.appendChild(field);
        });

        // Wire dynamic Key→Prog and Advanced→Prog relationships.
        this.wireControllers();
    }

    // ------------------------------------------------------------------ //

    private renderArg(parent: HTMLElement, arg: ConfigurationSchemaArg, index: number): void {
        if (arg.uiComponentType === 'checkbox') {
            this.renderCheckbox(parent, arg);
        } else if (arg.uiComponentType === 'layer_list') {
            this.renderLayerList(parent, arg, index);
        } else if (arg.uiComponentType === 'toggle_button_selector') {
            const keyType = this.getKeyTypeForArg(arg);
            this.renderToggleButtons(parent, arg, index, keyType, false);
        } else if (arg.type === 'enum') {
            this.renderEnumSelector(parent, arg, index);
        }
    }

    private renderLayerList(parent: HTMLElement, arg: ConfigurationSchemaArg, index: number): void {
        this.layerListContainers.set(index, parent);
        createLayerListInput(parent, arg, [], () => this.notifyChange());
    }

    private renderCheckbox(parent: HTMLElement, arg: ConfigurationSchemaArg): void {
        const cbLabel = document.createElement('label');
        cbLabel.classList.add('checkbox', 'is-size-7');

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.dataset.argName = arg.name;
        if (arg.controlsArgName) cb.dataset.controlsArgName = arg.controlsArgName;

        cbLabel.appendChild(cb);
        cbLabel.append(` ${arg.name}`);
        parent.appendChild(cbLabel);
        // No argValues entry — checkbox is purely UI state.
    }

    private renderEnumSelector(parent: HTMLElement, arg: ConfigurationSchemaArg, index: number): void {
        const selectContainer = document.createElement('div');
        // is-fullwidth prevents the arrow from overlapping the selected text.
        selectContainer.classList.add('select', 'is-small', 'is-fullwidth');

        const select = document.createElement('select');
        select.dataset.argName = arg.name;

        const options = arg.enum ?? [];
        options.forEach(optionValue => {
            const option = document.createElement('option');
            option.value = optionValue;
            option.text = optionValue;
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            this.argValues.set(index, select.value);
            this.notifyChange();
        });

        if (options.length > 0) {
            select.value = options[0];
            this.argValues.set(index, options[0]);
        }

        selectContainer.appendChild(select);
        parent.appendChild(selectContainer);
    }

    private renderToggleButtons(
        parent: HTMLElement,
        arg: ConfigurationSchemaArg,
        index: number,
        keyType: string,
        showAdvanced: boolean
    ): void {
        if (!this.argValues.has(index)) {
            this.argValues.set(index, []);
        }
        const currentSelection = new Set(this.argValues.get(index) as string[]);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.flexWrap = 'wrap';
        buttonsDiv.style.gap = '3px';

        const data = arg.uiComponentData ?? {};
        const basicLabels: string[] =
            keyType === 'Minor' && data.minorButtonLabels
                ? data.minorButtonLabels
                : (data.buttonLabels ?? []);
        const advancedLabels: string[] =
            keyType === 'Minor' && data.minorAdvancedButtonLabels
                ? data.minorAdvancedButtonLabels
                : (data.advancedButtonLabels ?? []);

        const makeBtn = (label: string, isAdvanced: boolean): void => {
            const btn = document.createElement('button');
            btn.classList.add('button', 'is-small', 'is-outlined');
            btn.innerText = label;
            btn.dataset.value = label;

            if (isAdvanced) {
                btn.classList.add('is-advanced-btn');
                if (!showAdvanced) btn.style.display = 'none';
            }
            if (currentSelection.has(label)) btn.classList.add('is-info');

            btn.addEventListener('click', () => {
                btn.classList.toggle('is-info');
                const arr = (this.argValues.get(index) as string[]) ?? [];
                const pos = arr.indexOf(label);
                if (btn.classList.contains('is-info')) {
                    if (pos === -1) arr.push(label);
                } else {
                    if (pos !== -1) arr.splice(pos, 1);
                }
                this.argValues.set(index, arr);
                this.notifyChange();
            });

            buttonsDiv.appendChild(btn);
        };

        basicLabels.forEach(l => makeBtn(l, false));
        advancedLabels.forEach(l => makeBtn(l, true));

        parent.appendChild(buttonsDiv);
    }

    // ------------------------------------------------------------------ //

    /** Returns the current key type value for any enum arg that controls `arg`. */
    private getKeyTypeForArg(arg: ConfigurationSchemaArg): string {
        if (typeof this.schema === 'string') return 'Major';
        const schema = this.schema;
        const controller = schema.args.find(a => a.controlsArgName === arg.name && a.type === 'enum');
        if (!controller) return 'Major';
        const idx = schema.args.indexOf(controller);
        return (this.argValues.get(idx) as string) ?? 'Major';
    }

    /** Rebuilds the toggle button set for an arg after Key or Advanced changes. */
    private rebuildToggleButtons(arg: ConfigurationSchemaArg, index: number, keyType: string, showAdvanced: boolean): void {
        // Clear previous selection when key type changes
        const field = this.container.querySelector<HTMLElement>(`[data-arg-name="${arg.name}"] .control`);
        if (!field) return;
        field.innerHTML = '';
        // Reset selection so stale numerals from the old key don't carry over.
        this.argValues.set(index, []);
        this.renderToggleButtons(field, arg, index, keyType, showAdvanced);
    }

    /** Wires controlsArgName relationships after the DOM is built. */
    private wireControllers(): void {
        if (typeof this.schema === 'string') return;
        const schema = this.schema;

        schema.args.forEach(arg => {
            if (!arg.controlsArgName) return;

            const controlledArg = schema.args.find(a => a.name === arg.controlsArgName);
            if (!controlledArg) return;
            const controlledIndex = schema.args.indexOf(controlledArg);

            if (arg.uiComponentType === 'checkbox') {
                // Advanced checkbox → show/hide advanced buttons
                const cb = this.container.querySelector<HTMLInputElement>(
                    `input[type="checkbox"][data-arg-name="${arg.name}"]`
                );
                if (!cb) return;

                cb.addEventListener('change', () => {
                    const advBtns = this.container.querySelectorAll<HTMLElement>(
                        `[data-arg-name="${arg.controlsArgName}"] .is-advanced-btn`
                    );
                    advBtns.forEach(btn => {
                        btn.style.display = cb.checked ? '' : 'none';
                        if (!cb.checked) {
                            btn.classList.remove('is-info');
                            // Remove from selection
                            const arr = (this.argValues.get(controlledIndex) as string[]) ?? [];
                            const label = (btn as HTMLButtonElement).dataset.value ?? '';
                            const pos = arr.indexOf(label);
                            if (pos !== -1) arr.splice(pos, 1);
                            this.argValues.set(controlledIndex, arr);
                        }
                    });
                    this.notifyChange();
                });

            } else if (arg.type === 'enum') {
                // Key dropdown → rebuild Prog toggle buttons
                const select = this.container.querySelector<HTMLSelectElement>(
                    `select[data-arg-name="${arg.name}"]`
                );
                if (!select) return;

                select.addEventListener('change', () => {
                    // Find whether the Advanced checkbox (if any) is currently checked.
                    const advCb = this.container.querySelector<HTMLInputElement>(
                        `input[type="checkbox"][data-controls-arg-name="${arg.controlsArgName}"]`
                    );
                    const showAdvanced = advCb?.checked ?? false;
                    this.rebuildToggleButtons(controlledArg, controlledIndex, select.value, showAdvanced);
                    this.notifyChange();
                });
            }
        });
    }
}

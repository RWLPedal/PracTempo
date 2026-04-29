import { View } from "../view";
import { AppSettings } from "../settings";
import { getCategory } from "../feature_registry";
import { Feature, FeatureTypeDescriptor } from "../feature";
import { ConfigView } from "./config_view";
import { AudioController } from "../audio_controller";
import { GuitarIntervalSettings } from "../guitar/guitar_interval_settings";
import { getDriveTargetSlots } from "../floating_views/drive_registry";
import { DriveSignal } from "../floating_views/link_types";

export class ConfigurableFeatureView implements View {
    private appSettings: AppSettings;
    private featureTypeName: string;
    private initialConfig: string[] | undefined;
    private feature: Feature | null = null;

    private container: HTMLElement | null = null;
    private configContainer!: HTMLElement;
    private featureContainer!: HTMLElement;

    private featureClass: FeatureTypeDescriptor | null = null;
    private audioController: AudioController;

    // Exposed for signal handling
    private configView: ConfigView | null = null;
    // Last received driven values per argName (used to substitute __driven__ sentinel)
    private drivenValues = new Map<string, string>();
    // When true, createAndRenderFeature emits feature-state-drive instead of feature-state-changed
    private isDrivenUpdate = false;

    constructor(initialState: any, appSettings: AppSettings) {
        this.appSettings = appSettings;
        this.featureTypeName = initialState?.featureTypeName;
        this.initialConfig = Array.isArray(initialState?.config) ? initialState.config : undefined;

        // A better solution for audio would be needed in a real app
        this.audioController = new AudioController(null, null, null, null);
    }

    render(container: HTMLElement): void {
        if (!this.featureTypeName) {
            container.innerHTML = "Error: featureTypeName not provided to ConfigurableFeatureView.";
            return;
        }

        this.container = container;
        this.container.innerHTML = '';

        this.configContainer = document.createElement('div');
        this.configContainer.classList.add('config-compact');
        this.featureContainer = document.createElement('div');

        this.container.appendChild(this.configContainer);
        this.container.appendChild(this.featureContainer);

        const guitarCategory = getCategory('Guitar'); // Assuming Guitar for now
        if (!guitarCategory) {
            this.container.innerHTML = 'Error: Guitar category not found';
            return;
        }

        const FeatureClass = guitarCategory.getFeatureTypes().get(this.featureTypeName);
        if (!FeatureClass) {
            this.container.innerHTML = `Error: Feature '${this.featureTypeName}' not found in category.`;
            return;
        }
        this.featureClass = FeatureClass;

        const schema = this.featureClass.getConfigurationSchema();

        this.configView = new ConfigView(schema, this.configContainer, (config) => {
            this.createAndRenderFeature(config);
        });

        this.configView.render();

        if (this.initialConfig?.length) {
            // Restore saved config — setConfig fires the callback which creates the feature.
            this.configView.setConfig(this.initialConfig);
        } else {
            this.createAndRenderFeature(this.configView.currentConfig);
        }

        // React to incoming link notifications — show/hide "Driven" options
        container.addEventListener('link-status-changed', (e: Event) => {
            const { hasIncomingLinks } = (e as CustomEvent<{ hasIncomingLinks: boolean }>).detail;
            const slots = getDriveTargetSlots(this.featureTypeName);
            for (const slot of slots) {
                if (slot.transparent) continue; // transparent slots update silently, no UI affordance
                this.configView?.setDrivenVisible(slot.argName, hasIncomingLinks);
                // Auto-select "Driven" for simple select args (not layer_list) when a link arrives.
                // selectDriven no-ops if the arg isn't a select or is already driven.
                if (hasIncomingLinks) {
                    this.configView?.selectDriven(slot.argName);
                }
            }
        });

        // React to incoming drive signals
        container.addEventListener('drive-signal', (e: Event) => {
            const detail = (e as CustomEvent<{ signal: DriveSignal; linkId: string }>).detail;
            const { signal } = detail;
            const slots = getDriveTargetSlots(this.featureTypeName);
            let needsRebuild = false;

            for (const slot of slots) {
                if (!slot.acceptedKinds.includes(signal.kind)) continue;
                const value = slot.resolveValue(signal);
                if (value === null) continue;

                if (slot.transparent) {
                    // Transparent slots update the toggle UI directly without __driven__ sentinel.
                    const changed = this.configView?.setTransparentValue(slot.argName, [value]);
                    if (changed) needsRebuild = true;
                } else {
                    // Standard driven: skip rebuild if the value hasn't changed.
                    if (this.drivenValues.get(slot.argName) === value) continue;
                    needsRebuild = true;
                    this.drivenValues.set(slot.argName, value);
                    this.configView?.applyDrivenValue(slot.argName, value);
                }
            }

            if (needsRebuild) {
                const currentConfig = this.configView?.currentConfig ?? [];
                this.isDrivenUpdate = true;
                this.createAndRenderFeature(currentConfig);
                this.isDrivenUpdate = false;
            }

            // Forward to featureContainer so features that self-handle drive signals
            // (e.g. MultiSelectFretboardFeature) can receive the event — the event was
            // dispatched on this container (parent) and does not bubble down into children.
            this.featureContainer?.dispatchEvent(new CustomEvent('drive-signal', {
                bubbles: false,
                detail,
            }));
        });
    }

    private buildDrivenConfig(rawConfig: (string | null)[]): string[] {
        // Build position → argName map from the schema so each __driven__ slot gets
        // the correct driven value instead of always resolving to the first slot's value.
        const schema = this.featureClass?.getConfigurationSchema() as any;
        const schemaArgs: any[] = schema?.args ?? [];
        const posToArgName: string[] = [];
        let pos = 0;
        for (const arg of schemaArgs) {
            if (arg.isVariadic) {
                for (let i = pos; i < rawConfig.length; i++) posToArgName[i] = arg.name;
                break;
            } else {
                posToArgName[pos++] = arg.name;
            }
        }
        return rawConfig.map((v, i) => {
            if (v !== '__driven__') return v;
            const argName = posToArgName[i];
            const driven = argName !== undefined ? this.drivenValues.get(argName) : undefined;
            return driven !== undefined ? driven : null;
        }).filter(v => v !== null) as string[];
    }

    private createAndRenderFeature(config: (string | null)[]) {
        if (!this.featureClass) return;

        // Substitute __driven__ sentinel with the last known driven value
        const finalConfig = this.isDrivenUpdate
            ? this.buildDrivenConfig(config)
            : config.filter(c => c !== null && c !== '__driven__') as string[];

        // A bit of a hack: some features expect a minimum number of args.
        // We check the schema for required args to guess.
        const requiredArgs = (typeof this.featureClass.getConfigurationSchema() !== 'string')
            ? (this.featureClass.getConfigurationSchema() as any).args.filter((a: any) => a.required).length
            : 0;

        if (finalConfig.length < requiredArgs) {
            return; // Not enough config to create feature yet
        }

        // Clean up previous feature
        this.feature?.destroy?.();
        this.featureContainer.innerHTML = '';

        const maxCanvasHeight = 600;

        try {
            const intervalSettings = new GuitarIntervalSettings(); // Placeholder
            this.feature = this.featureClass.createFeature(
                finalConfig,
                this.audioController,
                this.appSettings,
                intervalSettings,
                maxCanvasHeight,
                'Guitar'
            );

            this.feature.render(this.featureContainer);
            this.feature.views?.forEach(view => view.render(this.featureContainer));

            // Notify the FloatingViewWrapper of the current feature title
            const mainTitleEl = this.featureContainer.querySelector<HTMLElement>('.feature-main-title');
            if (mainTitleEl?.textContent) {
                this.featureContainer.dispatchEvent(new CustomEvent<{ title: string }>('feature-title-changed', {
                    bubbles: true,
                    detail: { title: mainTitleEl.textContent },
                }));
            }

            // Persist current config (skip during driven real-time updates to avoid flooding localStorage)
            const eventName = this.isDrivenUpdate ? 'feature-state-drive' : 'feature-state-changed';
            this.featureContainer.dispatchEvent(new CustomEvent(eventName, {
                bubbles: true,
                detail: { featureTypeName: this.featureTypeName, config: finalConfig },
            }));
        } catch (error) {
            this.featureContainer.innerHTML = `<p>Error creating feature: ${error instanceof Error ? error.message : String(error)}</p>`;
            console.error(error);
        }
    }
    
    destroy(): void {
        this.feature?.destroy?.();
        if (this.container) {
          this.container.innerHTML = "";
        }
        this.container = null;
    }

    start(): void {
        this.feature?.start?.();
    }

    stop(): void {
        this.feature?.stop?.();
    }
    
}

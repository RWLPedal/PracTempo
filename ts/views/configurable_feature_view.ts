import { View } from "../view";
import { AppSettings } from "../settings";
import { getCategory } from "../feature_registry";
import { Feature, FeatureTypeDescriptor } from "../feature";
import { ConfigView } from "./config_view";
import { AudioController } from "../audio_controller";
import { GuitarIntervalSettings } from "../guitar/guitar_interval_settings";

export class ConfigurableFeatureView implements View {
    private appSettings: AppSettings;
    private featureTypeName: string;
    private initialConfig: string[] | undefined;
    private feature: Feature | null = null;

    private container: HTMLElement | null = null;
    private configContainer: HTMLElement;
    private featureContainer: HTMLElement;

    private featureClass: FeatureTypeDescriptor | null = null;
    private audioController: AudioController; // Dummy audio controller.

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

        const configView = new ConfigView(schema, this.configContainer, (config) => {
            this.createAndRenderFeature(config);
        });

        configView.render();

        if (this.initialConfig?.length) {
            // Restore saved config — setConfig fires the callback which creates the feature.
            configView.setConfig(this.initialConfig);
        } else {
            this.createAndRenderFeature(configView['currentConfig']);
        }
    }

    private createAndRenderFeature(config: (string | null)[]) {
        if (!this.featureClass) return;

        // Filter out null values which mean the config is not yet set for that arg
        const finalConfig = config.filter(c => c !== null) as string[];

        // A bit of a hack: some features expect a minimum number of args.
        // We check the schema for required args to guess.
        const requiredArgs = (typeof this.featureClass.getConfigurationSchema() !== 'string')
            ? (this.featureClass.getConfigurationSchema() as any).args.filter(a => a.required).length
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

            // Persist current config into the wrapper's saved state
            this.featureContainer.dispatchEvent(new CustomEvent('feature-state-changed', {
                bubbles: true,
                detail: { featureTypeName: this.featureTypeName, config: finalConfig },
            }));
        } catch (error) {
            this.featureContainer.innerHTML = `<p>Error creating feature: ${error.message}</p>`;
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

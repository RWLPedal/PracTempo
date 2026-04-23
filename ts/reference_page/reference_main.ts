import { SidebarView } from "./sidebar_view";
import { FloatingViewManager } from '../floating_views/floating_view_manager';
import { AppSettings, loadSettings, SETTINGS_STORAGE_KEY } from "../settings";
import { registerCategory, getCategory } from "../feature_registry";
import { GuitarCategory } from "../guitar/guitar_category";
import { SettingsManager } from "../settings_manager";
import { registerFloatingView } from '../floating_views/floating_view_registry';
import { TimerView } from '../views/timer_view';
import { DrumMachineView } from '../views/drum_machine_view';

class ReferencePage {
    private floatingViewManager: FloatingViewManager;
    private settings: AppSettings;
    private settingsManager: SettingsManager;
    private sidebarView: SidebarView | null = null;

    constructor() {
        registerCategory(new GuitarCategory());

        // Register standalone timer floating view (no schedule callbacks → standalone mode)
        registerFloatingView({
            viewId: "floating_timer",
            displayName: "Timer",
            categoryName: "General",
            defaultWidth: 300,
            defaultHeight: 150,
            createView: (initialState?: any) => new TimerView(initialState?.duration ?? 300),
        });

        // Register drum machine floating view
        registerFloatingView({
            viewId: "drum_machine",
            displayName: "Drum Machine",
            categoryName: "General",
            defaultWidth: 560,
            defaultHeight: 300,
            createView: (initialState?: any) => new DrumMachineView(initialState),
        });

        this.settings = loadSettings();

        this.floatingViewManager = new FloatingViewManager(this.settings, 'floatingViewStates_reference');
        this.settingsManager = new SettingsManager(this.settings, 'reference', (newSettings) => {
            this.saveSettings(newSettings);
            this.applySettings();
        });

        const sidebarContainer = document.getElementById('side-bar');
        if (sidebarContainer) {
            this.sidebarView = new SidebarView(
                sidebarContainer,
                (viewId, featureTypeName) => this.handleFeatureClick(viewId, featureTypeName),
                this.floatingViewManager,
                this.settings
            );
        }

        // Settings button is re-rendered inside sidebar on each refresh, so wire it up after render.
        this._wireSettingsButton();

        this.floatingViewManager.restoreViewsFromState();
        this.applySettings();
    }

    private _wireSettingsButton(): void {
        const settingsButton = document.getElementById('settings-button');
        if (settingsButton) {
            settingsButton.onclick = () => this.settingsManager.open();
        }
    }

    private handleFeatureClick(viewId: string, featureTypeName?: string): void {
        const guitarCategory = getCategory('Guitar');
        const featureDescriptor = featureTypeName ? guitarCategory?.getFeatureTypes().get(featureTypeName) : undefined;
        const title = featureTypeName
            ? (featureDescriptor?.displayName ?? featureTypeName)
            : undefined;

        const viewState = {
            featureTypeName: featureTypeName
        };
        this.floatingViewManager.spawnView(viewId, { viewState: viewState, title: title });
    }

    private saveSettings(newSettings: AppSettings): void {
        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
            this.settings = newSettings;
            if (this.floatingViewManager) {
                this.floatingViewManager.applySettingsChange(newSettings);
            }
            // Refresh sidebar so instrument-dependent buttons update.
            if (this.sidebarView) {
                this.sidebarView.refresh(newSettings);
                this._wireSettingsButton();
            }
        } catch (e) {
            console.error("Failed to save settings to localStorage:", e);
            alert("Error saving settings.");
        }
    }

    private applySettings(): void {
        if (this.settings.theme === "dark") {
            document.body.classList.add("dark-theme");
        } else {
            document.body.classList.remove("dark-theme");
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ReferencePage();
});

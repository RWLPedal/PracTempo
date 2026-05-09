import { SidebarView } from "./sidebar_view";
import { FloatingViewManager } from '../floating_views/floating_view_manager';
import { AppSettings, loadSettings, SETTINGS_STORAGE_KEY } from "../settings";
import { ThemeManager, Theme } from "../theme_manager";
import { getCategory } from "../feature_registry";
import { SettingsManager } from "../settings_manager";
import { registerFloatingView } from '../floating_views/floating_view_registry';
import { BackingTrackView } from '../views/backing_track_view';
import { CapoView } from '../views/capo_view';
import { LinkManager } from '../floating_views/link_manager';
import '../floating_views/drive_slots'; // registers all drive sources/targets as a side effect
import { registerBuiltins } from '../app_bootstrap';
import { setFloatingViewGridSize } from '../floating_views/floating_view_wrapper';

class ReferencePage {
    private floatingViewManager: FloatingViewManager;
    private settings: AppSettings;
    private settingsManager: SettingsManager;
    private sidebarView: SidebarView | null = null;
    private themeManager: ThemeManager;

    constructor() {
        registerBuiltins();

        // Register backing track floating view
        registerFloatingView({
            viewId: "drum_machine",
            displayName: "Backing Track",
            categoryName: "General",
            defaultWidth: 585,
            defaultHeight: 300,
            createView: (initialState?: any) => new BackingTrackView(initialState),
        });

        registerFloatingView({
            viewId: "capo_view",
            displayName: "Capo",
            categoryName: "General",
            defaultWidth: 280,
            defaultHeight: 350,
            createView: (initialState?: any) => new CapoView(this.settings),
        });

        this.settings = loadSettings();
        this.themeManager = new ThemeManager(this.settings.theme);

        this.floatingViewManager = new FloatingViewManager(this.settings, 'floatingViewStates_reference');

        // Wire up the link/drive system
        const viewAreaEl = document.getElementById('floating-view-area');
        if (viewAreaEl) {
            const linkManager = new LinkManager(
                viewAreaEl,
                (id) => this.floatingViewManager.getWrapperElement(id),
                (id) => this.floatingViewManager.getViewId(id),
                (id) => this.floatingViewManager.getContentElement(id),
                (id) => this.floatingViewManager.getFeatureTypeName(id)
            );
            this.floatingViewManager.setLinkManager(linkManager);
        }

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
                this.settings,
                (theme) => this.handleThemeChange(theme)
            );
        }

        // Settings button is re-rendered inside sidebar on each refresh, so wire it up after render.
        this._wireSettingsButton();

        this.applySettings();
        this.floatingViewManager.restoreViewsFromState();
    }

    private _wireSettingsButton(): void {
        const settingsButton = document.getElementById('settings-button');
        if (settingsButton) {
            settingsButton.onclick = () => this.settingsManager.open();
        }
    }

    private handleFeatureClick(viewId: string, featureTypeName?: string): void {
        const guitarCategory = getCategory('Instrument');
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
            this.themeManager.apply(newSettings.theme);
            this.settingsManager?.updateSettings(newSettings);
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

    private handleThemeChange(theme: Theme): void {
        const newSettings = { ...this.settings, theme };
        this.saveSettings(newSettings);
        this.applySettings();
    }

    private applySettings(): void {
        this.themeManager.apply(this.settings.theme);
        this._applyGrid();
    }

    private _applyGrid(): void {
        const viewAreaEl = document.getElementById('floating-view-area');
        if (!viewAreaEl) return;
        const enabled = !!this.settings.showGrid;
        viewAreaEl.classList.toggle('grid-active', enabled);
        setFloatingViewGridSize(enabled ? 12 : null);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ReferencePage();
});

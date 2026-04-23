import { FloatingViewManager } from '../floating_views/floating_view_manager';
import { VolumeControl } from '../views/volume_control';
import { AppSettings, getCategorySettings } from '../settings';
import { GuitarSettings } from '../guitar/guitar_settings';

interface FeatureButton {
    id: string;
    icon: string;
    label: string;
    viewId: string;
    featureTypeName?: string;
    /** If set, button is only shown when the active instrument is in this list. */
    requiredInstruments?: string[];
}

const FEATURE_BUTTONS: FeatureButton[] = [
    { id: 'notes-feature',             icon: 'piano',      label: 'Notes',       viewId: 'configurable_guitar_feature', featureTypeName: 'Notes' },
    { id: 'scales-feature',            icon: 'music_note', label: 'Scales',      viewId: 'configurable_guitar_feature', featureTypeName: 'Scale' },
    { id: 'chords-feature',            icon: 'grid_on',    label: 'Chords',      viewId: 'configurable_guitar_feature', featureTypeName: 'Chord',            requiredInstruments: ['Guitar', 'Ukulele'] },
    { id: 'triads-feature',            icon: 'looks_3',    label: 'Triads',      viewId: 'configurable_guitar_feature', featureTypeName: 'Triad Shapes',     requiredInstruments: ['Guitar'] },
    { id: 'chord-progression-feature', icon: '123',        label: 'Progression', viewId: 'guitar_chord_progression',                                         requiredInstruments: ['Guitar'] },
    { id: 'caged-feature',             icon: 'grid_view',  label: 'CAGED',       viewId: 'configurable_guitar_feature', featureTypeName: 'CAGED',            requiredInstruments: ['Guitar'] },
    { id: 'multifret-feature',         icon: 'layers',     label: 'MultiFret',   viewId: 'configurable_guitar_feature', featureTypeName: 'MultiSelectFretboard' },
    { id: 'metronome-feature',         icon: 'timer',      label: 'Metronome',   viewId: 'guitar_floating_metronome' },
    { id: 'legend-feature',            icon: 'palette',    label: 'Legend',      viewId: 'guitar_color_legend' },
    { id: 'timer-feature',             icon: 'alarm',      label: 'Timer',       viewId: 'floating_timer' },
    { id: 'drum-machine-feature',      icon: 'music_note', label: 'Drums',       viewId: 'drum_machine' },
];

export class SidebarView {
    private container: HTMLElement;

    constructor(
        container: HTMLElement,
        private onFeatureClick: (viewId: string, featureTypeName?: string) => void,
        private floatingViewManager?: FloatingViewManager,
        private appSettings?: AppSettings
    ) {
        this.container = container;
        this.render();
        this.addBottomBarListeners();
    }

    /** Re-render the sidebar with updated settings (e.g. after instrument change). */
    public refresh(newSettings: AppSettings): void {
        this.appSettings = newSettings;
        this.render();
        this.addBottomBarListeners();
    }

    private getActiveInstrument(): string {
        if (!this.appSettings) return 'Guitar';
        return getCategorySettings<GuitarSettings>(this.appSettings, 'Guitar')?.instrument ?? 'Guitar';
    }

    private render(): void {
        const instrument = this.getActiveInstrument();
        const visibleButtons = FEATURE_BUTTONS.filter(
            (b) => !b.requiredInstruments || b.requiredInstruments.includes(instrument)
        );

        let buttonsHtml = '<div class="sidebar-content"><div class="buttons is-vertical">';
        for (const button of visibleButtons) {
            buttonsHtml += `
                <button id="${button.id}" class="button is-link is-light is-fullwidth" title="${button.label}" data-view-id="${button.viewId}" data-feature-type-name="${button.featureTypeName || ''}">
                    <span class="icon">
                        <i class="material-icons">${button.icon}</i>
                    </span>
                    <span>${button.label}</span>
                </button>
            `;
        }
        buttonsHtml += `</div>
            <div class="sidebar-bottom-bar">
                <button id="save-layout-button" class="topbar-icon-button" title="Save window layout to file">
                    <span class="material-icons">save</span>
                </button>
                <button id="load-layout-button" class="topbar-icon-button" title="Load window layout from file">
                    <span class="material-icons">folder_open</span>
                </button>
                <div id="sidebar-volume-ctrl"></div>
                <button id="settings-button" class="topbar-icon-button" title="Settings">
                    <span class="material-icons">settings</span>
                </button>
            </div>
        </div>`;

        this.container.innerHTML = buttonsHtml;

        for (const button of visibleButtons) {
            const buttonEl = document.getElementById(button.id);
            if (buttonEl) {
                buttonEl.addEventListener('click', (e) => {
                    const target = e.currentTarget as HTMLElement;
                    const viewId = target.dataset.viewId;
                    const featureTypeName = target.dataset.featureTypeName;
                    if (viewId) {
                        this.onFeatureClick(viewId, featureTypeName || undefined);
                    }
                });
            }
        }
    }

    private addBottomBarListeners(): void {
        const volSlot = document.getElementById('sidebar-volume-ctrl');
        if (volSlot) {
            volSlot.appendChild(new VolumeControl().el);
        }

        if (this.floatingViewManager) {
            const manager = this.floatingViewManager;

            const saveBtn = document.getElementById('save-layout-button');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    const json = manager.exportStateJson();
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'reference-layout.json';
                    a.click();
                    URL.revokeObjectURL(url);
                });
            }

            const loadBtn = document.getElementById('load-layout-button');
            if (loadBtn) {
                loadBtn.addEventListener('click', () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json,application/json';
                    input.addEventListener('change', () => {
                        const file = input.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const json = e.target?.result as string;
                                manager.importStateJson(json);
                            } catch (err) {
                                console.error('Failed to load layout file:', err);
                                alert('Could not load layout: the file may be invalid.');
                            }
                        };
                        reader.readAsText(file);
                    });
                    input.click();
                });
            }
        }
    }
}

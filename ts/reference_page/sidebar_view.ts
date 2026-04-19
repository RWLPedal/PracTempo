import { FloatingViewManager } from '../floating_views/floating_view_manager';
import { VolumeControl } from '../views/volume_control';

export class SidebarView {
    constructor(
        container: HTMLElement,
        private onFeatureClick: (viewId: string, featureTypeName?: string) => void,
        private floatingViewManager?: FloatingViewManager
    ) {
        this.render(container);
        this.addBottomBarListeners();
    }

    private render(container: HTMLElement): void {
        const featureButtons = [
            { id: 'notes-feature', icon: 'piano', label: 'Notes', viewId: 'configurable_guitar_feature', featureTypeName: 'Notes' },
            { id: 'scales-feature', icon: 'music_note', label: 'Scales', viewId: 'configurable_guitar_feature', featureTypeName: 'Scale' },
            { id: 'chords-feature', icon: 'grid_on', label: 'Chords', viewId: 'configurable_guitar_feature', featureTypeName: 'Chord' },
            { id: 'triads-feature', icon: 'looks_3', label: 'Triads', viewId: 'configurable_guitar_feature', featureTypeName: 'Triad Shapes' },
            { id: 'chord-progression-feature', icon: '123', label: 'Progression', viewId: 'guitar_chord_progression' },
            { id: 'caged-feature', icon: 'grid_view', label: 'CAGED', viewId: 'configurable_guitar_feature', featureTypeName: 'CAGED' },
            { id: 'multifret-feature', icon: 'layers', label: 'MultiFret', viewId: 'configurable_guitar_feature', featureTypeName: 'MultiSelectFretboard' },
            { id: 'metronome-feature', icon: 'timer', label: 'Metronome', viewId: 'guitar_floating_metronome' },
            { id: 'legend-feature', icon: 'palette', label: 'Legend', viewId: 'guitar_color_legend' },
            { id: 'timer-feature', icon: 'alarm', label: 'Timer', viewId: 'floating_timer' },
            { id: 'drum-machine-feature', icon: 'music_note', label: 'Drums', viewId: 'drum_machine' },
        ];

        let buttonsHtml = '<div class="sidebar-content"><div class="buttons is-vertical">';
        for (const button of featureButtons) {
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

        container.innerHTML = buttonsHtml;

        for (const button of featureButtons) {
            const buttonEl = document.getElementById(button.id);
            if (buttonEl) {
                buttonEl.addEventListener('click', (e) => {
                    const target = e.currentTarget as HTMLElement;
                    const viewId = target.dataset.viewId;
                    const featureTypeName = target.dataset.featureTypeName;
                    if (viewId) {
                        this.onFeatureClick(viewId, featureTypeName);
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

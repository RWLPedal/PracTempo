import { FloatingViewManager } from '../floating_views/floating_view_manager';
import { VolumeControl } from '../views/volume_control';
import { AppSettings, getCategorySettings } from '../settings';
import { GuitarSettings } from '../guitar/guitar_settings';

type Theme = 'warm' | 'dark' | 'forest';

interface NavButton {
    id: string;
    icon: string;
    label: string;
    viewId: string;
    featureTypeName?: string;
    requiredInstruments?: string[];
}

interface NavSection {
    label: string;
    buttons: NavButton[];
}

const NAV_SECTIONS: NavSection[] = [
    {
        label: 'Reference',
        buttons: [
            { id: 'notes-feature',             icon: 'music_note',      label: 'Notes',        viewId: 'configurable_guitar_feature', featureTypeName: 'Notes' },
            { id: 'scales-feature',            icon: 'show_chart',      label: 'Scales',       viewId: 'configurable_guitar_feature', featureTypeName: 'Scale' },
            { id: 'chords-feature',            icon: 'grid_on',         label: 'Chords',       viewId: 'configurable_guitar_feature', featureTypeName: 'Chord',           requiredInstruments: ['Guitar', 'Ukulele', 'Mandolin', 'Mandola'] },
            { id: 'triads-feature',            icon: 'change_history',  label: 'Triads',       viewId: 'configurable_guitar_feature', featureTypeName: 'Triad Shapes',    requiredInstruments: ['Guitar'] },
            { id: 'chord-progression-feature', icon: 'arrow_forward',   label: 'Progression',  viewId: 'guitar_chord_progression',                                        requiredInstruments: ['Guitar', 'Mandolin', 'Mandola'] },
            { id: 'caged-feature',             icon: 'grid_view',       label: 'CAGED',        viewId: 'configurable_guitar_feature', featureTypeName: 'CAGED',           requiredInstruments: ['Guitar'] },
            { id: 'multifret-feature',         icon: 'layers',          label: 'MultiFret',    viewId: 'configurable_guitar_feature', featureTypeName: 'MultiSelectFretboard' },
        ],
    },
    {
        label: 'Practice',
        buttons: [
            { id: 'metronome-feature',    icon: 'timer',       label: 'Metronome',     viewId: 'guitar_floating_metronome' },
            { id: 'timer-feature',        icon: 'alarm',       label: 'Timer',         viewId: 'floating_timer' },
            { id: 'drum-machine-feature', icon: 'queue_music', label: 'Backing Track', viewId: 'drum_machine' },
        ],
    },
    {
        label: 'Tools',
        buttons: [
            { id: 'legend-feature', icon: 'palette', label: 'Legend', viewId: 'guitar_color_legend' },
        ],
    },
];

export class SidebarView {
    private container: HTMLElement;
    private isCollapsed = false;

    constructor(
        container: HTMLElement,
        private onFeatureClick: (viewId: string, featureTypeName?: string) => void,
        private floatingViewManager?: FloatingViewManager,
        private appSettings?: AppSettings,
        private onThemeChange?: (theme: Theme) => void
    ) {
        this.container = container;
        this.render();
        this.addBottomBarListeners();
    }

    public refresh(newSettings: AppSettings): void {
        this.appSettings = newSettings;
        this.render();
        this.addBottomBarListeners();
    }

    private getActiveInstrument(): string {
        if (!this.appSettings) return 'Guitar';
        return getCategorySettings<GuitarSettings>(this.appSettings, 'Guitar')?.instrument ?? 'Guitar';
    }

    private getCurrentTheme(): Theme {
        return (this.appSettings?.theme as Theme) ?? 'warm';
    }

    private render(): void {
        const instrument = this.getActiveInstrument();
        const currentTheme = this.getCurrentTheme();

        let html = `
            <div class="sidebar-header">
                <span class="material-icons sidebar-app-icon">music_note</span>
                <span class="sidebar-app-name">PracTempo</span>
            </div>
            <nav class="sidebar-nav">
        `;

        for (const section of NAV_SECTIONS) {
            const visibleButtons = section.buttons.filter(
                (b) => !b.requiredInstruments || b.requiredInstruments.includes(instrument)
            );
            if (visibleButtons.length === 0) continue;

            html += `<div class="sidebar-section-label">${section.label}</div>`;
            for (const btn of visibleButtons) {
                html += `
                    <button id="${btn.id}" class="sidebar-nav-btn"
                        data-view-id="${btn.viewId}"
                        data-feature-type-name="${btn.featureTypeName ?? ''}">
                        <span class="material-icons">${btn.icon}</span>
                        <span>${btn.label}</span>
                    </button>
                `;
            }
        }

        html += `</nav>`;

        const themes: { key: Theme; title: string }[] = [
            { key: 'warm',   title: 'Warm'   },
            { key: 'dark',   title: 'Dark'   },
            { key: 'forest', title: 'Forest' },
        ];
        const swatchesHtml = themes.map(t =>
            `<button class="theme-swatch theme-swatch--${t.key}${currentTheme === t.key ? ' is-active' : ''}"
                data-theme="${t.key}" title="${t.title}"></button>`
        ).join('');

        const collapseIcon = this.isCollapsed ? 'chevron_right' : 'chevron_left';
        const collapseTitle = this.isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
        html += `
            <div class="sidebar-footer">
                <div class="sidebar-theme-picker">
                    <span class="sidebar-theme-label">Theme</span>
                    ${swatchesHtml}
                </div>
                <div class="sidebar-tools-bar">
                    <button id="sidebar-collapse-btn" class="topbar-icon-button" title="${collapseTitle}">
                        <span class="material-icons">${collapseIcon}</span>
                    </button>
                    <button id="save-layout-button" class="topbar-icon-button" title="Save window layout">
                        <span class="material-icons">save</span>
                    </button>
                    <button id="load-layout-button" class="topbar-icon-button" title="Load window layout">
                        <span class="material-icons">folder_open</span>
                    </button>
                    <div id="sidebar-volume-ctrl"></div>
                    <button id="settings-button" class="topbar-icon-button" title="Settings">
                        <span class="material-icons">settings</span>
                    </button>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.applyCollapsedState();

        // Wire collapse toggle
        const collapseBtn = document.getElementById('sidebar-collapse-btn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                this.isCollapsed = !this.isCollapsed;
                this.applyCollapsedState();
                const icon = collapseBtn.querySelector<HTMLElement>('.material-icons');
                if (icon) icon.textContent = this.isCollapsed ? 'chevron_right' : 'chevron_left';
                collapseBtn.title = this.isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
            });
        }

        // Wire nav buttons
        for (const section of NAV_SECTIONS) {
            for (const btn of section.buttons) {
                const el = document.getElementById(btn.id);
                if (el) {
                    el.addEventListener('click', (e) => {
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

        // Wire theme swatches
        this.container.querySelectorAll<HTMLButtonElement>('.theme-swatch').forEach((swatch) => {
            swatch.addEventListener('click', () => {
                const theme = swatch.dataset.theme as Theme;
                if (theme && this.onThemeChange) {
                    this.onThemeChange(theme);
                }
            });
        });
    }

    private applyCollapsedState(): void {
        this.container.classList.toggle('is-collapsed', this.isCollapsed);
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

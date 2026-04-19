import { VolumeControl } from './volume_control';

export interface ScheduleTimerCallbacks {
  onStartPause: () => void;
  onSkip: () => void;
  onReset: () => void;
  onSettings: () => void;
}

/**
 * Encapsulates the PracTempo schedule-control section (START/SKIP/RESET/SETTINGS/WIDGETS).
 * Generates the button HTML programmatically using the same element IDs as the original
 * static HTML so existing main.ts query-by-ID patterns continue to work.
 */
export class ScheduleTimerView {
  private startPauseBtn: HTMLButtonElement | null = null;

  constructor(container: HTMLElement, callbacks: ScheduleTimerCallbacks) {
    this.render(container, callbacks);
  }

  private render(container: HTMLElement, callbacks: ScheduleTimerCallbacks): void {
    container.innerHTML = '';

    const subtitle = document.createElement('p');
    subtitle.classList.add('subtitle');
    subtitle.textContent = 'PracTempo!';
    container.appendChild(subtitle);

    const level = document.createElement('div');
    level.classList.add('level', 'main-controls', 'is-mobile');

    // START/PAUSE button
    this.startPauseBtn = this.createLevelButton('start-control', 'is-success', 'is-medium');
    this.startPauseBtn.textContent = 'START';
    this.startPauseBtn.addEventListener('click', callbacks.onStartPause);
    level.appendChild(this.wrap(this.startPauseBtn));

    // SKIP button
    const skipBtn = this.createLevelButton('skip-control', 'is-info', 'is-medium');
    skipBtn.textContent = 'SKIP';
    skipBtn.title = 'Skip to next task';
    skipBtn.addEventListener('click', callbacks.onSkip);
    level.appendChild(this.wrap(skipBtn));

    // RESET button
    const resetBtn = this.createLevelButton('reset-control', 'is-danger', 'is-medium');
    resetBtn.textContent = 'RESET';
    resetBtn.addEventListener('click', callbacks.onReset);
    level.appendChild(this.wrap(resetBtn));

    // SETTINGS button
    const settingsBtn = this.createIconButton('settings-button', 'settings', 'Settings');
    settingsBtn.addEventListener('click', callbacks.onSettings);
    level.appendChild(this.wrap(settingsBtn));

    // VOLUME control
    const volItem = document.createElement('div');
    volItem.classList.add('level-item');
    volItem.appendChild(new VolumeControl().el);
    level.appendChild(volItem);

    // FLOATING VIEWS dropdown
    level.appendChild(this.createFloatingViewDropdown());

    container.appendChild(level);
  }

  private createLevelButton(
    id: string,
    ...classes: string[]
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = id;
    btn.classList.add('button', ...classes);
    return btn;
  }

  private createIconButton(id: string, iconName: string, title: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = id;
    btn.classList.add('button', 'not-text');
    btn.title = title;
    const icon = document.createElement('span');
    icon.classList.add('material-icons');
    icon.textContent = iconName;
    btn.appendChild(icon);
    return btn;
  }

  private createFloatingViewDropdown(): HTMLElement {
    const levelItem = document.createElement('div');
    levelItem.classList.add('level-item');

    const dropdown = document.createElement('div');
    dropdown.classList.add('dropdown');
    dropdown.id = 'floating-view-dropdown-container';

    const trigger = document.createElement('div');
    trigger.classList.add('dropdown-trigger');

    const btn = document.createElement('button');
    btn.id = 'floating-view-button';
    btn.classList.add('button', 'not-text');
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-controls', 'floating-view-dropdown-menu');
    btn.title = 'Floating Views';
    const icon = document.createElement('span');
    icon.classList.add('material-icons');
    icon.textContent = 'widgets';
    btn.appendChild(icon);
    trigger.appendChild(btn);

    const menu = document.createElement('div');
    menu.classList.add('dropdown-menu');
    menu.id = 'floating-view-dropdown-menu';
    menu.setAttribute('role', 'menu');

    const content = document.createElement('div');
    content.classList.add('dropdown-content');
    content.id = 'floating-view-dropdown-content';
    menu.appendChild(content);

    dropdown.appendChild(trigger);
    dropdown.appendChild(menu);
    levelItem.appendChild(dropdown);
    return levelItem;
  }

  private wrap(el: HTMLElement): HTMLElement {
    const item = document.createElement('div');
    item.classList.add('level-item');
    item.appendChild(el);
    return item;
  }

  /** Update the START button appearance to reflect running state. */
  setRunning(running: boolean): void {
    if (!this.startPauseBtn) return;
    if (running) {
      this.startPauseBtn.textContent = 'PAUSE';
      this.startPauseBtn.classList.remove('is-success');
      this.startPauseBtn.classList.add('is-warning');
    } else {
      this.startPauseBtn.textContent = 'START';
      this.startPauseBtn.classList.remove('is-warning');
      this.startPauseBtn.classList.add('is-success');
    }
  }
}

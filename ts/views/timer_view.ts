import { View } from '../view';
import { formatDuration, parseDurationString } from '../time_utils';
import { Status } from '../display_controller';

export class TimerView implements View {
  private duration: number;
  private currentSeconds: number;
  private isRunning: boolean = false;
  private timerId: number | null = null;
  private isEditing: boolean = false;

  // DOM refs
  private containerEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private displayEl: HTMLElement | null = null;
  private startPauseBtn: HTMLButtonElement | null = null;
  private resetBtn: HTMLButtonElement | null = null;

  // Callbacks (presence of onStartPause determines schedule-driven vs standalone mode)
  private readonly onStartPauseCallback: (() => void) | undefined;
  private readonly onResetCallback: (() => void) | undefined;
  private readonly onDurationEditCallback: ((seconds: number) => void) | undefined;

  constructor(
    initialDuration: number = 300,
    onStartPause?: () => void,
    onReset?: () => void,
    onDurationEdit?: (seconds: number) => void
  ) {
    this.duration = initialDuration;
    this.currentSeconds = initialDuration;
    this.onStartPauseCallback = onStartPause;
    this.onResetCallback = onReset;
    this.onDurationEditCallback = onDurationEdit;
  }

  private get isScheduleDriven(): boolean {
    return this.onStartPauseCallback !== undefined;
  }

  // ─── View interface ────────────────────────────────────────────────────────

  render(container: HTMLElement): void {
    this.containerEl = container;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.classList.add('timer-view');

    // Optional title (e.g. current task name)
    this.titleEl = document.createElement('div');
    this.titleEl.classList.add('timer-title');
    this.titleEl.hidden = true;
    wrapper.appendChild(this.titleEl);

    // Inner row: display + controls
    const row = document.createElement('div');
    row.classList.add('timer-row');

    // Countdown display
    this.displayEl = document.createElement('div');
    this.displayEl.classList.add('timer-display');
    this.displayEl.textContent = formatDuration(this.currentSeconds);
    this.displayEl.addEventListener('click', () => this.handleDisplayClick());
    row.appendChild(this.displayEl);

    // Controls row
    const controls = document.createElement('div');
    controls.classList.add('timer-controls');

    this.startPauseBtn = document.createElement('button');
    this.startPauseBtn.classList.add('button', 'timer-start-pause', 'is-medium');
    this.startPauseBtn.textContent = '▶';
    this.startPauseBtn.addEventListener('click', () => this.handleStartPause());
    controls.appendChild(this.startPauseBtn);

    this.resetBtn = document.createElement('button');
    this.resetBtn.classList.add('button', 'timer-reset', 'is-medium');
    this.resetBtn.textContent = '↺';
    this.resetBtn.addEventListener('click', () => this.handleReset());
    controls.appendChild(this.resetBtn);

    row.appendChild(controls);
    wrapper.appendChild(row);
    container.appendChild(wrapper);

    this.updateButtonState();
  }

  start(): void {
    // In schedule-driven mode, the schedule drives everything – no-op here.
    // In standalone mode, start the countdown.
    if (!this.isScheduleDriven) {
      this.startCountdown();
    }
  }

  stop(): void {
    // In standalone mode, pause the countdown when the floating view is hidden.
    if (!this.isScheduleDriven) {
      this.stopCountdown();
    }
  }

  destroy(): void {
    this.stopCountdown();
    this.containerEl = null;
    this.displayEl = null;
    this.startPauseBtn = null;
    this.resetBtn = null;
  }

  // ─── External API (schedule-driven mode) ──────────────────────────────────

  /** Called every second by DisplayController.setTime() to sync the display. */
  setDisplayTime(seconds: number): void {
    if (this.isEditing) return;
    this.currentSeconds = seconds;
    this.updateDisplayEl();
  }

  /** Called at interval transitions to set the reset-to baseline. */
  setDuration(seconds: number): void {
    this.duration = seconds;
  }

  /** Called by DisplayController.setStatus() to reflect schedule play/pause state. */
  setRunning(running: boolean): void {
    this.isRunning = running;
    this.updateButtonState();
  }

  /** Sets or clears the title shown above the timer (e.g. current task name). */
  setTitle(title: string | null): void {
    if (!this.titleEl) return;
    if (title) {
      this.titleEl.textContent = title;
      this.titleEl.hidden = false;
    } else {
      this.titleEl.textContent = '';
      this.titleEl.hidden = true;
    }
  }

  // ─── Internal event handlers ───────────────────────────────────────────────

  private handleStartPause(): void {
    if (this.isScheduleDriven) {
      this.onStartPauseCallback!();
    } else {
      this.toggleStandalone();
    }
  }

  private handleReset(): void {
    if (this.isScheduleDriven) {
      this.onResetCallback?.();
    } else {
      this.stopCountdown();
      this.currentSeconds = this.duration;
      this.updateDisplayEl();
      this.updateButtonState();
    }
  }

  private handleDisplayClick(): void {
    if (this.isRunning || this.isEditing) return;
    this.enterEditMode();
  }

  // ─── Edit mode ─────────────────────────────────────────────────────────────

  private enterEditMode(): void {
    if (!this.displayEl) return;
    this.isEditing = true;
    this.displayEl.contentEditable = 'true';
    this.displayEl.classList.add('is-editing');

    // Select all text so the user can immediately type
    this.displayEl.focus();
    const range = document.createRange();
    range.selectNodeContents(this.displayEl);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.displayEl?.removeEventListener('keydown', onKeyDown);
        this.displayEl?.removeEventListener('blur', onBlur);
        this.exitEditMode();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.displayEl?.removeEventListener('keydown', onKeyDown);
        this.displayEl?.removeEventListener('blur', onBlur);
        this.cancelEditMode();
      }
    };

    const onBlur = () => {
      this.displayEl?.removeEventListener('keydown', onKeyDown);
      this.displayEl?.removeEventListener('blur', onBlur);
      this.exitEditMode();
    };

    this.displayEl.addEventListener('keydown', onKeyDown);
    this.displayEl.addEventListener('blur', onBlur);
  }

  private exitEditMode(): void {
    if (!this.displayEl) return;
    const raw = this.displayEl.textContent?.trim() ?? '';
    this.isEditing = false;
    this.displayEl.contentEditable = 'false';
    this.displayEl.classList.remove('is-editing');

    try {
      const parsed = parseDurationString(raw);
      const clamped = Math.max(0, parsed);
      this.duration = clamped;
      this.currentSeconds = clamped;
      this.onDurationEditCallback?.(clamped);
    } catch {
      // Invalid input – restore previous value
    }

    this.updateDisplayEl();
  }

  private cancelEditMode(): void {
    if (!this.displayEl) return;
    this.isEditing = false;
    this.displayEl.contentEditable = 'false';
    this.displayEl.classList.remove('is-editing');
    this.updateDisplayEl(); // Restore previous value
  }

  // ─── Standalone countdown engine ──────────────────────────────────────────

  private toggleStandalone(): void {
    if (this.isRunning) {
      this.stopCountdown();
    } else {
      this.startCountdown();
    }
  }

  private startCountdown(): void {
    if (this.isRunning || this.timerId !== null) return;
    if (this.currentSeconds <= 0) {
      this.currentSeconds = this.duration;
      this.updateDisplayEl();
    }
    this.isRunning = true;
    this.updateButtonState();

    this.timerId = window.setInterval(() => {
      if (this.currentSeconds > 0) {
        this.currentSeconds--;
        this.updateDisplayEl();
      }
      if (this.currentSeconds <= 0) {
        this.playOutOfTimeSound();
        this.stopCountdown();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    this.updateButtonState();
  }

  // ─── Sounds ────────────────────────────────────────────────────────────────

  /** Plays a short descending alarm tone to signal the timer ran out. */
  private playOutOfTimeSound(): void {
    try {
      const ctx = new AudioContext();
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);

      // Three descending tones: 880 → 660 → 440 Hz, each ~150ms
      const freqs = [880, 660, 440];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gainNode);
        const t = ctx.currentTime + i * 0.18;
        gainNode.gain.setValueAtTime(0.35, t);
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.18);
      });

      setTimeout(() => ctx.close(), 800);
    } catch (e) {
      console.warn('Could not play timer completion sound:', e);
    }
  }

  // ─── DOM helpers ───────────────────────────────────────────────────────────

  private updateDisplayEl(): void {
    if (this.displayEl) {
      this.displayEl.textContent = formatDuration(this.currentSeconds);
    }
  }

  private updateButtonState(): void {
    if (!this.startPauseBtn) return;
    if (this.isRunning) {
      this.startPauseBtn.textContent = '‖';
    } else {
      this.startPauseBtn.textContent = '▶';
    }
  }
}

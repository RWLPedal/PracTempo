import { Interval } from '../schedule/schedule';
import { formatDuration } from '../time_utils';

/**
 * Renders the live playback status panel: the TimerView slot, total-progress
 * counter, and upcoming-tasks list.  The current task name is shown as a title
 * inside the TimerView itself – this component does not duplicate it.
 */
export class SchedulePlaybackView {
  private timerContainerEl!: HTMLElement;
  private totalTimerEl!: HTMLElement;
  private upcomingListEl!: HTMLElement;
  private scheduleTitleEl!: HTMLElement;

  constructor(container: HTMLElement) {
    this.render(container);
  }

  private render(container: HTMLElement): void {
    container.innerHTML = '';
    container.classList.add('schedule-playback-view');

    // ── Timer slot ────────────────────────────────────────────────────────────
    this.timerContainerEl = document.createElement('div');
    this.timerContainerEl.classList.add('playback-timer-slot');
    container.appendChild(this.timerContainerEl);

    // ── Right panel: title + total + upcoming (groups as one grid area in wide layout) ──
    const rightPanel = document.createElement('div');
    rightPanel.classList.add('playback-right-panel');

    // Schedule title (shown in play mode)
    this.scheduleTitleEl = document.createElement('div');
    this.scheduleTitleEl.classList.add('playback-schedule-title');
    this.scheduleTitleEl.hidden = true;
    rightPanel.appendChild(this.scheduleTitleEl);

    // ── Total progress ────────────────────────────────────────────────────────
    const totalSection = document.createElement('div');
    totalSection.classList.add('playback-total-section');

    const totalLabel = document.createElement('span');
    totalLabel.classList.add('playback-section-label');
    totalLabel.textContent = 'Total';

    this.totalTimerEl = document.createElement('span');
    this.totalTimerEl.id = 'total-timer';
    this.totalTimerEl.classList.add('playback-total-timer');
    this.totalTimerEl.textContent = '0:00 / 0:00';

    totalSection.appendChild(totalLabel);
    totalSection.appendChild(this.totalTimerEl);
    rightPanel.appendChild(totalSection);

    // ── Upcoming tasks ────────────────────────────────────────────────────────
    const upcomingSection = document.createElement('div');
    upcomingSection.classList.add('playback-upcoming-section');

    const upcomingLabel = document.createElement('p');
    upcomingLabel.classList.add('playback-section-label');
    upcomingLabel.textContent = 'Upcoming';

    this.upcomingListEl = document.createElement('ol');
    this.upcomingListEl.id = 'upcoming';
    this.upcomingListEl.classList.add('playback-upcoming-list');

    upcomingSection.appendChild(upcomingLabel);
    upcomingSection.appendChild(this.upcomingListEl);
    rightPanel.appendChild(upcomingSection);

    container.appendChild(rightPanel);
  }

  /** The element into which the consuming code should render a TimerView. */
  getTimerContainer(): HTMLElement {
    return this.timerContainerEl;
  }

  setScheduleName(name: string): void {
    this.scheduleTitleEl.textContent = name;
    this.scheduleTitleEl.hidden = !name;
  }

  setTotalTime(elapsed: number, total: number): void {
    this.totalTimerEl.textContent = `${formatDuration(elapsed)} / ${formatDuration(total)}`;
  }

  setUpcoming(intervals: Interval[], isEndVisible: boolean): void {
    this.upcomingListEl.innerHTML = '';

    if (intervals.length === 0 && !isEndVisible) {
      const li = document.createElement('li');
      li.classList.add('playback-upcoming-empty');
      li.textContent = '(No upcoming tasks)';
      this.upcomingListEl.appendChild(li);
      return;
    }

    intervals.forEach((interval) => {
      const li = this.createUpcomingItem(
        (interval.task || '(Untitled)') + (interval.isIntroActive() ? ' (Warmup)' : ''),
        interval.duration
      );
      this.upcomingListEl.appendChild(li);
    });

    if (isEndVisible) {
      const li = document.createElement('li');
      li.classList.add('playback-upcoming-item', 'playback-upcoming-end');
      const nameSpan = document.createElement('span');
      nameSpan.classList.add('playback-upcoming-name');
      nameSpan.textContent = 'END';
      li.appendChild(nameSpan);
      this.upcomingListEl.appendChild(li);
    }
  }

  private createUpcomingItem(name: string, durationSeconds: number): HTMLLIElement {
    const li = document.createElement('li');
    li.classList.add('playback-upcoming-item');

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('playback-upcoming-name');
    nameSpan.textContent = name;

    const durationSpan = document.createElement('span');
    durationSpan.classList.add('playback-upcoming-duration');
    durationSpan.textContent = formatDuration(durationSeconds);

    li.appendChild(nameSpan);
    li.appendChild(durationSpan);
    return li;
  }
}

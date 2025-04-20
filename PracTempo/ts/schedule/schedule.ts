import { Feature } from "../feature";
import { AudioController } from "../audio_controller";
import { DisplayController, Status } from "../display_controller";

// Colors for tasks in intervals.
const intervalColors = [
  '#e7cba9',
  '#aad9cd',
  '#e8d595',
  '#8da47e',
  '#e9bbb5',
];

// An instance of a schedule.
export class Schedule {
  intervals: Array<Interval>;
  currentIntervalIndex: number;
  accumulatedSeconds: number;
  totalDuration: number;
  display: DisplayController;
  audio: AudioController;
  color_index: number;

  constructor(display: DisplayController,
    audio: AudioController) {
    this.display = display;
    this.audio = audio;
    this.intervals = [];
    this.currentIntervalIndex = 0;
    this.accumulatedSeconds = 0;
    this.totalDuration = 0;
    this.color_index = 0;
  }

  addInterval(interval: Interval): void {
    interval.setCallbacks(
      this.onIntroEnd.bind(this),
      this.onTimerUpdate.bind(this),
      this.onIntervalEnd.bind(this));
    interval.setColor(intervalColors[this.color_index]);
    this.color_index = (this.color_index + 1) % intervalColors.length;
    this.totalDuration += interval.getTotalDuration();
    this.intervals.push(interval);
  }

  isFinished(): boolean {
    return this.currentIntervalIndex >= this.intervals.length;
  }

  isRunning(): boolean {
    // Check if the current interval exists and its timer is running
    return this.getCurrentInterval()?.isTimerRunning() ?? false;
  }

  getCurrentInterval(): Interval | null { // Return type can be null
    return this.isFinished() ?
      null : this.intervals[this.currentIntervalIndex];
  }

  onTimerUpdate(time: number): void {
    this.display.setTime(time);
    this.setTotalTime();
    this.accumulatedSeconds++;
  }

  onIntroEnd(): void {
    this.audio.playIntroEnd();
    this.setDisplayTask(this.getCurrentInterval());
    this.display.flashOverlay();
  }

  onIntervalEnd(): void {
    const endedInterval = this.getCurrentInterval(); // Get interval that just finished

    // Stop the feature and its views for the interval that just ended
    endedInterval?.stopFeatureAndViews();
    endedInterval?.destroyFeatureAndViews(); // Clean up ended interval views/feature

    this.currentIntervalIndex += 1;
    this.audio.playIntervalEnd();
    this.display.flashOverlay();

    if (!this.isFinished()) {
      const nextInterval = this.getCurrentInterval();
      this.setDisplayTask(nextInterval); // Prepare display for the next interval
      this.updateUpcoming();
      nextInterval.start(); // Start the next interval timer AND its features/views
    } else {
      this.setDisplayFinished();
      // No need to stop/destroy here, already done for the last interval
    }
  }

  setTotalTime(): void {
    this.display.setTotalTime(this.accumulatedSeconds, this.totalDuration);
  }


  setDisplayTask(interval: Interval): void {
    console.log("Setting display for interval:", interval);
    const suffix = interval.isIntroActive() ? " (Warmup)" : "";
    this.display.setTask(interval.task + suffix, interval.color);

    if (interval.feature) {
      // Render feature (which includes its views via DisplayController)
      this.display.renderFeature(interval.feature);
    } else {
      this.display.clearFeature();
    }
  }

  setDisplayFinished(): void {
    this.display.setTask('DONE!', '');
    this.display.setStatus(Status.Stop);
    this.display.setStart();
  }

  updateUpcoming(): void {
    if (this.isFinished()) {
      this.display.setUpcoming([], true); // Pass true for isEndVisible when finished
      return;
    }
    const upcomingTasks = [];
    // Change +3 to +6 to potentially include the next 5 intervals
    const maxSize = Math.min(
      this.currentIntervalIndex + 6, // Look ahead up to 5 intervals (current + 1 to current + 5)
      this.intervals.length
    );
    for (var i = this.currentIntervalIndex + 1; i < maxSize; i++) {
      upcomingTasks.push(this.intervals[i]);
    }
    // Determine if the loop reached the actual end of the schedule
    const isEndVisible = (maxSize === this.intervals.length);
    this.display.setUpcoming(upcomingTasks, isEndVisible); // Pass the flag
  }

  start(): void {
    const interval = this.getCurrentInterval();
    if (!interval || this.isFinished()) {
      console.log("Schedule start: No interval or schedule finished.");
      return;
    }
    if (interval.isTimerRunning()) {
      console.log("Schedule start: Timer already running.");
      return; // Avoid double start
    }

    console.log("Schedule start: Starting interval", this.currentIntervalIndex);
    this.display.setPause(); // Set button to PAUSE state
    this.display.setStatus(Status.Play);
    interval.start(); // This now also starts feature/views
  }

  // Prepare display for the first interval (or current if paused)
  prepare(): void {
    const interval = this.getCurrentInterval();
    if (!interval) {
      console.log("Schedule prepare: No intervals.");
      this.setDisplayFinished(); // Or some initial state
      return;
    }
    console.log("Schedule prepare: Setting up display for interval", this.currentIntervalIndex);
    this.display.setTime(interval.getCurrentTimeRemaining());
    this.setDisplayTask(interval); // Renders feature/views via DisplayController
    this.setTotalTime();
    this.updateUpcoming();
    this.display.setStart(); // Ensure button shows START initially or after pause
    this.display.setStatus(Status.Pause); // Show pause icon initially
  }

  // Pause the current interval
  pause(): void {
    const interval = this.getCurrentInterval();
    if (!interval || this.isFinished() || !interval.isTimerRunning()) {
      console.log("Schedule pause: No interval, finished, or not running.");
      return;
    }
    console.log("Schedule pause: Pausing interval", this.currentIntervalIndex);
    this.display.setStart(); // Set button to START state
    this.display.setStatus(Status.Pause);
    interval.pause();
  }
}

// An interval in a schedule.
export class Interval {
  duration: number;
  introDuration: number;
  task: string;
  color: string;
  feature: Feature | null;
  timer: IntervalTimer;
  introFinishedCallback: Function | null = null;
  updateCallback: Function | null = null;
  finishedCallback: Function | null = null;

  constructor(duration: number, introDuration: number, task: string, feature: Feature | null = null) {
    this.duration = duration;
    this.introDuration = introDuration;
    this.task = task;
    this.feature = feature;
    this.timer = new IntervalTimer(duration, introDuration);
  }

  setColor(color: string) {
    this.color = color;
  }

  setCallbacks(introFinishedCallback: Function, updateCallback: Function, finishedCallback: Function) {
    this.introFinishedCallback = introFinishedCallback;
    this.updateCallback = updateCallback;
    this.finishedCallback = finishedCallback;
    // Pass callbacks to timer
    this.timer.setCallbacks(
      () => this.introFinishedCallback?.(),
      (time) => this.updateCallback?.(time),
      () => this.finishedCallback?.()
    );
  }

  isIntroActive(): boolean {
    return !this.timer.isIntroFinished;
  }

  isTimerRunning(): boolean {
    return this.timer.isRunning();
  }

  getTotalDuration(): number {
    return this.duration + this.introDuration;
  }

  getCurrentTimeRemaining(): number {
    if (this.isIntroActive()) {
      return this.timer.introTimeRemaining;
    }
    return this.timer.timeRemaining;
  }

  start(): void {
    if (this.timer.isRunning()) return; // Prevent double start
    console.log(`Interval "${this.task}" starting timer...`);
    this.timer.countdown();
    // Start feature and its views
    console.log(`   Starting feature and views for "${this.task}"...`);
    this.feature?.start?.();
  }

  pause(): void {
    if (!this.timer.isRunning()) return; // Can't pause if not running
    console.log(`Interval "${this.task}" pausing timer...`);
    this.timer.pause();
    // Stop feature and its views
    console.log(`   Stopping feature and views for "${this.task}"...`);
    this.feature?.stop?.();
  }

  stopFeatureAndViews(): void {
    console.log(`Interval "${this.task}" explicitly stopping feature/views.`);
    this.feature?.stop?.();
  }
  destroyFeatureAndViews(): void {
    console.log(`Interval "${this.task}" explicitly destroying feature/views.`);
    this.feature?.destroy?.();
  }
}

class IntervalTimer {
  timeRemaining: number;
  introTimeRemaining: number;
  isIntroFinished: boolean;
  introFinishedCallback: Function;
  updateCallback: Function;
  finishedCallback: Function;
  private countdownTimerId: number | null = null;

  constructor(time: number,
    introductionTime: number) {
    this.timeRemaining = time;
    this.introTimeRemaining = introductionTime;
    this.isIntroFinished = introductionTime == 0 ? true : false;
  }

  isRunning(): boolean {
    return this.countdownTimerId !== null;
  }

  setCallbacks(introFinishedCallback: Function,
    updateCallback: Function,
    finishedCallback: Function) {
    this.introFinishedCallback = introFinishedCallback;
    this.updateCallback = updateCallback;
    this.finishedCallback = finishedCallback;
  }

  countdown(): void {
    if (this.countdownTimerId !== null) return; // Already running

    const tick = () => {
      if (this.introTimeRemaining > 0) {
        this.introTimeRemaining -= 1;
        this.updateCallback?.(this.introTimeRemaining);
        this.countdownTimerId = window.setTimeout(tick, 1000);
      } else {
        if (!this.isIntroFinished) {
          this.isIntroFinished = true;
          this.introFinishedCallback?.();
          // Update timer display immediately after intro finishes
          this.updateCallback?.(this.timeRemaining);
        }

        if (this.timeRemaining > 0) {
          this.timeRemaining -= 1;
          this.updateCallback?.(this.timeRemaining);
          this.countdownTimerId = window.setTimeout(tick, 1000);
        } else {
          // Timer finished
          this.countdownTimerId = null; // Mark as stopped *before* callback
          this.finishedCallback?.();
        }
      }
    };

    // Start the first tick
    if (this.introTimeRemaining > 0 || this.timeRemaining > 0) {
      console.log("IntervalTimer: Starting countdown...");
      tick();
    } else {
      console.log("IntervalTimer: Zero duration, calling finished immediately.");
      this.finishedCallback?.(); // Call immediately if zero duration
    }
  }

  pause(): void {
    if (this.countdownTimerId !== null) {
      window.clearTimeout(this.countdownTimerId);
      this.countdownTimerId = null;
      console.log("IntervalTimer: Paused.");
    }
  }
}

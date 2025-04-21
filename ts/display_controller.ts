import { Feature } from "./feature";
import { Interval } from "./schedule/schedule";
// Import MetronomeView to identify it
import { MetronomeView } from "./guitar/views/metronome_view";

export enum Status {
  Play = "Play",
  Pause = "Pause",
  Stop = "Stop",
}

export class DisplayController {
  timerEl: HTMLElement;
  totalTimerEl: HTMLElement;
  taskWrapperEl: HTMLElement;
  taskDisplayEl: HTMLElement;
  diagramEl: HTMLElement; // Target for feature rendering
  statusEl: HTMLElement;
  upcomingEl: HTMLElement;
  controlButtonEl: HTMLElement;

  constructor(
    timerEl: HTMLElement,
    totalTimerEl: HTMLElement,
    taskWrapperEl: HTMLElement,
    taskDisplayEl: HTMLElement,
    diagramEl: HTMLElement,
    statusEl: HTMLElement,
    upcomingEl: HTMLElement,
    controlButtonEl: HTMLElement
  ) {
    this.timerEl = timerEl;
    this.totalTimerEl = totalTimerEl;
    this.taskWrapperEl = taskWrapperEl;
    this.taskDisplayEl = taskDisplayEl;
    this.diagramEl = diagramEl;
    this.statusEl = statusEl;
    this.upcomingEl = upcomingEl;
    this.controlButtonEl = controlButtonEl;
  }

  setTask(taskName: string, color: string): void {
    this.taskDisplayEl.innerText = taskName;
    this.taskWrapperEl.style.backgroundColor = color; // Use camelCase for style props
  }

  setTime(seconds: number): void {
    this.timerEl.innerText = this.formattedTime(seconds);
  }

  setStatus(status: Status): void {
    let text = "||";
    if (status === Status.Play) text = "▶";
    else if (status === Status.Stop) text = "■";
    this.statusEl.textContent = text;
  }

  flashOverlay() {
    const overlay = document.getElementById("overlay");
    if (!overlay) return;
    overlay.classList.remove("hidden");
    overlay.classList.add("visible");
    setTimeout(() => {
      overlay.classList.remove("visible");
      overlay.classList.add("hidden");
    }, 500); // Duration of flash
  }

  setTotalTime(seconds: number, totalDuration: number): void {
    this.totalTimerEl.innerText = `${this.formattedTime(
      seconds
    )} / ${this.formattedTime(totalDuration)}`;
  }

  /**
   * Updates the upcoming tasks list.
   * @param upcomingIntervals Array of the next intervals to display.
   * @param isEndVisible True if the end of the schedule falls within this list's scope.
   */
  setUpcoming(upcomingIntervals: Array<Interval>, isEndVisible: boolean): void {
    this.clearAllChildren(this.upcomingEl);

    // Only show placeholder if there are no intervals AND the end isn't visible yet
    if (upcomingIntervals.length === 0 && !isEndVisible) {
      this.upcomingEl.innerHTML = "<li>(No upcoming tasks)</li>"; // Adjusted placeholder
    } else {
      // Display the upcoming intervals
      upcomingIntervals.forEach((interval) => {
        const intervalEl = document.createElement("li");
        const introSuffix = interval.isIntroActive() ? " (Warmup)" : "";
        // Keep duration display concise
        const text = `${
          interval.task || "(Untitled)"
        }${introSuffix} [${this.formattedTime(interval.duration)}]`;
        intervalEl.innerText = text;
        // Optional: Add styling for clarity if needed
        // intervalEl.style.opacity = '0.8';
        // intervalEl.style.fontSize = '0.9em';
        this.upcomingEl.appendChild(intervalEl);
      });

      // Add "END" marker if the end of the schedule is reached within this view
      if (isEndVisible) {
        const endLi = document.createElement("li");
        endLi.textContent = "END";
        endLi.style.fontWeight = "bold"; // Make it stand out
        endLi.style.color = "#888"; // Dim color slightly
        endLi.style.marginTop = "5px"; // Add a little space before END
        this.upcomingEl.appendChild(endLi);
      }
    }
  }

  /**
   * Renders the feature and its views into the diagram container.
   * Explicitly renders MetronomeView last if present.
   * @param feature The feature instance to render.
   * @param handedness The current handedness setting ('left' or 'right').
   */
  renderFeature(
    feature: Feature,
    handedness: "left" | "right" = "right" // Handedness is likely handled by config now
  ): void {
    console.log(
      `[DisplayController.renderFeature] Attempting to render feature: ${
        feature?.typeName || "UNKNOWN"
      }`
    );
    this.clearFeature(); // Clear the main container first

    if (!feature) {
      console.error(
        "[DisplayController.renderFeature] Cannot render null/undefined feature."
      );
      return;
    }

    try {
      // Feature's render method might add headers or other base content
      feature.render(this.diagramEl);
      console.log(
        `[DisplayController.renderFeature] Successfully called feature.render() for ${feature.typeName}`
      );

      let metronomeViewInstance: MetronomeView | null = null;

      // Render non-metronome views first
      feature.views?.forEach((view) => {
        if (view instanceof MetronomeView) {
          metronomeViewInstance = view; // Store metronome view for later
        } else {
          // Render other views (like FretboardView, ChordDiagramView)
          console.log(
            `[DisplayController.renderFeature]   Rendering view: ${view.constructor.name}`
          );
          view.render(this.diagramEl);
        }
      });

      // Render MetronomeView last if it exists
      if (metronomeViewInstance) {
        console.log(
          `[DisplayController.renderFeature]   Rendering MetronomeView last.`
        );
        metronomeViewInstance.render(this.diagramEl);
      }
    } catch (error) {
      console.error(
        `[DisplayController.renderFeature] Error during rendering feature ${feature.typeName}:`,
        error
      );
      this.diagramEl.innerHTML = `<p style="color: red; padding: 10px;">Error rendering feature: ${feature.typeName}</p>`;
    }
  }

  clearFeature(): void {
    this.clearAllChildren(this.diagramEl);
  }

  formattedTime(totalSeconds: number): string {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "0:00";
    const tsf = Math.floor(totalSeconds);
    const s = (tsf % 60).toString().padStart(2, "0");
    const tm = Math.floor(tsf / 60);
    // No hours display needed based on previous format
    return `${tm}:${s}`;
  }

  clearAllChildren(element: HTMLElement): void {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  setStart(): void {
    this.controlButtonEl.innerText = "START";
    this.controlButtonEl.classList.remove("is-warning");
    this.controlButtonEl.classList.add("is-success");
  }

  setPause(): void {
    this.controlButtonEl.innerText = "PAUSE";
    this.controlButtonEl.classList.remove("is-success");
    this.controlButtonEl.classList.add("is-warning");
  }
}

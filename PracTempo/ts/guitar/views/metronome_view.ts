import { View } from "../../view";
import { AudioController } from "../../audio_controller";

/**
 * A View that functions as a metronome with an interactive 4/4 measure visualization,
 * tempo control, and mute functionality.
 * Supports up to 1/8th note subdivisions.
 */
export class MetronomeView implements View {
  private bpm: number;
  private intervalId: number | null = null;
  private container: HTMLElement | null = null;
  private audioController: AudioController;
  private metronomeAudioEl: HTMLAudioElement;

  private visualizerContainer: HTMLElement | null = null;
  private beatsContainer: HTMLElement | null = null;
  private beatElements: HTMLElement[] = [];
  private activeBeats: boolean[] = [];
  private currentBeatIndex: number = -1;
  private readonly subdivisions = 8;

  private controlsContainer: HTMLElement | null = null;
  private bpmSlider: HTMLInputElement | null = null;
  private bpmDisplay: HTMLSpanElement | null = null;
  private muteButton: HTMLButtonElement | null = null; // Renamed from pauseButton
  private isMuted: boolean = false; // Renamed from isPausedManually

  constructor(
    bpm: number,
    audioController: AudioController,
    metronomeAudioEl: HTMLAudioElement
  ) {
    this.bpm = bpm > 0 ? bpm : 60;
    this.audioController = audioController;
    this.metronomeAudioEl = metronomeAudioEl;
    if (!this.metronomeAudioEl) {
      console.error("MetronomeView: Audio element not provided!");
    }
    this.activeBeats = Array(this.subdivisions).fill(false);
    // Default to quarter notes active
    for (let i = 0; i < this.subdivisions; i += 2) {
      this.activeBeats[i] = true;
    }
  }

  render(container: HTMLElement): void {
    this.container = container;
    this.cleanupVisuals();

    this.visualizerContainer = document.createElement("div");
    this.visualizerContainer.classList.add("metronome-visualizer");
    this.visualizerContainer.style.width = "100%";
    this.visualizerContainer.style.padding = "10px 0";

    this.beatsContainer = document.createElement("div");
    this.beatsContainer.style.display = "flex";
    this.beatsContainer.style.justifyContent = "space-around";
    this.beatsContainer.style.alignItems = "center";
    this.beatsContainer.style.marginBottom = "15px";
    this.beatsContainer.style.minHeight = "30px";

    this.beatElements = [];
    for (let i = 0; i < this.subdivisions; i++) {
      const beatElement = document.createElement("div");
      beatElement.classList.add("metronome-beat");
      beatElement.dataset.index = String(i);

      if (i % 2 === 0) {
        beatElement.classList.add("quarter-note");
        beatElement.style.width = "22px";
        beatElement.style.height = "22px";
      } else {
        beatElement.classList.add("eighth-note");
        beatElement.style.width = "16px";
        beatElement.style.height = "16px";
      }

      beatElement.style.borderRadius = "50%";
      beatElement.style.border = "1px solid #ccc";
      beatElement.style.backgroundColor = "#f0f0f0";
      beatElement.style.cursor = "pointer";
      beatElement.style.transition =
        "opacity 0.1s ease-in-out, background-color 0.1s ease-in-out, border-color 0.1s ease-in-out, transform 0.1s ease-in-out";
      beatElement.style.margin = "0 3px";

      beatElement.addEventListener("click", this.handleBeatClick.bind(this));
      this.beatElements.push(beatElement);
      this.beatsContainer.appendChild(beatElement);
    }
    this.updateBeatStyles();
    this.visualizerContainer.appendChild(this.beatsContainer);

    this.controlsContainer = document.createElement("div");
    this.controlsContainer.style.display = "flex";
    this.controlsContainer.style.alignItems = "center";
    this.controlsContainer.style.justifyContent = "center";
    this.controlsContainer.style.gap = "15px";

    this.muteButton = document.createElement("button");
    this.muteButton.classList.add("button", "is-small", "metronome-mute-btn");
    this.muteButton.textContent = "Mute";
    this.muteButton.style.minWidth = "65px";
    this.muteButton.addEventListener("click", this.toggleMute.bind(this));
    this.controlsContainer.appendChild(this.muteButton);

    this.bpmSlider = document.createElement("input");
    this.bpmSlider.type = "range";
    this.bpmSlider.min = "1";
    this.bpmSlider.max = "250";
    this.bpmSlider.value = String(this.bpm);
    this.bpmSlider.style.flexGrow = "1";
    this.bpmSlider.style.maxWidth = "200px";
    this.bpmSlider.addEventListener("input", this.handleSliderInput.bind(this));
    this.controlsContainer.appendChild(this.bpmSlider);

    this.bpmDisplay = document.createElement("span");
    this.bpmDisplay.classList.add("metronome-bpm-display", "is-size-7");
    this.bpmDisplay.style.minWidth = "55px";
    this.bpmDisplay.style.textAlign = "right";
    this.bpmDisplay.textContent = `${this.bpm} BPM`;
    this.controlsContainer.appendChild(this.bpmDisplay);

    this.visualizerContainer.appendChild(this.controlsContainer);
    this.container.appendChild(this.visualizerContainer);

    this.isMuted = false; // Start unmuted
    this.updateMuteButtonState();

    console.log(`MetronomeView rendered with controls at ${this.bpm} BPM`);
  }

  start(): void {
    if (this.intervalId === null) {
      this.startInterval();
    }
    this.updateMuteButtonState();
  }

  stop(): void {
    this.stopInterval();
    this.updateMuteButtonState();
  }

  /** Starts the actual setInterval */
  private startInterval(): void {
    if (this.intervalId !== null) return;
    if (this.bpm <= 0) {
      console.warn("MetronomeView: Cannot start with BPM <= 0.");
      return;
    }

    const intervalMillis = (60 / this.bpm / 2) * 1000; // 8th note interval
    console.log(
      `MetronomeView starting interval: ${intervalMillis.toFixed(2)}ms (${
        this.bpm
      } BPM)`
    );
    this.currentBeatIndex = -1;

    this.intervalId = window.setInterval(() => {
      this.tick();
    }, intervalMillis);

    this.updateMuteButtonState();
  }

  /** Stops the actual setInterval */
  private stopInterval(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("MetronomeView interval stopped.");

      if (
        this.currentBeatIndex >= 0 &&
        this.beatElements[this.currentBeatIndex]
      ) {
        this.beatElements[this.currentBeatIndex].classList.remove("current");
        this.applyBeatStyle(
          this.beatElements[this.currentBeatIndex],
          this.currentBeatIndex
        );
      }
      this.currentBeatIndex = -1;
      this.updateMuteButtonState();
    }
  }

  /** Toggles the metronome's sound on/off via the user button */
  private toggleMute(): void {
    this.isMuted = !this.isMuted;
    console.log(
      `Metronome sound toggled to: ${this.isMuted ? "Muted" : "Unmuted"}`
    );
    this.updateMuteButtonState();
  }

  /** Updates the Mute/Unmute button text and style */
  private updateMuteButtonState(): void {
    if (!this.muteButton) return;

    if (this.isMuted) {
      this.muteButton.textContent = "Unmute";
      this.muteButton.classList.add("is-warning");
    } else {
      this.muteButton.textContent = "Mute";
      this.muteButton.classList.remove("is-warning");
    }
  }

  destroy(): void {
    this.stopInterval();
    this.cleanupVisuals();
    this.container = null;
    console.log("MetronomeView destroyed.");
  }

  private handleSliderInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newBpm = parseInt(target.value, 10);
    this.setBpm(newBpm);
  }

  private handleBeatClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const indexStr = target.dataset.index;
    if (indexStr === undefined) return;
    const index = parseInt(indexStr, 10);
    if (isNaN(index) || index < 0 || index >= this.subdivisions) return;

    this.activeBeats[index] = !this.activeBeats[index];
    this.applyBeatStyle(target, index);

    // Play click feedback sound only if not muted
    if (this.activeBeats[index] && this.metronomeAudioEl && !this.isMuted) {
      this.metronomeAudioEl.currentTime = 0;
      this.metronomeAudioEl
        .play()
        .catch((e) => console.error("Metronome click feedback failed:", e));
    }
    console.log(
      `Metronome beat ${index + 1} toggled to: ${this.activeBeats[index]}`
    );
  }

  private tick(): void {
    if (
      this.currentBeatIndex >= 0 &&
      this.beatElements[this.currentBeatIndex]
    ) {
      this.beatElements[this.currentBeatIndex].classList.remove("current");
      this.applyBeatStyle(
        this.beatElements[this.currentBeatIndex],
        this.currentBeatIndex
      );
    }

    this.currentBeatIndex = (this.currentBeatIndex + 1) % this.subdivisions;

    const currentElement = this.beatElements[this.currentBeatIndex];
    if (currentElement) {
      currentElement.classList.add("current");
      currentElement.style.borderColor = "#e74c3c";
      currentElement.style.backgroundColor = "#fadbd8";
      currentElement.style.opacity = "1";
      currentElement.style.transform = "scale(1.1)";
    }

    // Play sound only if the current beat is active AND not muted
    if (
      this.activeBeats[this.currentBeatIndex] &&
      this.metronomeAudioEl &&
      !this.isMuted // Check mute status
    ) {
      this.metronomeAudioEl.currentTime = 0;
      this.metronomeAudioEl
        .play()
        .catch((e) => console.error("Metronome audio play failed:", e));
    }
  }

  private updateBeatStyles(): void {
    this.beatElements.forEach((element, index) => {
      this.applyBeatStyle(element, index);
    });
  }

  private applyBeatStyle(element: HTMLElement, index: number): void {
    const isQuarter = index % 2 === 0;
    element.style.transform = "scale(1)";

    if (this.activeBeats[index]) {
      element.style.opacity = "1";
      element.style.backgroundColor = isQuarter ? "#d0d0d0" : "#e0e0e0";
      element.style.borderColor = "#888";
    } else {
      element.style.opacity = "0.35";
      element.style.backgroundColor = isQuarter ? "#eaeaea" : "#f5f5f5";
      element.style.borderColor = "#ccc";
    }
    element.classList.remove("current");
  }

  private cleanupVisuals(): void {
    if (this.visualizerContainer && this.visualizerContainer.parentNode) {
      this.visualizerContainer.parentNode.removeChild(this.visualizerContainer);
    }
    this.visualizerContainer = null;
    this.beatsContainer = null;
    this.controlsContainer = null;
    this.beatElements = [];
    this.bpmSlider = null;
    this.bpmDisplay = null;
    this.muteButton = null;
  }

  setBpm(newBpm: number): void {
    if (newBpm > 0 && newBpm <= 250) {
      this.bpm = newBpm;
      if (this.bpmDisplay) {
        this.bpmDisplay.textContent = `${this.bpm} BPM`;
      }
      if (this.bpmSlider) {
        this.bpmSlider.value = String(this.bpm);
      }
      // If interval is running, restart it with the new BPM
      if (this.intervalId !== null) {
        this.stopInterval();
        this.startInterval();
      }
      console.log(`Metronome BPM updated to: ${this.bpm}`);
    }
  }
}

// ts/guitar/views/metronome_view.ts
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
  private readonly subdivisions = 8; // 8 eighth notes in 4/4

  private controlsContainer: HTMLElement | null = null;
  private bpmSlider: HTMLInputElement | null = null;
  private bpmDisplay: HTMLSpanElement | null = null;
  private muteButton: HTMLButtonElement | null = null;
  private isMuted: boolean = false;

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
    this.cleanupVisuals(); // Remove any previous visuals

    // --- Main container for the metronome view ---
    this.visualizerContainer = document.createElement("div");
    this.visualizerContainer.classList.add("metronome-visualizer");
    this.visualizerContainer.style.padding = "10px 5px"; // Adjust padding
    // **** Set a max-width to control overall size ****
    this.visualizerContainer.style.maxWidth = "300px"; // Adjust this value as needed (e.g., "280px", "320px")
    this.visualizerContainer.style.margin = "10px auto"; // Center it if container is wider (or remove 'auto' for left align)
    // Add a border for visual separation if desired
    // this.visualizerContainer.style.border = "1px solid var(--clr-border-light)";
    // this.visualizerContainer.style.borderRadius = "4px";

    // --- Beat Visualizer ---
    this.beatsContainer = document.createElement("div");
    this.beatsContainer.style.display = "flex";
    // Adjust justification for narrower width
    this.beatsContainer.style.justifyContent = "space-between"; // Use space-between instead of space-around
    this.beatsContainer.style.alignItems = "center";
    this.beatsContainer.style.marginBottom = "15px";
    this.beatsContainer.style.minHeight = "25px"; // Slightly smaller min-height

    this.beatElements = [];
    for (let i = 0; i < this.subdivisions; i++) {
      const beatElement = document.createElement("div");
      beatElement.classList.add("metronome-beat");
      beatElement.dataset.index = String(i);

      // Slightly smaller beat indicators
      if (i % 2 === 0) {
        // Quarter notes
        beatElement.classList.add("quarter-note");
        beatElement.style.width = "18px";
        beatElement.style.height = "18px";
      } else {
        // Eighth notes
        beatElement.classList.add("eighth-note");
        beatElement.style.width = "14px";
        beatElement.style.height = "14px";
      }

      beatElement.style.borderRadius = "50%";
      beatElement.style.border = "1px solid #ccc";
      beatElement.style.backgroundColor = "#f0f0f0";
      beatElement.style.cursor = "pointer";
      beatElement.style.transition =
        "opacity 0.1s ease-in-out, background-color 0.1s ease-in-out, border-color 0.1s ease-in-out, transform 0.1s ease-in-out";
      beatElement.style.margin = "0 2px"; // Reduced margin

      beatElement.addEventListener("click", this.handleBeatClick.bind(this));
      this.beatElements.push(beatElement);
      this.beatsContainer.appendChild(beatElement);
    }
    this.updateBeatStyles(); // Set initial active/inactive styles
    this.visualizerContainer.appendChild(this.beatsContainer);

    // --- Controls ---
    this.controlsContainer = document.createElement("div");
    this.controlsContainer.style.display = "flex";
    this.controlsContainer.style.alignItems = "center";
    this.controlsContainer.style.justifyContent = "center"; // Keep centered
    this.controlsContainer.style.gap = "10px"; // Reduced gap

    // Mute Button
    this.muteButton = document.createElement("button");
    this.muteButton.classList.add("button", "is-small", "metronome-mute-btn");
    this.muteButton.textContent = "Mute"; // Initial text
    this.muteButton.style.minWidth = "60px"; // Slightly smaller min-width
    this.muteButton.addEventListener("click", this.toggleMute.bind(this));
    this.controlsContainer.appendChild(this.muteButton);

    // BPM Slider
    this.bpmSlider = document.createElement("input");
    this.bpmSlider.type = "range";
    this.bpmSlider.min = "1"; // Keep range, can be adjusted if needed
    this.bpmSlider.max = "250";
    this.bpmSlider.value = String(this.bpm);
    this.bpmSlider.style.flexGrow = "1"; // Allow slider to take space
    this.bpmSlider.style.maxWidth = "150px"; // Reduced max-width for slider
    this.bpmSlider.style.minWidth = "80px"; // Ensure it doesn't get too small
    this.bpmSlider.addEventListener("input", this.handleSliderInput.bind(this));
    this.controlsContainer.appendChild(this.bpmSlider);

    // BPM Display
    this.bpmDisplay = document.createElement("span");
    this.bpmDisplay.classList.add("metronome-bpm-display", "is-size-7");
    this.bpmDisplay.style.minWidth = "50px"; // Slightly smaller min-width
    this.bpmDisplay.style.textAlign = "right";
    this.bpmDisplay.textContent = `${this.bpm} BPM`;
    this.controlsContainer.appendChild(this.bpmDisplay);

    // Append controls and main container
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
    if (this.intervalId !== null || this.bpm <= 0) return;

    const intervalMillis = (60 / this.bpm / (this.subdivisions / 4)) * 1000; // Interval per displayed beat (8th notes)
    console.log(
      `MetronomeView starting interval: ${intervalMillis.toFixed(2)}ms (${
        this.bpm
      } BPM, ${this.subdivisions} subdivisions)`
    );
    this.currentBeatIndex = -1; // Reset index

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

      // Reset style of the last active beat
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

  /** Toggles the metronome's sound on/off */
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
    this.applyBeatStyle(target, index); // Update visual style

    // Play click feedback sound only if unmuted and beat is now active
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

  /** The metronome tick logic */
  private tick(): void {
    // Reset style of the previously active beat
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

    // Advance to the next beat
    this.currentBeatIndex = (this.currentBeatIndex + 1) % this.subdivisions;

    // Apply 'current' style to the new active beat
    const currentElement = this.beatElements[this.currentBeatIndex];
    if (currentElement) {
      currentElement.classList.add("current");
      // Use CSS variables or more dynamic styling if needed
      currentElement.style.borderColor = "#e74c3c"; // Example: Red border
      currentElement.style.backgroundColor = "#fadbd8"; // Example: Light red background
      currentElement.style.opacity = "1";
      currentElement.style.transform = "scale(1.15)"; // Slightly larger pop
    }

    // Play sound only if this beat is active AND the metronome is not muted
    if (
      this.activeBeats[this.currentBeatIndex] &&
      this.metronomeAudioEl &&
      !this.isMuted
    ) {
      this.metronomeAudioEl.currentTime = 0;
      this.metronomeAudioEl
        .play()
        .catch((e) => console.error("Metronome audio play failed:", e));
    }
  }

  /** Sets the initial styles for all beat elements based on active state */
  private updateBeatStyles(): void {
    this.beatElements.forEach((element, index) => {
      this.applyBeatStyle(element, index);
    });
  }

  /** Applies the appropriate style to a single beat element */
  private applyBeatStyle(element: HTMLElement, index: number): void {
    const isQuarter = index % 2 === 0;
    element.style.transform = "scale(1)"; // Reset scale

    // Set styles based on whether the beat is active or inactive
    if (this.activeBeats[index]) {
      // Active beat style
      element.style.opacity = "1";
      element.style.backgroundColor = isQuarter ? "#d0d0d0" : "#e0e0e0"; // Darker greys
      element.style.borderColor = "#888";
    } else {
      // Inactive beat style
      element.style.opacity = "0.35"; // Dimmed
      element.style.backgroundColor = isQuarter ? "#eaeaea" : "#f5f5f5"; // Lighter greys
      element.style.borderColor = "#ccc";
    }
    element.classList.remove("current"); // Ensure 'current' highlight is removed
  }

  /** Removes the metronome UI elements from the DOM */
  private cleanupVisuals(): void {
    if (this.visualizerContainer && this.visualizerContainer.parentNode) {
      this.visualizerContainer.parentNode.removeChild(this.visualizerContainer);
    }
    // Nullify references to prevent memory leaks
    this.visualizerContainer = null;
    this.beatsContainer = null;
    this.controlsContainer = null;
    this.beatElements = [];
    this.bpmSlider = null;
    this.bpmDisplay = null;
    this.muteButton = null;
  }

  /** Updates the BPM and restarts the interval if running */
  setBpm(newBpm: number): void {
    if (newBpm > 0 && newBpm <= 250) {
      // Basic validation
      this.bpm = newBpm;
      // Update UI display if elements exist
      if (this.bpmDisplay) {
        this.bpmDisplay.textContent = `${this.bpm} BPM`;
      }
      if (this.bpmSlider) {
        this.bpmSlider.value = String(this.bpm);
      }
      // Restart the interval with the new BPM if it's currently running
      if (this.intervalId !== null) {
        this.stopInterval();
        this.startInterval();
      }
      console.log(`Metronome BPM updated to: ${this.bpm}`);
    }
  }
}

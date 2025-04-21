import { View } from "../../view";
import { AudioController } from "../../audio_controller";

// Define beat states
enum BeatState {
  Silent = 0,
  Normal = 1,
  Accent = 2,
}

// Define common time signatures
interface TimeSignature {
  beats: number; // Top number (e.g., 4)
  subdivision: number; // Bottom number (e.g., 4 for quarter note beat)
  label: string; // Display label (e.g., "4/4")
}

const COMMON_TIME_SIGNATURES: TimeSignature[] = [
  { beats: 4, subdivision: 4, label: "4/4" },
  { beats: 3, subdivision: 4, label: "3/4" },
  { beats: 2, subdivision: 4, label: "2/4" },
  { beats: 6, subdivision: 8, label: "6/8" },
  { beats: 5, subdivision: 4, label: "5/4" },
  { beats: 7, subdivision: 8, label: "7/8" },
];

/**
 * A View that functions as a metronome with interactive visualization,
 * tempo control, time signature selection, accent control, and mute functionality.
 * Assumes 8th note level interaction for beat toggling.
 */
export class MetronomeView implements View {
  private bpm: number;
  private intervalId: number | null = null;
  private container: HTMLElement | null = null;
  private audioController: AudioController;

  // State
  private currentTimeSignature: TimeSignature = COMMON_TIME_SIGNATURES[0]; // Default to 4/4
  private currentSubdivisionLevel = 8; // Currently fixed to show 8th notes visually
  private numberOfVisualBeats: number = 8; // Visual beats shown (e.g., 8 for 4/4 @ 8th notes)
  private beatStates: BeatState[] = []; // Stores state (Silent, Normal, Accent) for each visual beat
  private currentTickIndex: number = -1; // Tracks the current metronome tick (0 to numberOfVisualBeats - 1)
  private isMuted: boolean = false;
  private isRunning: boolean = false;

  // UI Elements
  private viewWrapper: HTMLElement | null = null;
  private visualizerContainer: HTMLElement | null = null;
  private beatsContainer: HTMLElement | null = null;
  private beatElements: HTMLElement[] = [];
  private controlsContainer: HTMLElement | null = null;
  private timeSigSelect: HTMLSelectElement | null = null;
  private bpmSlider: HTMLInputElement | null = null;
  private bpmDisplay: HTMLSpanElement | null = null;
  private muteButton: HTMLButtonElement | null = null;

  constructor(bpm: number, audioController: AudioController) {
    this.bpm = bpm > 0 ? bpm : 60;
    this.audioController = audioController;
    this.updateNumberOfVisualBeats(); // Calculate initial visual beats
    this.initializeBeatStates(); // Initialize beat states based on default time sig
  }

  /** Calculates the number of visual subdivisions based on the time signature. */
  private updateNumberOfVisualBeats(): void {
    // Calculate visual beats assuming 8th note display level
    if (this.currentTimeSignature.subdivision === 8) {
      this.numberOfVisualBeats = this.currentTimeSignature.beats;
    } else {
      // Assume quarter note beat or other
      this.numberOfVisualBeats = this.currentTimeSignature.beats * 2;
    }

    // Ensure beatStates array is compatible, resetting with new defaults
    const currentLength = this.beatStates.length;
    if (currentLength !== this.numberOfVisualBeats) {
      // Don't try to preserve old states when number of beats changes drastically
      this.initializeBeatStates(); // Re-initialize with new defaults
    }
  }

  /** Sets the initial beat states based on the current time signature. */
  private initializeBeatStates(): void {
    this.beatStates = new Array(this.numberOfVisualBeats);
    // Calculate how many visual ticks represent one main beat
    const step =
      this.currentSubdivisionLevel / this.currentTimeSignature.subdivision;

    for (let i = 0; i < this.numberOfVisualBeats; i++) {
      // Check if this visual tick falls ON a main beat
      if (i % step === 0) {
        // It's a main beat (downbeat)
        this.beatStates[i] = i === 0 ? BeatState.Accent : BeatState.Normal; // Accent beat 1, Normal others
      } else {
        // It's an off-beat subdivision
        this.beatStates[i] = BeatState.Silent;
      }
    }
    // Ensure beat 1 is always accented if array isn't empty
    if (this.beatStates.length > 0 && this.beatStates[0] !== BeatState.Accent) {
      this.beatStates[0] = BeatState.Accent;
    }
  }

  render(container: HTMLElement): void {
    this.container = container;
    this.cleanupVisuals();

    this.viewWrapper = document.createElement("div");
    this.viewWrapper.classList.add("metronome-view");
    // Apply styles from CSS

    this.visualizerContainer = document.createElement("div");
    this.visualizerContainer.classList.add("metronome-visualizer");

    this.beatsContainer = document.createElement("div");
    this.beatsContainer.classList.add("metronome-beats-container");

    this.rebuildVisualizer(); // Build initial beats based on state

    this.visualizerContainer.appendChild(this.beatsContainer);
    this.viewWrapper.appendChild(this.visualizerContainer);

    this.controlsContainer = document.createElement("div");
    this.controlsContainer.classList.add("metronome-controls");

    const leftControls = document.createElement("div");
    const rightControls = document.createElement("div");
    rightControls.style.flexGrow = "1"; // Allow BPM section to take space
    rightControls.style.justifyContent = "flex-end";
    rightControls.style.display = "flex";
    rightControls.style.alignItems = "center";
    rightControls.style.gap = "8px";

    // Time Signature Select
    const timeSigWrapper = document.createElement("div");
    timeSigWrapper.classList.add("select", "is-small");
    this.timeSigSelect = document.createElement("select");
    this.timeSigSelect.setAttribute("aria-label", "Time Signature");
    COMMON_TIME_SIGNATURES.forEach((sig) => {
      const option = new Option(sig.label, sig.label);
      if (sig.label === this.currentTimeSignature.label) option.selected = true;
      this.timeSigSelect.appendChild(option);
    });
    this.timeSigSelect.addEventListener(
      "change",
      this.handleTimeSigChange.bind(this)
    );
    timeSigWrapper.appendChild(this.timeSigSelect);
    leftControls.appendChild(timeSigWrapper);

    // Mute Button
    this.muteButton = document.createElement("button");
    this.muteButton.type = "button";
    this.muteButton.classList.add("button", "is-small", "metronome-mute-btn");
    this.muteButton.style.minWidth = "65px";
    this.muteButton.addEventListener("click", this.toggleMute.bind(this));
    leftControls.appendChild(this.muteButton);

    // BPM Slider
    this.bpmSlider = document.createElement("input");
    this.bpmSlider.type = "range";
    this.bpmSlider.min = "20";
    this.bpmSlider.max = "240";
    this.bpmSlider.value = String(this.bpm);
    this.bpmSlider.classList.add("metronome-bpm-slider");
    this.bpmSlider.addEventListener("input", this.handleSliderInput.bind(this));
    rightControls.appendChild(this.bpmSlider);

    // BPM Display
    this.bpmDisplay = document.createElement("span");
    this.bpmDisplay.classList.add("metronome-bpm-display", "is-size-7");
    rightControls.appendChild(this.bpmDisplay);

    this.controlsContainer.appendChild(leftControls);
    this.controlsContainer.appendChild(rightControls);
    this.viewWrapper.appendChild(this.controlsContainer);

    this.container.appendChild(this.viewWrapper);

    this.updateBpmDisplay();
    this.updateMuteButtonState();
    this.updateAllBeatStyles();

    console.log(
      `MetronomeView rendered at ${this.bpm} BPM, ${this.currentTimeSignature.label}`
    );
  }

  private rebuildVisualizer(): void {
    if (!this.beatsContainer) return;
    this.beatsContainer.innerHTML = "";
    this.beatElements = [];
    const step =
      this.currentSubdivisionLevel / this.currentTimeSignature.subdivision;

    for (let i = 0; i < this.numberOfVisualBeats; i++) {
      const beatElement = document.createElement("div");
      beatElement.classList.add("metronome-beat");
      beatElement.dataset.index = String(i);

      if (i % step === 0) {
        beatElement.classList.add("beat-downbeat");
      } else {
        beatElement.classList.add("beat-subdivision");
      }

      beatElement.addEventListener("click", this.handleBeatClick.bind(this));
      this.beatElements.push(beatElement);
      this.beatsContainer.appendChild(beatElement);
    }
    this.updateAllBeatStyles(); // Apply styles based on current beatStates
  }

  private handleTimeSigChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newLabel = select.value;
    const newSig = COMMON_TIME_SIGNATURES.find((sig) => sig.label === newLabel);
    if (newSig && newSig.label !== this.currentTimeSignature.label) {
      console.log("Time Signature changed to:", newLabel);
      this.currentTimeSignature = newSig;
      this.stopInterval();
      this.updateNumberOfVisualBeats(); // Resets beatStates via initializeBeatStates call
      this.rebuildVisualizer();
      this.currentTickIndex = -1;
      if (this.isRunning) {
        this.startInterval();
      }
    }
  }

  start(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.startInterval();
    }
    this.updateMuteButtonState();
  }

  stop(): void {
    if (this.isRunning) {
      this.isRunning = false;
      this.stopInterval();
    }
    this.updateMuteButtonState();
  }

  private startInterval(): void {
    if (this.intervalId !== null || this.bpm <= 0) return;
    const ticksPerBeat =
      this.currentSubdivisionLevel / this.currentTimeSignature.subdivision;
    const intervalMillis = (60 / this.bpm / ticksPerBeat) * 1000;
    console.log(
      `Metronome starting: ${this.bpm} BPM, ${
        this.currentTimeSignature.label
      }, Interval: ${intervalMillis.toFixed(2)}ms`
    );
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, intervalMillis);
  }

  private stopInterval(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("Metronome interval stopped.");
      this.resetCurrentBeatStyle();
    }
  }

  private toggleMute(): void {
    this.isMuted = !this.isMuted;
    this.updateMuteButtonState();
  }

  private updateMuteButtonState(): void {
    if (!this.muteButton) return;
    this.muteButton.textContent = this.isMuted ? "Unmute" : "Mute";
    this.muteButton.classList.toggle("is-warning", this.isMuted);
  }

  destroy(): void {
    this.stopInterval();
    this.cleanupVisuals();
    this.container = null;
  }

  private handleSliderInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.setBpm(parseInt(target.value, 10));
  }

  private handleBeatClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const indexStr = target.dataset.index;
    if (indexStr === undefined) return;
    const index = parseInt(indexStr, 10);
    if (isNaN(index) || index < 0 || index >= this.numberOfVisualBeats) return;

    const currentState = this.beatStates[index];
    let nextState: BeatState;
    if (currentState === BeatState.Normal) nextState = BeatState.Accent;
    else if (currentState === BeatState.Accent) nextState = BeatState.Silent;
    else nextState = BeatState.Normal; // Silent -> Normal

    this.beatStates[index] = nextState;
    this.applyBeatStyle(target, index);

    console.log(`Beat ${index} state set to: ${BeatState[nextState]}`);
  }

  private tick(): void {
    this.resetCurrentBeatStyle();
    this.currentTickIndex =
      (this.currentTickIndex + 1) % this.numberOfVisualBeats;

    const currentElement = this.beatElements[this.currentTickIndex];
    if (currentElement) {
      currentElement.classList.add("beat-current");
    }

    const currentState = this.beatStates[this.currentTickIndex];
    if (!this.isMuted) {
      if (currentState === BeatState.Accent)
        this.audioController.playAccentMetronomeClick();
      else if (currentState === BeatState.Normal)
        this.audioController.playMetronomeClick();
    }
  }

  private resetCurrentBeatStyle(): void {
    if (
      this.currentTickIndex >= 0 &&
      this.beatElements[this.currentTickIndex]
    ) {
      this.beatElements[this.currentTickIndex].classList.remove("beat-current");
    }
  }

  private updateAllBeatStyles(): void {
    this.beatElements.forEach((element, index) => {
      this.applyBeatStyle(element, index);
    });
  }

  private applyBeatStyle(element: HTMLElement, index: number): void {
    element.classList.remove(
      "beat-normal",
      "beat-accent",
      "beat-silent",
      "beat-current"
    );
    switch (this.beatStates[index]) {
      case BeatState.Accent:
        element.classList.add("beat-accent");
        break;
      case BeatState.Silent:
        element.classList.add("beat-silent");
        break;
      case BeatState.Normal:
      default:
        element.classList.add("beat-normal");
        break;
    }
    if (index === this.currentTickIndex) {
      element.classList.add("beat-current");
    }
  }

  private cleanupVisuals(): void {
    if (this.viewWrapper && this.viewWrapper.parentNode) {
      this.viewWrapper.parentNode.removeChild(this.viewWrapper);
    }
    this.viewWrapper = null;
    this.visualizerContainer = null;
    this.beatsContainer = null;
    this.controlsContainer = null;
    this.beatElements = [];
    this.timeSigSelect = null;
    this.bpmSlider = null;
    this.bpmDisplay = null;
    this.muteButton = null;
  }

  setBpm(newBpm: number): void {
    if (newBpm >= 20 && newBpm <= 240) {
      const changed = this.bpm !== newBpm;
      this.bpm = newBpm;
      this.updateBpmDisplay();
      if (changed && this.isRunning) {
        this.stopInterval();
        this.startInterval();
      }
    }
  }

  private updateBpmDisplay(): void {
    if (this.bpmDisplay) {
      this.bpmDisplay.textContent = `${this.bpm} BPM`;
    }
  }
}

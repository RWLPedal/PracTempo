// ts/guitar/views/floating_metronome_view.ts
import { View } from "../../view";
import { AppSettings } from "../../settings";
import { AudioController } from "../../audio_controller";
import { MetronomeView } from "./metronome_view"; // Import the original view

/**
 * A floating view that wraps the main MetronomeView, making it
 * available as a draggable, independent component.
 */
export class FloatingMetronomeView implements View {
  private metronomeView: MetronomeView;
  private audioController: AudioController;

  constructor(appSettings?: AppSettings) {
    // The floating metronome needs its own AudioController instance.
    this.audioController = new AudioController(
        document.querySelector("#intro-end-sound") as HTMLAudioElement,
        document.querySelector("#interval-end-sound") as HTMLAudioElement,
        document.querySelector("#metronome-sound") as HTMLAudioElement,
        document.querySelector("#metronome-accent-sound") as HTMLAudioElement
    );
    
    // Create an instance of the original MetronomeView with a default BPM.
    // The BPM will be controlled by the UI within the MetronomeView itself.
    this.metronomeView = new MetronomeView(120, this.audioController);
  }

  /**
   * Delegates rendering to the wrapped MetronomeView instance.
   */
  render(container: HTMLElement): void {
    this.metronomeView.render(container);
  }

  /**
   * Delegates the start action to the wrapped MetronomeView.
   */
  start(): void {
    this.metronomeView.start();
  }

  /**
   * Delegates the stop action to the wrapped MetronomeView.
   */
  stop(): void {
    this.metronomeView.stop();
  }

  /**
   * Delegates the destroy action to the wrapped MetronomeView.
   */
  destroy(): void {
    this.metronomeView.destroy();
  }
}
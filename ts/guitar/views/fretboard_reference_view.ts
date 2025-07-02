// ts/guitar/views/fretboard_reference_view.ts
import { View } from "../../view";
import { AppSettings } from "../../settings";
import { NotesFeature } from "../features/notes_feature";
import { AudioController } from "../../audio_controller";
import { GuitarIntervalSettings } from "../guitar_interval_settings";

/**
 * A floating view that acts as a persistent fretboard reference
 * by displaying the NotesFeature.
 */
export class FretboardReferenceView implements View {
  private appSettings: AppSettings;
  private audioController: AudioController; // Dummy controller
  private notesFeature: NotesFeature | null = null;
  private viewContainer: HTMLElement | null = null;

  constructor(appSettings?: AppSettings) {
    if (!appSettings) {
      throw new Error("FretboardReferenceView requires AppSettings.");
    }
    this.appSettings = appSettings;
    // Create a dummy audio controller as it's required by the feature constructor
    this.audioController = new AudioController(null, null, null, null);
  }

  render(container: HTMLElement): void {
    this.viewContainer = container;
    this.viewContainer.innerHTML = ""; // Clear previous content

    // Create a default instance of GuitarIntervalSettings (no metronome)
    const intervalSettings = new GuitarIntervalSettings();

    // Create an instance of the NotesFeature
    // Config: ['None'] to show all notes without interval coloring
    // We pass a smaller maxCanvasHeight to make it more suitable for a floating window
    this.notesFeature = new NotesFeature(
      ['None'], // Config to show standard note names
      this.appSettings,
      null, // rootNoteName (null for standard note colors)
      intervalSettings,
      this.audioController,
      450 // Max height for a more compact floating view
    );

    // The feature's render method adds its own header
    this.notesFeature.render(this.viewContainer);

    // The feature's views (like FretboardView) are rendered into a container
    // that the DisplayController would normally manage. We'll do it manually here.
    const diagramContainer = document.createElement('div');
    this.viewContainer.appendChild(diagramContainer);

    this.notesFeature.views.forEach(view => {
        view.render(diagramContainer);
    });
  }

  start(): void {
    this.notesFeature?.start?.();
  }

  stop(): void {
    this.notesFeature?.stop?.();
  }

  destroy(): void {
    this.notesFeature?.destroy?.();
    if (this.viewContainer) {
      this.viewContainer.innerHTML = "";
    }
    this.viewContainer = null;
  }
}
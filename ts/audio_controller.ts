export class AudioController {
  introEndSoundEl: HTMLAudioElement | null;
  intervalEndSoundEl: HTMLAudioElement | null;
  metronomeAudioEl: HTMLAudioElement | null;
  accentMetronomeAudioEl: HTMLAudioElement | null;

  /**
   * @param introEndSoundEl - Audio element for intro end sound.
   * @param intervalEndSoundEl - Audio element for interval end sound.
   * @param metronomeAudioEl - Audio element for the standard metronome click.
   * @param accentMetronomeAudioEl - Audio element for the accented metronome click.
   */
  constructor(
      introEndSoundEl: HTMLAudioElement | null,
      intervalEndSoundEl: HTMLAudioElement | null,
      metronomeAudioEl: HTMLAudioElement | null,
      accentMetronomeAudioEl: HTMLAudioElement | null
    ) {
    this.introEndSoundEl = introEndSoundEl;
    this.intervalEndSoundEl = intervalEndSoundEl;
    this.metronomeAudioEl = metronomeAudioEl;
    this.accentMetronomeAudioEl = accentMetronomeAudioEl;

    // Optional: Check if elements were found
    if (!this.metronomeAudioEl) console.warn("AudioController: Standard metronome element not provided.");
    if (!this.accentMetronomeAudioEl) console.warn("AudioController: Accent metronome element not provided.");
  }

  private playSound(audioElement: HTMLAudioElement | null): void {
    if (audioElement) {
      audioElement.currentTime = 0; // Rewind before playing
      audioElement.play().catch(e => console.error("Audio play failed:", e));
    } else {
      console.warn("Attempted to play null audio element.");
    }
  }

  playIntroEnd(): void {
    this.playSound(this.introEndSoundEl);
  }

  playIntervalEnd(): void {
    this.playSound(this.intervalEndSoundEl);
  }

  playMetronomeClick(): void {
      this.playSound(this.metronomeAudioEl);
  }

  playAccentMetronomeClick(): void {
      this.playSound(this.accentMetronomeAudioEl);
  }
}
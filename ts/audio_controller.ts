export class AudioController {
  introEndSoundEl: HTMLElement;
  intervalEndSoundEl: HTMLElement;

  constructor(introEndSoundEl: HTMLElement, intervalEndSoundEl: HTMLElement) {
    this.introEndSoundEl = introEndSoundEl;
    this.intervalEndSoundEl = intervalEndSoundEl;
  }

  playSound(audioElement: any): void {
    audioElement.play();
  }

  playIntroEnd(): void {
    this.playSound(this.introEndSoundEl);
  }

  playIntervalEnd(): void {
    this.playSound(this.intervalEndSoundEl);
  }
}

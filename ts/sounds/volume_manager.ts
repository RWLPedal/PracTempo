// ts/sounds/volume_manager.ts
// Central master-volume manager — singleton shared across all audio output.

class VolumeManager {
  private _volume = 0.7;
  private _listeners: Array<(v: number) => void> = [];
  private _ctx: AudioContext | null = null;

  /** Current master volume [0, 1]. */
  getVolume(): number {
    return this._volume;
  }

  /** Set master volume clamped to [0, 1]. Notifies all listeners. */
  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    for (const l of this._listeners) l(this._volume);
  }

  /**
   * Subscribe to volume changes.
   * @returns An unsubscribe function.
   */
  onChange(cb: (v: number) => void): () => void {
    this._listeners.push(cb);
    return () => {
      this._listeners = this._listeners.filter(l => l !== cb);
    };
  }

  /**
   * Shared AudioContext for sustained/drone sounds.
   * Lazily created and resumed as needed.
   */
  getAudioContext(): AudioContext {
    if (!this._ctx || this._ctx.state === 'closed') {
      this._ctx = new AudioContext();
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  }
}

export const volumeManager = new VolumeManager();

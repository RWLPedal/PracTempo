// ts/sounds/drum_sounds.ts
// Synthesized drum sounds via Web Audio API.

import { volumeManager } from './volume_manager';

export type DrumSoundId = 'kick' | 'snare' | 'hihat' | 'open_hihat' | 'crash' | 'tom' | 'shaker';

export const DRUM_SOUND_LABELS: Record<DrumSoundId, string> = {
  kick:       'Kick',
  snare:      'Snare',
  hihat:      'HH',
  open_hihat: 'OHH',
  crash:      'Crash',
  tom:        'Tom',
  shaker:     'Shkr',
};

export const ALL_DRUM_SOUND_IDS: DrumSoundId[] = ['kick', 'snare', 'hihat', 'open_hihat', 'crash', 'tom', 'shaker'];

// Shared AudioContext reused across calls to avoid repeated warm-up latency.
let _ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new AudioContext();
  }
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

/** Kick: sine oscillator with rapid pitch drop (thump) */
export function playKick(volume = 0.8): void {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    console.warn('drum_sounds: kick', e);
  }
}

/** Snare: filtered noise burst + short tonal body */
export function playSnare(volume = 0.7): void {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;

    // White noise component (snare rattle)
    const noiseLen    = Math.ceil(ctx.sampleRate * 0.18);
    const noiseBuffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const noiseData   = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) noiseData[i] = Math.random() * 2 - 1;

    const noise       = ctx.createBufferSource();
    noise.buffer      = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type           = 'bandpass';
    noiseFilter.frequency.value = 3000;
    noiseFilter.Q.value         = 0.8;
    const noiseGain   = ctx.createGain();
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseGain.gain.setValueAtTime(volume * 0.9, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noise.start(now);
    noise.stop(now + 0.18);

    // Tonal body (drum shell resonance)
    const osc     = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.06);
    oscGain.gain.setValueAtTime(volume * 0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) {
    console.warn('drum_sounds: snare', e);
  }
}

/** Internal helper: high-pass filtered noise burst */
function playNoiseBurst(volume: number, duration: number, hpFreq: number): void {
  try {
    const ctx    = getContext();
    const now    = ctx.currentTime;
    const len    = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data   = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src    = ctx.createBufferSource();
    src.buffer   = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type            = 'highpass';
    filter.frequency.value = hpFreq;
    const gain   = ctx.createGain();
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.start(now);
    src.stop(now + duration);
  } catch (e) {
    console.warn('drum_sounds: noise burst', e);
  }
}

/** Closed hi-hat: very short high-frequency noise */
export function playHiHat(volume = 0.6): void {
  playNoiseBurst(volume, 0.055, 8000);
}

/** Open hi-hat: longer high-frequency noise */
export function playOpenHiHat(volume = 0.5): void {
  playNoiseBurst(volume, 0.28, 7000);
}

/** Crash cymbal: long bandpass noise with slow decay */
export function playCrash(volume = 0.55): void {
  try {
    const ctx  = getContext();
    const now  = ctx.currentTime;
    const dur  = 1.5;
    const len  = Math.ceil(ctx.sampleRate * dur);
    const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src    = ctx.createBufferSource();
    src.buffer   = buf;
    const filter = ctx.createBiquadFilter();
    filter.type            = 'bandpass';
    filter.frequency.value = 6000;
    filter.Q.value         = 0.3;
    const gain   = ctx.createGain();
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.start(now);
    src.stop(now + dur);
  } catch (e) {
    console.warn('drum_sounds: crash', e);
  }
}

/** Tom: sine oscillator with mid-range pitch drop */
export function playTom(volume = 0.75): void {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.warn('drum_sounds: tom', e);
  }
}

/** Shaker: bandpass-filtered noise burst with quick attack */
export function playShaker(volume = 0.55): void {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;
    const dur = 0.09;
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src    = ctx.createBufferSource();
    src.buffer   = buf;
    const filter = ctx.createBiquadFilter();
    filter.type             = 'bandpass';
    filter.frequency.value  = 5500;
    filter.Q.value          = 0.6;
    const gain   = ctx.createGain();
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.setValueAtTime(volume * 0.7, now + dur * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.start(now);
    src.stop(now + dur);
  } catch (e) {
    console.warn('drum_sounds: shaker', e);
  }
}

/** Play a drum sound by ID. Volume is scaled by the master volume. */
export function playDrumSound(id: DrumSoundId, volume = 0.7): void {
  const scaled = volume * volumeManager.getVolume();
  switch (id) {
    case 'kick':       playKick(scaled);       break;
    case 'snare':      playSnare(scaled);      break;
    case 'hihat':      playHiHat(scaled);      break;
    case 'open_hihat': playOpenHiHat(scaled);  break;
    case 'crash':      playCrash(scaled);      break;
    case 'tom':        playTom(scaled);        break;
    case 'shaker':     playShaker(scaled);     break;
  }
}

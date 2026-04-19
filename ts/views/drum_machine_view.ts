// ts/views/drum_machine_view.ts
import { View } from '../view';
import {
  DrumSoundId,
  DRUM_SOUND_LABELS,
  ALL_DRUM_SOUND_IDS,
  playDrumSound,
} from '../sounds/drum_sounds';
import { chord_tones_library } from '../guitar/chords';
import { volumeManager } from '../sounds/volume_manager';

// ─── Data types ────────────────────────────────────────────────────────────────

type TrackData = (DrumSoundId | null)[];

interface DrumPreset {
  name: string;
  bpm: number;
  steps: number;
  tracks: TrackData[];
}

// ─── Chord progression helpers ─────────────────────────────────────────────────

/** Root names indexed A=0, matching chord_tones_library keys. */
const CHORD_ROOTS = ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab'];

interface RomanEntry { roman: string; degree: number; suffix: string; }

const MAJOR_ROMANS: RomanEntry[] = [
  { roman: 'I',      degree: 0,  suffix: 'MAJ'  },
  { roman: 'ii',     degree: 2,  suffix: 'MIN'  },
  { roman: 'iii',    degree: 4,  suffix: 'MIN'  },
  { roman: 'IV',     degree: 5,  suffix: 'MAJ'  },
  { roman: 'V',      degree: 7,  suffix: 'MAJ'  },
  { roman: 'vi',     degree: 9,  suffix: 'MIN'  },
  { roman: 'Imaj7',  degree: 0,  suffix: 'MAJ7' },
  { roman: 'IVmaj7', degree: 5,  suffix: 'MAJ7' },
  { roman: 'ii7',    degree: 2,  suffix: 'MIN7' },
  { roman: 'vi7',    degree: 9,  suffix: 'MIN7' },
];

const MINOR_ROMANS: RomanEntry[] = [
  { roman: 'i',      degree: 0,  suffix: 'MIN'  },
  { roman: 'III',    degree: 3,  suffix: 'MAJ'  },
  { roman: 'iv',     degree: 5,  suffix: 'MIN'  },
  { roman: 'v',      degree: 7,  suffix: 'MIN'  },
  { roman: 'VI',     degree: 8,  suffix: 'MAJ'  },
  { roman: 'VII',    degree: 10, suffix: 'MAJ'  },
  { roman: 'im7',    degree: 0,  suffix: 'MIN7' },
  { roman: 'iv7',    degree: 5,  suffix: 'MIN7' },
  { roman: 'VImaj7', degree: 8,  suffix: 'MAJ7' },
];

const CHORD_SUFFIX_COLOR: Record<string, string> = {
  MAJ:  '#2C4A7C',
  MIN:  '#4E7FBA',
  MAJ7: '#7B6EA8',
  MIN7: '#5B9AB0',
};

function chordToneFreq(toneName: string, octave: number): number {
  const idx = CHORD_ROOTS.indexOf(toneName);
  if (idx === -1) return 0;
  return 440 * Math.pow(2, (idx + 12 * (octave - 4)) / 12);
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const NUM_TRACKS = 4;
const NUM_CHORD_MEASURES = 4;

const SOUND_COLORS: Record<DrumSoundId, string> = {
  kick:       '#2C4A7C',
  snare:      '#4E7FBA',
  hihat:      '#7A96A8',
  open_hihat: '#5B9AB0',
  crash:      '#7B6EA8',
};

// ─── Preset library ────────────────────────────────────────────────────────────

function emptyTracks(steps: number): TrackData[] {
  return Array.from({ length: NUM_TRACKS }, () => new Array(steps).fill(null));
}

const PRESETS: DrumPreset[] = [
  { name: '— Empty —',   bpm: 120, steps: 16, tracks: emptyTracks(16) },
  {
    name: 'Rock Beat', bpm: 120, steps: 16,
    tracks: [
      ['kick', null, null, null, null, null, null, null, 'kick', null, null, 'kick', null, null, null, null],
      [null, null, null, null, 'snare', null, null, null, null, null, null, null, 'snare', null, null, null],
      ['hihat', null, 'hihat', null, 'hihat', null, 'hihat', null, 'hihat', null, 'hihat', null, 'hihat', null, 'hihat', null],
      ['crash', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    ],
  },
  {
    name: 'Funk', bpm: 100, steps: 16,
    tracks: [
      ['kick', null, null, 'kick', null, null, 'kick', null, null, null, 'kick', null, null, 'kick', null, null],
      [null, null, null, null, 'snare', null, null, null, null, null, null, null, 'snare', null, 'snare', null],
      ['hihat','hihat','hihat','hihat','hihat','hihat','hihat','hihat','hihat','hihat','hihat','hihat','hihat','hihat','hihat','hihat'],
      [null, null, null, null, null, null, 'open_hihat', null, null, null, null, null, null, null, 'open_hihat', null],
    ],
  },
  {
    name: 'Electronic', bpm: 128, steps: 16,
    tracks: [
      ['kick', null, null, null, 'kick', null, null, null, 'kick', null, null, null, 'kick', null, null, null],
      [null, null, null, null, 'snare', null, null, null, null, null, null, null, 'snare', null, null, null],
      [null, null, 'open_hihat', null, null, null, 'open_hihat', null, null, null, 'open_hihat', null, null, null, 'open_hihat', null],
      ['crash', null, 'hihat', null, 'hihat', null, 'hihat', null, 'hihat', null, 'hihat', null, 'hihat', null, 'hihat', null],
    ],
  },
];

// ─── View ──────────────────────────────────────────────────────────────────────

export class DrumMachineView implements View {
  // Drum playback state
  private bpm: number = 120;
  private steps: number = 16;
  private tracks: TrackData[] = [];
  private selectedSound: DrumSoundId | null = 'kick';
  private isPlaying: boolean = false;
  private currentStep: number = -1;
  private intervalId: number | null = null;

  // Chord progression state
  private progRootNote: string = 'C';
  private progKeyType: 'Major' | 'Minor' = 'Major';
  private selectedChord: string | null = null;           // Active Roman numeral "tool"
  private measureChords: (string | null)[] = new Array(NUM_CHORD_MEASURES).fill(null);
  private currentMeasure: number = -1;

  // DOM refs
  private container: HTMLElement | null = null;
  private gridEl: HTMLElement | null = null;
  private cellEls: HTMLElement[][] = [];
  private stepNumEls: HTMLElement[] = [];
  private playBtn: HTMLButtonElement | null = null;
  private bpmSliderEl: HTMLInputElement | null = null;
  private bpmDisplayEl: HTMLElement | null = null;
  private stepsSelectEl: HTMLSelectElement | null = null;
  private soundPaletteBtns: Map<DrumSoundId, HTMLButtonElement> = new Map();
  private chordToolSelectEl: HTMLSelectElement | null = null;
  private progRootSelectEl: HTMLSelectElement | null = null;
  private progKeyTypeBtn: HTMLButtonElement | null = null;
  private chordMeasureCellEls: HTMLElement[] = [];

  constructor(initialState?: any) {
    this.bpm   = initialState?.bpm   ?? 120;
    this.steps = initialState?.steps ?? 16;
    this.initTracks(initialState?.tracks);
  }

  // ─── View interface ──────────────────────────────────────────────────────────

  render(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.classList.add('drum-machine-view');

    wrapper.appendChild(this.buildControls());
    wrapper.appendChild(this.buildPalette());

    this.gridEl = document.createElement('div');
    this.gridEl.classList.add('dm-grid');
    wrapper.appendChild(this.gridEl);
    this.rebuildGrid();

    container.appendChild(wrapper);
  }

  start(): void { /* no-op */ }
  stop(): void  { /* no-op */ }

  destroy(): void {
    this.stopPlayback();
    this.container        = null;
    this.gridEl           = null;
    this.cellEls          = [];
    this.stepNumEls       = [];
    this.playBtn          = null;
    this.bpmSliderEl      = null;
    this.bpmDisplayEl     = null;
    this.stepsSelectEl    = null;
    this.soundPaletteBtns.clear();
    this.chordToolSelectEl = null;
    this.progRootSelectEl  = null;
    this.progKeyTypeBtn    = null;
    this.chordMeasureCellEls = [];
  }

  // ─── Controls row (Preset / BPM / Steps / Play) ──────────────────────────────

  private buildControls(): HTMLElement {
    const row = document.createElement('div');
    row.classList.add('dm-controls');

    // Preset selector
    row.appendChild(this.buildLabeledControl('Preset', () => {
      const wrap = document.createElement('div');
      wrap.classList.add('select', 'is-small');
      const sel = document.createElement('select');
      PRESETS.forEach((p, i) => sel.appendChild(new Option(p.name, String(i))));
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.value, 10);
        if (!isNaN(idx)) this.applyPreset(PRESETS[idx]);
      });
      wrap.appendChild(sel);
      return wrap;
    }));

    // BPM
    row.appendChild(this.buildLabeledControl('BPM', () => {
      const group = document.createElement('div');
      group.classList.add('dm-bpm-group');

      this.bpmSliderEl       = document.createElement('input');
      this.bpmSliderEl.type  = 'range';
      this.bpmSliderEl.min   = '60';
      this.bpmSliderEl.max   = '200';
      this.bpmSliderEl.value = String(this.bpm);
      this.bpmSliderEl.classList.add('dm-bpm-slider');
      this.bpmSliderEl.addEventListener('input', () => {
        this.bpm = parseInt(this.bpmSliderEl!.value, 10);
        if (this.bpmDisplayEl) this.bpmDisplayEl.textContent = String(this.bpm);
        if (this.isPlaying) { this.stopInterval(); this.startInterval(); }
      });

      this.bpmDisplayEl = document.createElement('span');
      this.bpmDisplayEl.classList.add('dm-bpm-display');
      this.bpmDisplayEl.textContent = String(this.bpm);

      group.appendChild(this.bpmSliderEl);
      group.appendChild(this.bpmDisplayEl);
      return group;
    }));

    // Steps
    row.appendChild(this.buildLabeledControl('Steps', () => {
      const wrap = document.createElement('div');
      wrap.classList.add('select', 'is-small');
      this.stepsSelectEl = document.createElement('select');
      [8, 16].forEach(n => {
        const opt = new Option(String(n), String(n));
        if (n === this.steps) opt.selected = true;
        this.stepsSelectEl!.appendChild(opt);
      });
      this.stepsSelectEl.addEventListener('change', () => {
        const n = parseInt(this.stepsSelectEl!.value, 10);
        if (!isNaN(n) && n !== this.steps) this.changeSteps(n);
      });
      wrap.appendChild(this.stepsSelectEl);
      return wrap;
    }));

    // Play/Stop
    this.playBtn = document.createElement('button');
    this.playBtn.classList.add('button', 'is-small', 'dm-play-btn');
    this.playBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
    this.playBtn.title = 'Play / Stop';
    this.playBtn.addEventListener('click', () => {
      if (this.isPlaying) this.stopPlayback();
      else this.startPlayback();
    });
    row.appendChild(this.playBtn);

    return row;
  }

  private buildLabeledControl(labelText: string, buildContent: () => HTMLElement): HTMLElement {
    const group = document.createElement('div');
    group.classList.add('dm-control-group');
    const lbl = document.createElement('label');
    lbl.classList.add('dm-label');
    lbl.textContent = labelText;
    group.appendChild(lbl);
    group.appendChild(buildContent());
    return group;
  }

  // ─── Palette row (sounds + key + chord tool) ─────────────────────────────────

  private buildPalette(): HTMLElement {
    const palette = document.createElement('div');
    palette.classList.add('dm-palette');

    // Sound buttons
    const soundLbl = document.createElement('span');
    soundLbl.classList.add('dm-label');
    soundLbl.textContent = 'Sound:';
    palette.appendChild(soundLbl);

    this.soundPaletteBtns.clear();
    for (const id of ALL_DRUM_SOUND_IDS) {
      const btn = document.createElement('button');
      btn.classList.add('button', 'is-small', 'dm-sound-btn');
      btn.textContent = DRUM_SOUND_LABELS[id];
      btn.style.setProperty('--dm-color', SOUND_COLORS[id]);
      btn.dataset.soundId = id;
      if (id === this.selectedSound) btn.classList.add('is-active');
      btn.addEventListener('click', () => {
        // Selecting a drum sound deselects any active chord tool
        this.selectedSound = (this.selectedSound === id) ? null : id;
        if (this.selectedSound) {
          this.selectedChord = null;
          this.updateChordToolSelect();
        }
        this.updatePaletteSelection();
        if (this.selectedSound === id) playDrumSound(id);
      });
      this.soundPaletteBtns.set(id, btn);
      palette.appendChild(btn);
    }

    // Separator
    const sep = document.createElement('span');
    sep.classList.add('dm-palette-sep');
    palette.appendChild(sep);

    // Key root dropdown
    const keyLbl = document.createElement('span');
    keyLbl.classList.add('dm-label');
    keyLbl.textContent = 'Key:';
    palette.appendChild(keyLbl);

    const rootWrap = document.createElement('div');
    rootWrap.classList.add('select', 'is-small');
    this.progRootSelectEl = document.createElement('select');
    CHORD_ROOTS.forEach(r => {
      const opt = new Option(r, r);
      if (r === this.progRootNote) opt.selected = true;
      this.progRootSelectEl!.appendChild(opt);
    });
    this.progRootSelectEl.addEventListener('change', () => {
      this.progRootNote = this.progRootSelectEl!.value;
      this.selectedChord = null;
      this.rebuildChordToolOptions();
    });
    rootWrap.appendChild(this.progRootSelectEl);
    palette.appendChild(rootWrap);

    // Major / Minor toggle
    this.progKeyTypeBtn = document.createElement('button');
    this.progKeyTypeBtn.classList.add('button', 'is-small', 'dm-key-type-btn');
    this.progKeyTypeBtn.textContent = this.progKeyType;
    this.progKeyTypeBtn.addEventListener('click', () => {
      this.progKeyType = this.progKeyType === 'Major' ? 'Minor' : 'Major';
      this.progKeyTypeBtn!.textContent = this.progKeyType;
      this.selectedChord = null;
      this.rebuildChordToolOptions();
    });
    palette.appendChild(this.progKeyTypeBtn);

    // Chord tool dropdown
    const chordLbl = document.createElement('span');
    chordLbl.classList.add('dm-label');
    chordLbl.textContent = 'Chord:';
    palette.appendChild(chordLbl);

    const chordWrap = document.createElement('div');
    chordWrap.classList.add('select', 'is-small');
    this.chordToolSelectEl = document.createElement('select');
    this.chordToolSelectEl.classList.add('dm-chord-tool-select');
    this.rebuildChordToolOptions();
    this.chordToolSelectEl.addEventListener('change', () => {
      this.selectedChord = this.chordToolSelectEl!.value || null;
      // Selecting a chord tool deselects any active drum sound
      if (this.selectedChord) {
        this.selectedSound = null;
        this.updatePaletteSelection();
      }
      this.updateChordToolSelect();
    });
    chordWrap.appendChild(this.chordToolSelectEl);
    palette.appendChild(chordWrap);

    return palette;
  }

  private rebuildChordToolOptions(): void {
    if (!this.chordToolSelectEl) return;
    this.chordToolSelectEl.innerHTML = '';
    this.chordToolSelectEl.appendChild(new Option('— none —', ''));
    const romans = this.progKeyType === 'Major' ? MAJOR_ROMANS : MINOR_ROMANS;
    for (const entry of romans) {
      const chordKey = this.resolveChordKey(entry);
      if (!chordKey) continue;
      const label = `${entry.roman} — ${chord_tones_library[chordKey]?.name ?? entry.roman}`;
      const opt = new Option(label, entry.roman);
      if (entry.roman === this.selectedChord) opt.selected = true;
      this.chordToolSelectEl.appendChild(opt);
    }
    // Also refresh measure cell labels in case chord names changed
    this.refreshAllMeasureCells();
  }

  private updateChordToolSelect(): void {
    if (!this.chordToolSelectEl) return;
    this.chordToolSelectEl.value = this.selectedChord ?? '';
    this.chordToolSelectEl.classList.toggle('dm-chord-tool-active', this.selectedChord !== null);
  }

  // ─── Grid ────────────────────────────────────────────────────────────────────

  private rebuildGrid(): void {
    if (!this.gridEl) return;
    this.gridEl.innerHTML = '';
    this.cellEls          = [];
    this.stepNumEls       = [];
    this.chordMeasureCellEls = [];

    // Header row — beat numbers
    const headerRow = document.createElement('div');
    headerRow.classList.add('dm-row', 'dm-header-row');
    headerRow.appendChild(this.makeTrackLabel(''));
    for (let s = 0; s < this.steps; s++) {
      const el = document.createElement('div');
      el.classList.add('dm-step-num');
      if (s % 4 === 0) el.textContent = String(s / 4 + 1);
      if (s > 0 && s % 4 === 0) el.classList.add('dm-beat-start');
      this.stepNumEls.push(el);
      headerRow.appendChild(el);
    }
    this.gridEl.appendChild(headerRow);

    // Drum track rows
    for (let t = 0; t < NUM_TRACKS; t++) {
      const row = document.createElement('div');
      row.classList.add('dm-row');
      row.appendChild(this.makeTrackLabel(`T${t + 1}`));
      const rowCells: HTMLElement[] = [];
      for (let s = 0; s < this.steps; s++) {
        const cell = document.createElement('div');
        cell.classList.add('dm-cell');
        if (s > 0 && s % 4 === 0) cell.classList.add('dm-beat-start');
        this.updateCellAppearance(cell, this.tracks[t][s]);
        cell.addEventListener('click', () => this.handleCellClick(t, s));
        rowCells.push(cell);
        row.appendChild(cell);
      }
      this.cellEls.push(rowCells);
      this.gridEl.appendChild(row);
    }

    // 5th section — one full-width chord row per measure, stacked vertically
    this.buildProgRows();
  }

  /** Appends NUM_CHORD_MEASURES rows to the grid, each as wide as one drum loop. */
  private buildProgRows(): void {
    if (!this.gridEl) return;
    this.chordMeasureCellEls = [];

    // Thin separator before the chord section
    const sep = document.createElement('div');
    sep.classList.add('dm-prog-separator');
    this.gridEl.appendChild(sep);

    for (let m = 0; m < NUM_CHORD_MEASURES; m++) {
      const row = document.createElement('div');
      row.classList.add('dm-row', 'dm-prog-measure-row');

      // Label: measure number
      row.appendChild(this.makeTrackLabel(`M${m + 1}`));

      // Single full-width chord cell (flex:1, matches the step-cell content area)
      const cell = document.createElement('div');
      cell.classList.add('dm-measure-cell');
      this.updateMeasureCellAppearance(cell, this.measureChords[m]);
      cell.addEventListener('click', () => this.handleMeasureCellClick(m));
      this.chordMeasureCellEls.push(cell);
      row.appendChild(cell);

      this.gridEl.appendChild(row);
    }
  }

  private makeTrackLabel(text: string): HTMLElement {
    const el = document.createElement('div');
    el.classList.add('dm-track-label');
    el.textContent = text;
    return el;
  }

  // ─── Cell appearance ─────────────────────────────────────────────────────────

  private updateCellAppearance(cell: HTMLElement, sound: DrumSoundId | null): void {
    if (sound) {
      cell.style.background = SOUND_COLORS[sound];
      cell.textContent      = DRUM_SOUND_LABELS[sound].slice(0, 1);
      cell.classList.add('dm-cell-filled');
      cell.title = DRUM_SOUND_LABELS[sound];
    } else {
      cell.style.background = '';
      cell.textContent      = '';
      cell.classList.remove('dm-cell-filled');
      cell.title = '';
    }
  }

  private updateMeasureCellAppearance(cell: HTMLElement, chord: string | null): void {
    if (chord) {
      const romans = this.progKeyType === 'Major' ? MAJOR_ROMANS : MINOR_ROMANS;
      const entry = romans.find(r => r.roman === chord);
      const chordKey = entry ? this.resolveChordKey(entry) : null;
      const chordName = chordKey ? (chord_tones_library[chordKey]?.name ?? chord) : chord;
      const color = CHORD_SUFFIX_COLOR[entry?.suffix ?? 'MAJ'] ?? '#2C4A7C';

      cell.textContent = chord;
      cell.title       = chordName;
      cell.style.setProperty('--dm-measure-color', color);
      cell.classList.add('dm-measure-filled');
    } else {
      cell.textContent = '';
      cell.title       = '';
      cell.style.removeProperty('--dm-measure-color');
      cell.classList.remove('dm-measure-filled');
    }
  }

  private refreshAllMeasureCells(): void {
    this.chordMeasureCellEls.forEach((cell, m) => {
      const isCurrent = this.currentMeasure === m;
      this.updateMeasureCellAppearance(cell, this.measureChords[m]);
      if (isCurrent) cell.classList.add('dm-measure-current');
    });
  }

  // ─── Click handlers ──────────────────────────────────────────────────────────

  private handleCellClick(track: number, step: number): void {
    const current = this.tracks[track][step];
    if (this.selectedSound !== null) {
      this.tracks[track][step] = (current === this.selectedSound) ? null : this.selectedSound;
      if (this.tracks[track][step]) playDrumSound(this.selectedSound!);
    } else {
      this.tracks[track][step] = null;
    }
    const cell = this.cellEls[track]?.[step];
    if (cell) {
      const isCurrent = this.currentStep === step;
      this.updateCellAppearance(cell, this.tracks[track][step]);
      if (isCurrent) cell.classList.add('dm-cell-current');
    }
  }

  private handleMeasureCellClick(measureIndex: number): void {
    const current = this.measureChords[measureIndex];
    if (this.selectedChord !== null) {
      this.measureChords[measureIndex] = (current === this.selectedChord) ? null : this.selectedChord;
    } else {
      this.measureChords[measureIndex] = null;
    }
    const cell = this.chordMeasureCellEls[measureIndex];
    if (cell) {
      const isCurrent = this.currentMeasure === measureIndex;
      this.updateMeasureCellAppearance(cell, this.measureChords[measureIndex]);
      if (isCurrent) cell.classList.add('dm-measure-current');
    }
  }

  private updatePaletteSelection(): void {
    this.soundPaletteBtns.forEach((btn, id) => {
      btn.classList.toggle('is-active', id === this.selectedSound);
    });
  }

  // ─── Steps / preset changes ──────────────────────────────────────────────────

  private changeSteps(newSteps: number): void {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stopPlayback();
    for (let t = 0; t < NUM_TRACKS; t++) {
      const newTrack: TrackData = new Array(newSteps).fill(null);
      for (let s = 0; s < Math.min(this.steps, newSteps); s++) newTrack[s] = this.tracks[t][s];
      this.tracks[t] = newTrack;
    }
    this.steps = newSteps;
    this.currentStep = -1;
    this.rebuildGrid();
    if (wasPlaying) this.startPlayback();
  }

  private applyPreset(preset: DrumPreset): void {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stopPlayback();
    this.bpm   = preset.bpm;
    this.steps = preset.steps;
    this.initTracks(preset.tracks);
    this.currentStep = -1;
    if (this.bpmSliderEl)   this.bpmSliderEl.value = String(this.bpm);
    if (this.bpmDisplayEl)  this.bpmDisplayEl.textContent = String(this.bpm);
    if (this.stepsSelectEl) this.stepsSelectEl.value = String(this.steps);
    this.rebuildGrid();
    if (wasPlaying) this.startPlayback();
  }

  private initTracks(saved?: TrackData[]): void {
    this.tracks = [];
    for (let t = 0; t < NUM_TRACKS; t++) {
      const track: TrackData = new Array(this.steps).fill(null);
      if (saved?.[t]) {
        for (let s = 0; s < Math.min(saved[t].length, this.steps); s++) track[s] = saved[t][s];
      }
      this.tracks.push(track);
    }
  }

  // ─── Playback engine ─────────────────────────────────────────────────────────

  private startPlayback(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.updatePlayButton();
    this.startInterval();
  }

  private stopPlayback(): void {
    this.stopInterval();
    this.clearStepHighlight();
    this.clearMeasureHighlight();
    this.currentStep    = -1;
    this.currentMeasure = -1;
    this.isPlaying = false;
    this.updatePlayButton();
  }

  private startInterval(): void {
    if (this.intervalId !== null) return;
    const stepMs = (60000 * 4) / this.bpm / this.steps;
    this.intervalId = window.setInterval(() => this.tick(), stepMs);
  }

  private stopInterval(): void {
    if (this.intervalId !== null) { clearInterval(this.intervalId); this.intervalId = null; }
  }

  private tick(): void {
    this.clearStepHighlight();
    this.currentStep = (this.currentStep + 1) % this.steps;
    this.highlightStep(this.currentStep);

    // Drum hits
    for (let t = 0; t < NUM_TRACKS; t++) {
      const sound = this.tracks[t][this.currentStep];
      if (sound) playDrumSound(sound);
    }

    // Advance measure at the start of each drum loop
    if (this.currentStep === 0) {
      this.clearMeasureHighlight();
      this.currentMeasure = (this.currentMeasure + 1) % NUM_CHORD_MEASURES;
      this.highlightCurrentMeasure();
      const chord = this.measureChords[this.currentMeasure];
      if (chord) this.playChordDrone(chord);
    }
  }

  private clearStepHighlight(): void {
    if (this.currentStep < 0) return;
    for (const row of this.cellEls) row[this.currentStep]?.classList.remove('dm-cell-current');
    this.stepNumEls[this.currentStep]?.classList.remove('dm-step-current');
  }

  private highlightStep(step: number): void {
    for (const row of this.cellEls) row[step]?.classList.add('dm-cell-current');
    this.stepNumEls[step]?.classList.add('dm-step-current');
  }

  private clearMeasureHighlight(): void {
    for (const cell of this.chordMeasureCellEls) cell.classList.remove('dm-measure-current');
  }

  private highlightCurrentMeasure(): void {
    this.chordMeasureCellEls[this.currentMeasure]?.classList.add('dm-measure-current');
  }

  private updatePlayButton(): void {
    if (!this.playBtn) return;
    this.playBtn.innerHTML = this.isPlaying
      ? '<span class="material-icons">stop</span>'
      : '<span class="material-icons">play_arrow</span>';
    this.playBtn.classList.toggle('is-danger', this.isPlaying);
    this.playBtn.classList.toggle('is-light',  !this.isPlaying);
  }

  // ─── Chord drone ─────────────────────────────────────────────────────────────

  private resolveChordKey(entry: RomanEntry): string | null {
    const rootIdx = CHORD_ROOTS.indexOf(this.progRootNote);
    if (rootIdx === -1) return null;
    const chordRootIdx = (rootIdx + entry.degree) % 12;
    const key = `${CHORD_ROOTS[chordRootIdx]}_${entry.suffix}`;
    return chord_tones_library[key] ? key : null;
  }

  private playChordDrone(roman: string): void {
    const romans  = this.progKeyType === 'Major' ? MAJOR_ROMANS : MINOR_ROMANS;
    const entry   = romans.find(r => r.roman === roman);
    if (!entry) return;
    const chordKey = this.resolveChordKey(entry);
    if (!chordKey) return;
    const chordEntry = chord_tones_library[chordKey];
    if (!chordEntry) return;

    // One full loop duration in seconds
    const stepMs      = (60000 * 4) / this.bpm / this.steps;
    const measureSec  = (stepMs * this.steps) / 1000;
    const fadeSec     = Math.min(0.12, measureSec * 0.08);

    try {
      const ctx       = volumeManager.getAudioContext();
      const masterVol = volumeManager.getVolume();
      const chordVol  = 0.18 * masterVol;
      const now       = ctx.currentTime;

      chordEntry.tones.forEach((toneName, i) => {
        const octave = i === 0 ? 2 : 3;
        const freq   = chordToneFreq(toneName, octave);
        if (!freq) return;

        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(chordVol, now + fadeSec);
        gain.gain.setValueAtTime(chordVol, now + measureSec - fadeSec);
        gain.gain.linearRampToValueAtTime(0, now + measureSec);

        osc.start(now);
        osc.stop(now + measureSec);
      });
    } catch (e) {
      console.warn('DrumMachineView: chord drone error', e);
    }
  }
}

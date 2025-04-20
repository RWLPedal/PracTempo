var Timer;
(function (Timer) {
    class AudioController {
        constructor(introEndSoundEl, intervalEndSoundEl) {
            this.introEndSoundEl = introEndSoundEl;
            this.intervalEndSoundEl = intervalEndSoundEl;
        }
        playSound(audioElement) {
            audioElement.play();
        }
        playIntroEnd() {
            this.playSound(this.introEndSoundEl);
        }
        playIntervalEnd() {
            this.playSound(this.intervalEndSoundEl);
        }
    }
    Timer.AudioController = AudioController;
})(Timer || (Timer = {}));
var Timer;
(function (Timer) {
    class DisplayController {
        constructor(timerEl, totalTimerEl, taskWrapperEl, taskDisplayEl, diagramEl, statusEl, upcomingEl) {
            this.timerEl = timerEl;
            this.totalTimerEl = totalTimerEl;
            this.taskWrapperEl = taskWrapperEl;
            this.taskDisplayEl = taskDisplayEl;
            this.diagramEl = diagramEl;
            this.statusEl = statusEl;
            this.upcomingEl = upcomingEl;
        }
        setTask(taskName, color) {
            this.taskDisplayEl.innerText = taskName;
            this.taskWrapperEl.style['background-color'] = color;
        }
        setTime(seconds) {
            this.timerEl.innerText = this.formattedTime(seconds);
        }
        setTotalTime(seconds, totalDuration) {
            this.totalTimerEl.innerText =
                this.formattedTime(seconds) + " / " + this.formattedTime(totalDuration);
        }
        setUpcoming(upcomingIntervals) {
            this.clearAllChildren(this.upcomingEl);
            for (const interval of upcomingIntervals) {
                const intervalEl = document.createElement("li");
                const text = `${interval.task} [${this.formattedTime(interval.duration)}]`;
                intervalEl.innerText = text;
                this.upcomingEl.appendChild(intervalEl);
            }
        }
        renderFeature(feature) {
            feature.render(this.diagramEl);
        }
        clearFeature() {
            this.clearAllChildren(this.diagramEl);
        }
        formattedTime(totalSeconds) {
            const remainder = Math.floor(totalSeconds / 60);
            const seconds = (totalSeconds % 60) + "";
            if (remainder < 60) {
                return `${remainder}:${seconds.padStart(2, '0')}`;
            }
            const hours = Math.floor(remainder / 60);
            const minutes = (remainder % 60) + "";
            return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
        }
        clearAllChildren(element) {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }
    }
    Timer.DisplayController = DisplayController;
})(Timer || (Timer = {}));
// <reference path="feature.ts" />
var Guitar;
(function (Guitar) {
    const stringWidths = [
        3, 3, 2, 2, 1, 1
    ];
    const music_notes = [
        ["A"],
        ["A#", "Bb"],
        ["B"],
        ["C"],
        ["C#"],
        ["D"],
        ["D#", "Eb"],
        ["E"],
        ["F"],
        ["F#", "Gb"],
        ["G"],
        ["G#", "Ab"],
    ];
    // Number of markers, starting from the nut.
    const fretboardMarkerDots = [
        0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 2, 0, 0, 1, 0, 1, 0, 1, 0, 1
    ];
    // Fret numbers to label, starting from the nut.
    const fretNumbers = [
        "", "", "", "III", "", "V", "", "VII", "", "IX", "", "",
        "XII", "", "", "XV", "", "XVII", "", "XIX", "", "XXI"
    ];
    // Offsets from A, for EADGBE tuning. More tunings to be supported.
    const tuning = [7, 0, 5, 10, 2, 7];
    const START_PX = 35;
    const STRING_WIDTH_PX = 25;
    const FRET_LENGTH_PX = 30;
    const NOTE_RADIUS_PX = 8;
    class Feature {
        constructor(config) {
            this.config = config;
        }
        clearAllChildren(element) {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }
        // Creates a header and appends it to the given element, returning the
        // header element.
        addHeader(element, text) {
            const headerEl = document.createElement('p');
            headerEl.classList.add('subtitle');
            headerEl.innerText = text;
            element.appendChild(headerEl);
            return headerEl;
        }
        // Creates a standard canvas and appends it to the given element, returning
        // the canvas.
        addCanvas(element) {
            const canvasEl = document.createElement('canvas');
            canvasEl.id = 'canvas';
            canvasEl.width = 400;
            canvasEl.height = 600;
            element.appendChild(canvasEl);
            return canvasEl;
        }
        // Renders an empty fretboard with the given parameters.
        renderFrets(ctx, startLeft, startTop, stringWidth, fretLength, fretCount) {
            const textHeight = 12;
            ctx.fillStyle = "#aaa";
            // Verticals
            for (var i = 0; i < 6; i++) {
                ctx.beginPath();
                ctx.lineWidth = stringWidths[i];
                ctx.moveTo(startLeft + i * stringWidth, startTop);
                ctx.lineTo(startLeft + i * stringWidth, startTop + (fretCount * fretLength));
                ctx.stroke();
            }
            // Horizontals
            // Start with lineWidth 2 for the nut.
            ctx.lineWidth = 2;
            ctx.font = textHeight + 'px';
            for (var i = 0; i <= fretCount; i++) {
                ctx.beginPath();
                ctx.moveTo(startLeft, startTop + i * fretLength);
                ctx.lineTo(startLeft + (5 * stringWidth), startTop + i * fretLength);
                if (fretNumbers[i]) {
                    ctx.fillText(fretNumbers[i], startLeft - 30, startTop + (i - .5) * fretLength + (textHeight / 4));
                }
                ctx.stroke();
                ctx.lineWidth = 1;
                if (fretboardMarkerDots[i] == 1) {
                    ctx.beginPath();
                    ctx.arc(startLeft + 2.5 * STRING_WIDTH_PX, startTop + (i - .5) * FRET_LENGTH_PX, NOTE_RADIUS_PX / 2, 0, 2 * Math.PI);
                    ctx.fill();
                }
                else if (fretboardMarkerDots[i] == 2) {
                    ctx.beginPath();
                    ctx.arc(startLeft + 1.5 * STRING_WIDTH_PX, startTop + (i - .5) * FRET_LENGTH_PX, NOTE_RADIUS_PX / 2, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(startLeft + 3.5 * STRING_WIDTH_PX, startTop + (i - .5) * FRET_LENGTH_PX, NOTE_RADIUS_PX / 2, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        }
        drawStar(ctx, x, y, r, n, inset) {
            ctx.save();
            ctx.beginPath();
            ctx.translate(x, y);
            ctx.moveTo(0, 0 + r);
            for (var i = 0; i < n; i++) {
                ctx.rotate(Math.PI / n);
                ctx.lineTo(0, 0 + (r * inset));
                ctx.rotate(Math.PI / n);
                ctx.lineTo(0, 0 + r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        displayScale(diagramEl, scale, key) {
            this.clearAllChildren(diagramEl);
            const keyName = music_notes[key][0];
            this.addHeader(diagramEl, scale.name + " Scale, Key of " + keyName);
            const canvasEl = this.addCanvas(diagramEl);
            diagramEl.appendChild(canvasEl);
            this.drawScale(canvasEl, scale, key);
        }
        drawScale(canvasEl, scale, keyOffset) {
            const fretCount = 18;
            const ctx = canvasEl.getContext('2d');
            // Reset.
            ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
            ctx.fillStyle = 'black';
            ctx.resetTransform();
            ctx.translate(0.5, 0.5);
            this.renderFrets(ctx, START_PX, START_PX, STRING_WIDTH_PX, FRET_LENGTH_PX, fretCount);
            var i = 1;
            var fretNum = 1;
            for (var i = 0; i < 6; i++) {
                for (var j = 0; j <= fretCount; j++) {
                    var pos = tuning[i] - keyOffset + j;
                    pos = pos >= 0 ? pos : 12 + pos;
                    const yPos = j - .5;
                    if (scale.degrees.indexOf(pos % 12) >= 0) {
                        ctx.fillStyle = 'black';
                        ctx.beginPath();
                        ctx.arc(START_PX + i * STRING_WIDTH_PX, START_PX + yPos * FRET_LENGTH_PX, NOTE_RADIUS_PX, 0, 2 * Math.PI);
                        if (yPos > 0) {
                            ctx.fill();
                        }
                        ctx.stroke();
                    }
                    if (pos % 12 == 0) {
                        ctx.fillStyle = yPos > 0 ? 'white' : 'black';
                        this.drawStar(ctx, START_PX + i * STRING_WIDTH_PX, START_PX + yPos * FRET_LENGTH_PX, NOTE_RADIUS_PX / 2, 5, 2);
                    }
                }
            }
        }
        // Displays the given chords.
        displayChords(diagramEl, chords) {
            this.clearAllChildren(diagramEl);
            const chordNames = [];
            for (const chord of chords) {
                chordNames.push(chord.name + " Chord");
            }
            this.addHeader(diagramEl, chordNames.join(", "));
            const canvasEl = this.addCanvas(diagramEl);
            diagramEl.appendChild(canvasEl);
            for (const [i, chord] of chords.entries()) {
                this.drawChord(canvasEl, chord, i);
            }
        }
        drawChord(canvasEl, chord, index) {
            const fretCount = 6;
            const fontSize = 12;
            const ctx = canvasEl.getContext('2d');
            ctx.resetTransform();
            ctx.translate(0.5, 0.5);
            const leftIndex = index % 2;
            const leftPos = START_PX * (leftIndex + 1) + leftIndex * STRING_WIDTH_PX * 6;
            const topIndex = Math.floor(index / 2);
            const topPos = START_PX * (topIndex + 1) + topIndex * fretCount * FRET_LENGTH_PX;
            this.renderFrets(ctx, leftPos, topPos, STRING_WIDTH_PX, FRET_LENGTH_PX, fretCount);
            var i = 1;
            var fretNum = 1;
            ctx.font = fontSize + 'px Sans-serif';
            for (var i = 0; i < chord.strings.length; i++) {
                ctx.fillStyle = 'black';
                const fret = chord.strings[i];
                const finger = chord.fingers[i];
                const yPos = fret - .5;
                ctx.beginPath();
                if (fret >= 0) {
                    ctx.arc(leftPos + i * STRING_WIDTH_PX, topPos + yPos * FRET_LENGTH_PX, NOTE_RADIUS_PX, 0, 2 * Math.PI);
                    if (fret > 0) {
                        ctx.fill();
                        if (finger > 0) {
                            ctx.fillStyle = 'white';
                            // Arbitrary positioning of 1/3 fontSize.
                            ctx.fillText("" + finger, leftPos + i * STRING_WIDTH_PX - fontSize / 3, topPos + yPos * FRET_LENGTH_PX + fontSize / 3);
                        }
                    }
                    ctx.stroke();
                }
                else {
                    // A muted string.
                    //Downward to the left.
                    ctx.moveTo(leftPos + i * STRING_WIDTH_PX - .5 * NOTE_RADIUS_PX, topPos - 2 * NOTE_RADIUS_PX);
                    ctx.lineTo(leftPos + i * STRING_WIDTH_PX + .5 * NOTE_RADIUS_PX, topPos - 1 * NOTE_RADIUS_PX);
                    // Downward to the right.
                    ctx.moveTo(leftPos + i * STRING_WIDTH_PX + .5 * NOTE_RADIUS_PX, topPos - 2 * NOTE_RADIUS_PX);
                    ctx.lineTo(leftPos + i * STRING_WIDTH_PX - .5 * NOTE_RADIUS_PX, topPos - 1 * NOTE_RADIUS_PX);
                    ctx.stroke();
                }
            }
        }
        // Simply displays the notes on the fretboard.
        displayNotes(diagramEl) {
            this.clearAllChildren(diagramEl);
            this.addHeader(diagramEl, "Notes on the fretboard");
            const canvasEl = this.addCanvas(diagramEl);
            diagramEl.appendChild(canvasEl);
            this.drawNotes(canvasEl);
        }
        drawNotes(canvasEl) {
            const fretCount = 18;
            const fontSize = 16;
            const ctx = canvasEl.getContext('2d');
            ctx.fillStyle = 'black';
            ctx.resetTransform();
            ctx.translate(0.5, 0.5);
            this.renderFrets(ctx, START_PX, START_PX, STRING_WIDTH_PX, FRET_LENGTH_PX, fretCount);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 8;
            ctx.fillStyle = 'black';
            ctx.font = fontSize + 'px Sans-serif';
            for (var i = 0; i < 6; i++) {
                for (var j = 0; j <= fretCount; j++) {
                    var pos = (tuning[i] + j) % 12;
                    ctx.strokeText(music_notes[pos][0], START_PX + i * STRING_WIDTH_PX - fontSize / 2, START_PX + j * FRET_LENGTH_PX - fontSize / 2);
                    ctx.fillText(music_notes[pos][0], START_PX + i * STRING_WIDTH_PX - fontSize / 2, START_PX + j * FRET_LENGTH_PX - fontSize / 2);
                }
            }
        }
        getKeyIndex(keyName) {
            for (var i = 0; i < music_notes.length; i++) {
                if (music_notes[i].indexOf(keyName) >= 0) {
                    return i;
                }
            }
            // Should be displayed to user.
            console.log("Unknown key: " + keyName);
            return 0;
        }
        render(container) {
            switch (this.config[0]) {
                case "Notes":
                    this.displayNotes(container);
                    break;
                case "Scale":
                    const key = this.config.length > 2 ?
                        this.getKeyIndex(this.config[2]) : 0;
                    if (scale_names[this.config[1]]) {
                        const scale = scales[scale_names[this.config[1]]];
                        scale.name = this.config[1];
                        this.displayScale(container, scale, key);
                    }
                    else if (scales[this.config[1]]) {
                        this.displayScale(container, scales[this.config[1]], key);
                    }
                    break;
                case "Chord":
                    const chords = [];
                    for (var i = 1; i < this.config.length; i++) {
                        if (this.config[i] == "Chord") {
                            i++;
                        }
                        chords.push(chord_library[this.config[i]]);
                    }
                    this.displayChords(container, chords);
                    break;
            }
        }
    }
    Guitar.Feature = Feature;
    class Fret {
        constructor(index, strings, patterns) {
            this.index = index;
            if (strings.length != 6) {
                throw new Error("Incorrect string count: " + index);
            }
            this.strings = strings;
            this.patterns = patterns;
        }
    }
    class Scale {
        constructor(name, degrees) {
            this.name = name;
            this.degrees = degrees;
        }
    }
    class Chord {
        constructor(name, strings, fingers) {
            this.name = name;
            this.strings = strings;
            this.fingers = fingers;
        }
    }
    const categories = [
        "Chord",
        "Scale",
        "Notes",
        "TAB",
    ];
    const chord_library = {
        "A_MAJOR": new Chord("A", [-1, 0, 2, 2, 2, 0], [-1, 0, 2, 1, 3, 0]),
        "C_MAJOR": new Chord("C", [-1, 3, 2, 0, 1, 0], [-1, 3, 2, 0, 1, 0]),
        "D_MAJOR": new Chord("D", [-1, -1, 0, 1, 2, 1], [-1, -1, 2, 1, 2, 3]),
        "E_MAJOR": new Chord("E", [0, 2, 2, 1, 0, 0], [0, 2, 3, 1, 0, 0]),
        "F_MAJOR": new Chord("F", [1, 3, 3, 2, 1, 1], [1, 3, 4, 2, 1, 1]),
    };
    const scale_names = {
        "Blues": "MINOR_BLUES",
        "Minor Blues": "MINOR_BLUES",
        "Major Blues": "MAJOR_BLUES",
        "Natural Minor": "NATURAL_MINOR",
        "Pure Minor": "NATURAL_MINOR",
        "Minor": "NATURAL_MINOR",
        "Major": "MAJOR",
        "Spanish Minor": "PHRYGIAN",
        "Dominant 7th": "MIXOLYDIAN",
        "Half-Diminished": "LOCRIAN",
        "Lydian Major": "LYDIAN",
        "Pentatonic Minor": "MINOR_PENTATONIC",
        "Pentatonic Major": "MAJOR_PENTATONIC",
        "Country & Western": "MAJOR_PENTATONIC",
        // Modes
        "Ionian Mode": "MAJOR",
        "Dorian Mode": "DORIAN",
        "Dorian Minor": "DORIAN",
        "Phrygian Mode": "PHRYGIAN",
        "Lydian Mode": "LYDIAN",
        "Mixolydian Mode": "MIXOLYDIAN",
        "Aeolian Mode": "NATURAL_MINOR",
        "Locrian Mode": "LOCRIAN",
    };
    const scales = {
        "DORIAN": new Scale("Dorian Minor", [0, 2, 3, 5, 7, 9, 10]),
        "PHRYGIAN": new Scale("Spanish Minor", [0, 1, 3, 5, 7, 8, 10]),
        "LYDIAN": new Scale("Lydian", [0, 2, 4, 6, 7, 9, 11]),
        "MIXOLYDIAN": new Scale("Mixolydian", [0, 2, 4, 5, 7, 9, 10]),
        "LOCRIAN": new Scale("Locrian", [0, 1, 3, 5, 6, 8, 10]),
        "MAJOR": new Scale("Major", [0, 2, 4, 5, 7, 9, 11]),
        "MAJOR_BLUES": new Scale("Blues (Minor Blues)", [0, 2, 3, 4, 7, 9]),
        "MAJOR_PENTATONIC": new Scale("Major Pentatonic", [0, 2, 4, 7, 9]),
        "MINOR_BLUES": new Scale("Blues (Minor Blues)", [0, 3, 5, 6, 7, 10]),
        "MINOR_PENTATONIC": new Scale("Minor Pentatonic", [0, 3, 5, 7, 10]),
        "NATURAL_MINOR": new Scale("Natural Minor", [0, 2, 3, 5, 7, 8, 10]),
    };
})(Guitar || (Guitar = {}));
// <reference path="audio_controller.ts" />
// <reference path="display_controller.ts" />
// <reference path="feature.ts" />
// <reference path="guitar.ts" />
// <reference path="schedule.ts" />
// <reference path="schedule_editor.ts" />
// The HTML countdown timer. If this is not null, the timer is running.
var Timer;
(function (Timer) {
    class Main {
        constructor() {
            this.currentSchedule = null;
            this.displayController = new Timer.DisplayController(document.querySelector("#timer"), document.querySelector("#total-timer"), document.querySelector("#task-wrapper"), document.querySelector("#task"), document.querySelector('#diagram'), document.querySelector('#status'), document.querySelector('#upcoming'));
            this.audioController = new Timer.AudioController(document.querySelector('#intro-end-sound'), document.querySelector('#interval-end-sound'));
            this.scheduleEditor = new Timer.ScheduleEditor(document.querySelector("#schedule-editor"), document.querySelector("#schedule-pretty-editor"), document.querySelector("#schedule-text-editor"), document.querySelector("#set-schedule-control"), this.reset);
            console.log("test");
            this.addControlHandlers();
            this.currentSchedule = this.scheduleEditor.getSchedule(this.displayController, this.audioController);
            this.currentSchedule.prepare();
        }
        addControlHandlers() {
            this.controlButtonEl = document.querySelector("#start-control");
            this.controlButtonEl.onclick = () => this.toggleCountdown();
            document.querySelector("#reset-control").onclick =
                this.reset;
        }
        toggleCountdown() {
            if (!this.currentSchedule || this.currentSchedule.isFinished()) {
                this.reset();
            }
            if (this.currentSchedule.isRunning()) {
                this.currentSchedule.pause();
                this.controlButtonEl.innerText = 'START';
                this.controlButtonEl.classList.remove('is-warning');
                this.controlButtonEl.classList.add('is-success');
            }
            else {
                this.currentSchedule.start();
                this.controlButtonEl.innerText = 'PAUSE';
                this.controlButtonEl.classList.remove('is-success');
                this.controlButtonEl.classList.add('is-warning');
            }
        }
        reset() {
            if (this.currentSchedule) {
                this.currentSchedule.pause();
            }
            this.currentSchedule = this.scheduleEditor.getSchedule(this.displayController, this.audioController);
            this.currentSchedule.prepare();
            this.controlButtonEl.innerText = 'START';
            this.controlButtonEl.classList.remove('is-warning');
            this.controlButtonEl.classList.add('is-success');
        }
    }
    Timer.Main = Main;
})(Timer || (Timer = {}));
function init() {
    new Timer.Main();
}
var Timer;
(function (Timer) {
    // Colors for tasks in intervals.
    const intervalColors = [
        '#e7cba9',
        '#aad9cd',
        '#e8d595',
        '#8da47e',
        '#e9bbb5',
    ];
    var countdownTimer = null;
    // An instance of a schedule.
    class Schedule {
        constructor(display, audio) {
            this.display = display;
            this.audio = audio;
            this.intervals = [];
            this.currentIntervalIndex = 0;
            this.accumulatedSeconds = 0;
            this.totalDuration = 0;
            this.color_index = 0;
        }
        addInterval(interval) {
            interval.setCallbacks(this.onIntroEnd.bind(this), this.onTimerUpdate.bind(this), this.onIntervalEnd.bind(this));
            interval.setColor(intervalColors[this.color_index]);
            this.color_index = (this.color_index + 1) % intervalColors.length;
            this.totalDuration += interval.getTotalDuration();
            this.intervals.push(interval);
        }
        isFinished() {
            return this.currentIntervalIndex >= this.intervals.length;
        }
        isRunning() {
            return countdownTimer != null;
        }
        getCurrentInterval() {
            return this.isFinished() ?
                null : this.intervals[this.currentIntervalIndex];
        }
        onTimerUpdate(time) {
            this.display.setTime(time);
            this.display.setTotalTime(this.accumulatedSeconds, this.totalDuration);
            this.accumulatedSeconds++;
        }
        onIntroEnd() {
            this.audio.playIntroEnd();
        }
        onIntervalEnd() {
            this.currentIntervalIndex += 1;
            this.audio.playIntervalEnd();
            if (!this.isFinished()) {
                this.setDisplayTask(this.getCurrentInterval());
                this.updateUpcoming();
                this.intervals[this.currentIntervalIndex].start();
            }
            else {
                this.setDisplayFinished();
            }
            countdownTimer = null;
        }
        setDisplayTask(interval) {
            this.display.setTask(interval.task, interval.color);
            if (interval.feature) {
                this.display.renderFeature(interval.feature);
            }
            else {
                this.display.clearFeature();
            }
        }
        setDisplayFinished() {
            this.display.setTask('DONE!', '');
        }
        updateUpcoming() {
            if (this.isFinished()) {
                this.display.setUpcoming([]);
                return;
            }
            const upcomingTasks = [];
            const maxSize = Math.min(this.currentIntervalIndex + 3, this.intervals.length);
            for (var i = this.currentIntervalIndex + 1; i < maxSize; i++) {
                upcomingTasks.push(this.intervals[i]);
            }
            this.display.setUpcoming(upcomingTasks);
        }
        start() {
            const interval = this.getCurrentInterval();
            if (!interval) {
                return;
            }
            interval.start();
        }
        prepare() {
            this.display.setTime(this.getCurrentInterval().duration);
            this.setDisplayTask(this.getCurrentInterval());
            this.updateUpcoming();
        }
        pause() {
            const interval = this.getCurrentInterval();
            if (!interval) {
                return;
            }
            interval.pause();
        }
    }
    Timer.Schedule = Schedule;
    // An interval in a schedule.
    class Interval {
        constructor(duration, introDuration, task, feature) {
            this.duration = duration;
            this.introDuration = introDuration;
            this.task = task;
            this.feature = feature;
            this.timer = new IntervalTimer(duration, introDuration);
        }
        setColor(color) {
            this.color = color;
        }
        setCallbacks(introFinishedCallback, updateCallback, finishedCallback) {
            this.timer.setCallbacks(introFinishedCallback, updateCallback, finishedCallback);
        }
        getTotalDuration() {
            return this.duration + this.introDuration;
        }
        start() {
            this.timer.countdown();
        }
        pause() {
            this.timer.pause();
        }
    }
    Timer.Interval = Interval;
    // Controls timing and the countdown timer.
    class IntervalTimer {
        constructor(time, introductionTime) {
            this.timeRemaining = time;
            this.introTimeRemaining = introductionTime;
            this.isIntroFinished = introductionTime == 0 ? true : false;
        }
        setCallbacks(introFinishedCallback, updateCallback, finishedCallback) {
            this.introFinishedCallback = introFinishedCallback;
            this.updateCallback = updateCallback;
            this.finishedCallback = finishedCallback;
        }
        countdown() {
            if (this.timeRemaining == 0) {
                this.finishedCallback();
                return;
            }
            if (this.introTimeRemaining > 0) {
                this.updateCallback(this.introTimeRemaining);
                this.introTimeRemaining -= 1;
                countdownTimer = setTimeout(() => this.countdown(), 1000);
                return;
            }
            else if (!this.isIntroFinished) {
                this.introFinishedCallback();
                this.isIntroFinished = true;
            }
            if (this.timeRemaining > 0) {
                this.updateCallback(this.timeRemaining);
                this.timeRemaining -= 1;
                countdownTimer = setTimeout(() => this.countdown(), 1000);
            }
            else {
                this.finishedCallback();
            }
        }
        pause() {
            clearTimeout(countdownTimer);
            countdownTimer = null;
        }
    }
})(Timer || (Timer = {}));
// <reference path="audio_controller.ts" />
// <reference path="display_controller.ts" />
// <reference path="feature.ts" />
// <reference path="schedule.ts" />
var Timer;
(function (Timer) {
    const scheduleRegEx = /([0-9:]+),?([A-z0-9#, ]+)*/;
    class ScheduleEditor {
        constructor(el, prettyEl, textEl, updateButtonEl, updateAction) {
            this.el = el;
            this.prettyEl = el;
            this.textEl = textEl;
            this.updateButtonEl = updateButtonEl;
            this.updateButtonEl.onclick = updateAction;
        }
        // Given an input in the form "seconds", "minutes:seconds" or
        // "hours:minutes:seconds", output total seconds as a number.
        getTotalSeconds(input) {
            const split = input.split(":");
            var seconds = 0;
            for (var i = split.length - 1; i >= 0; i--) {
                seconds += Number(split[i]) * Math.pow(60, split.length - i - 1);
            }
            return seconds;
        }
        getSchedule(displayController, audioController) {
            const scheduleText = this.textEl.value.trim();
            const lines = scheduleText.split("\n").map((el) => el.trim());
            const schedule = new Timer.Schedule(displayController, audioController);
            for (const line of lines) {
                const parsed = line.match(scheduleRegEx);
                if (!parsed) {
                    console.log("Invalid format");
                    continue;
                }
                const seconds = this.getTotalSeconds(parsed[1]);
                const introTime = Number.parseFloat(document.querySelector("#warmup").value)
                    || 0;
                const additionalInfo = parsed[2] ? parsed[2].split(",").map((el) => el.trim()) : [];
                const name = additionalInfo.length > 0 ? additionalInfo[0] : "";
                const feature = additionalInfo.length <= 1 ? null :
                    new Guitar.Feature(additionalInfo.slice(1));
                const interval = new Timer.Interval(seconds, introTime, name, feature);
                schedule.addInterval(interval);
            }
            return schedule;
        }
    }
    Timer.ScheduleEditor = ScheduleEditor;
})(Timer || (Timer = {}));
//# sourceMappingURL=main.js.map
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.IntervalTimer = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioController = void 0;
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
exports.AudioController = AudioController;

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisplayController = exports.Status = void 0;
var Status;
(function (Status) {
    Status["Play"] = "Play";
    Status["Pause"] = "Pause";
    Status["Stop"] = "Stop";
})(Status || (exports.Status = Status = {}));
;
class DisplayController {
    constructor(timerEl, totalTimerEl, taskWrapperEl, taskDisplayEl, diagramEl, statusEl, upcomingEl, controlButtonEl) {
        this.timerEl = timerEl;
        this.totalTimerEl = totalTimerEl;
        this.taskWrapperEl = taskWrapperEl;
        this.taskDisplayEl = taskDisplayEl;
        this.diagramEl = diagramEl;
        this.statusEl = statusEl;
        this.upcomingEl = upcomingEl;
        this.controlButtonEl = controlButtonEl;
    }
    setTask(taskName, color) {
        this.taskDisplayEl.innerText = taskName;
        this.taskWrapperEl.style['background-color'] = color;
    }
    setTime(seconds) {
        this.timerEl.innerText = this.formattedTime(seconds);
    }
    setStatus(status) {
        switch (status) {
            case Status.Play:
                this.statusEl.innerHTML = "<img src='images/play.svg'>";
                return;
            case Status.Pause:
                this.statusEl.innerHTML = "<img src='images/pause.svg'>";
                return;
            case Status.Stop:
                this.statusEl.innerHTML = "<img src='images/stop.svg'>";
                return;
            default:
                console.log("Unknown status");
        }
    }
    flashOverlay() {
        const overlay = document.getElementById("overlay");
        overlay.classList.remove("hidden");
        overlay.classList.add("visible");
        setTimeout(() => {
            overlay.classList.remove("visible");
            overlay.classList.add("hidden");
        }, 500);
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
        console.log('rendering feature');
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
    setStart() {
        this.controlButtonEl.innerText = 'START';
        this.controlButtonEl.classList.remove('is-warning');
        this.controlButtonEl.classList.add('is-success');
    }
    setPause() {
        this.controlButtonEl.innerText = 'PAUSE';
        this.controlButtonEl.classList.remove('is-success');
        this.controlButtonEl.classList.add('is-warning');
    }
}
exports.DisplayController = DisplayController;

},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chord_library = exports.Chord = void 0;
class Chord {
    constructor(name, strings, fingers) {
        this.name = name;
        this.strings = strings;
        this.fingers = fingers;
    }
}
exports.Chord = Chord;
exports.chord_library = {
    // Simple majors
    "A_MAJOR": new Chord("A", [-1, 0, 2, 2, 2, 0], [-1, 0, 2, 1, 3, 0]),
    "C_MAJOR": new Chord("C", [-1, 3, 2, 0, 1, 0], [-1, 3, 2, 0, 1, 0]),
    "D_MAJOR": new Chord("D", [-1, -1, 0, 2, 3, 2], [-1, -1, 0, 1, 2, 3]),
    "E_MAJOR": new Chord("E", [0, 2, 2, 1, 0, 0], [0, 2, 3, 1, 0, 0]),
    "F_MAJOR": new Chord("F", [1, 3, 3, 2, 1, 1], [1, 3, 4, 2, 1, 1]),
    "G_MAJOR": new Chord("G", [3, 2, 0, 0, 0, 3], [2, 1, 0, 0, 0, 3]),
    // small F
    // Simple minors
    "A_MINOR": new Chord("A minor", [-1, 0, 2, 2, 1, 0], [0, 0, 2, 3, 1, 0]),
    "B_MINOR": new Chord("B", [-1, 1, 3, 3, 2, 1], [-1, 1, 3, 4, 2, 1]),
    "D_MINOR": new Chord("D minor", [-1, -1, 0, 2, 3, 1], [-1, -1, 0, 2, 3, 1]),
    "E_MINOR": new Chord("E minor", [0, 2, 2, 0, 0, 0], [0, 2, 3, 0, 0, 0]),
};

},{}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fretboard = exports.FretboardConfig = exports.STANDARD_TUNING = exports.Tuning = void 0;
class Tuning {
    // Offsets from A. For example, standard EADGBE tuning would be:
    // [7, 0, 5, 10, 2, 7]
    constructor(tuning) {
        this.tuning = tuning;
    }
}
exports.Tuning = Tuning;
exports.STANDARD_TUNING = new Tuning([7, 0, 5, 10, 2, 7]);
class FretboardConfig {
    constructor(tuning, 
    // Marker dots to show, starting from the nut.
    markerDots = [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 2, 0, 0, 1, 0, 1, 0, 1, 0, 1], 
    // Fret numbers to label, starting from the nut.
    sideNumbers = [
        "", "", "", "III", "", "V", "", "VII", "", "IX", "", "",
        "XII", "", "", "XV", "", "XVII", "", "XIX", "", "XXI"
    ], 
    // Number of pixels to render each string.
    stringWidths = [
        3, 3, 2, 2, 1, 1
    ], 
    // pixels between the start of each string.
    stringSpacingPx = 25, 
    // Pixels between the start of each fret.
    fretLengthPx = 30, markerDotRadiusPx = 5) {
        this.tuning = tuning;
        this.markerDots = markerDots;
        this.sideNumbers = sideNumbers;
        this.stringWidths = stringWidths;
        this.stringSpacingPx = stringSpacingPx;
        this.fretLengthPx = fretLengthPx;
        this.markerDotRadiusPx = markerDotRadiusPx;
    }
}
exports.FretboardConfig = FretboardConfig;
class Fretboard {
    constructor(config, leftPx = 45, topPx = 45, fretCount) {
        this.config = config;
        this.leftPx = leftPx;
        this.topPx = topPx;
        this.fretCount = fretCount;
    }
    // Renders an empty fretboard with the given parameters.
    render(ctx) {
        const textHeight = 12;
        ctx.fillStyle = "#aaa";
        // Verticals
        for (var i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.lineWidth = this.config.stringWidths[i];
            ctx.moveTo(this.leftPx + i * this.config.stringSpacingPx, this.topPx);
            ctx.lineTo(this.leftPx + i * this.config.stringSpacingPx, this.topPx + (this.fretCount * this.config.fretLengthPx));
            ctx.stroke();
        }
        // Horizontals
        // Start with lineWidth 2 for the nut.
        ctx.lineWidth = 2;
        ctx.font = textHeight + 'px';
        for (var i = 0; i <= this.fretCount; i++) {
            ctx.beginPath();
            ctx.moveTo(this.leftPx, this.topPx + i * this.config.fretLengthPx);
            ctx.lineTo(this.leftPx + (5 * this.config.stringSpacingPx), this.topPx + i * this.config.fretLengthPx);
            if (this.config.sideNumbers[i]) {
                ctx.fillText(this.config.sideNumbers[i], this.leftPx - 30, this.topPx + (i - .5) * this.config.fretLengthPx + (textHeight / 4));
            }
            ctx.stroke();
            ctx.lineWidth = 1;
            if (this.config.markerDots[i] == 1) {
                ctx.beginPath();
                ctx.arc(this.leftPx + 2.5 * this.config.stringSpacingPx, this.topPx + (i - .5) * this.config.fretLengthPx, this.config.markerDotRadiusPx, 0, 2 * Math.PI);
                ctx.fill();
            }
            else if (this.config.markerDots[i] == 2) {
                ctx.beginPath();
                ctx.arc(this.leftPx + 1.5 * this.config.stringSpacingPx, this.topPx + (i - .5) * this.config.fretLengthPx, this.config.markerDotRadiusPx, 0, 2 * Math.PI);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(this.leftPx + 3.5 * this.config.stringSpacingPx, this.topPx + (i - .5) * this.config.fretLengthPx, this.config.markerDotRadiusPx, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
    /** Renders a circle over the string */
    renderFingering(ctx, fret, string, label, noteRadiusPx, fontSize, bgColor = 'black', fgColor = 'white', drawStar = false) {
        const yPos = fret - .5;
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        if (fret >= 0) {
            ctx.arc(this.leftPx + string * this.config.stringSpacingPx, this.topPx + yPos * this.config.fretLengthPx, noteRadiusPx, 0, 2 * Math.PI);
            if (fret > 0) {
                ctx.fill();
            }
            if (label !== '') {
                ctx.fillStyle = fgColor;
                // Arbitrary positioning of 1/3 fontSize.
                ctx.fillText(label, this.leftPx + string * this.config.stringSpacingPx - fontSize / 3, this.topPx + yPos * this.config.fretLengthPx + fontSize / 3);
            }
            ctx.stroke();
        }
        else {
            this.drawMutedString(ctx, string, noteRadiusPx);
        }
        if (drawStar) {
            this.drawStar(ctx, this.leftPx + string * this.config.stringSpacingPx, this.topPx + yPos * this.config.fretLengthPx, noteRadiusPx / 2, 5, 2);
        }
    }
    /** Draws a text label over the strong with a "halo" to make it legible. */
    renderTextLabel(ctx, fret, string, label, fontSize, fontWidth, font, bgColor = 'white', fgColor = 'black') {
        ctx.strokeStyle = bgColor;
        ctx.lineWidth = fontWidth;
        ctx.fillStyle = fgColor;
        ctx.font = font;
        ctx.strokeText(label, this.leftPx + string * this.config.stringSpacingPx - fontSize / 2, this.topPx + fret * this.config.fretLengthPx - fontSize / 2);
        ctx.fillText(label, this.leftPx + string * this.config.stringSpacingPx - fontSize / 2, this.topPx + fret * this.config.fretLengthPx - fontSize / 2);
    }
    /** Draws an X above a muted string. */
    drawMutedString(ctx, stringNumber, radiusPx) {
        //Downward to the left.
        ctx.moveTo(this.leftPx + stringNumber * this.config.stringSpacingPx - .5 * radiusPx, this.topPx - 2 * radiusPx);
        ctx.lineTo(this.leftPx + stringNumber * this.config.stringSpacingPx + .5 * radiusPx, this.topPx - 1 * radiusPx);
        // Downward to the right.
        ctx.moveTo(this.leftPx + stringNumber * this.config.stringSpacingPx + .5 * radiusPx, this.topPx - 2 * radiusPx);
        ctx.lineTo(this.leftPx + stringNumber * this.config.stringSpacingPx - .5 * radiusPx, this.topPx - 1 * radiusPx);
        ctx.stroke();
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
}
exports.Fretboard = Fretboard;

},{}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuitarFeature = void 0;
const chords_1 = require("./chords");
const fretboard_1 = require("./fretboard");
const scales_1 = require("./scales");
// Converts array index to corresponding musical notes.
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
const FRETBOARD_CONFIG = new fretboard_1.FretboardConfig(fretboard_1.STANDARD_TUNING);
const DEFAULT_FRETBOARD = new fretboard_1.Fretboard(FRETBOARD_CONFIG, /*leftPx=*/ 45, /*topPx=*/ 45, /*fretCount=*/ 18);
const START_PX = 45;
const NOTE_RADIUS_PX = 10;
/**
 * Indices below are expressed as semitones from the root.
 * So for example the perfect 5th is 7 semitones above the root.
 */
const RAINBOW_COLORS = {
    0: {
        name: 'Root',
        color: '#56ec52',
    },
    /*4: {
      name: 'Major 3rd',
      style: 'star',
      color: '#ff4c4c',
    },
    7: {
      name: 'Perfect 5th',
      style: 'star',
      color: '#67cbf7',
    },*/
    'default': {
        color: '#444',
    }
};
// These should be kept in sync, allowing for some padding.
const CANVAS_SUBTITLE_HEIGHT_PX = 30;
const CANVAS_SUBTITLE_FONT = "30px 'Segoe UI'";
class GuitarFeature {
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
        canvasEl.width = 600;
        canvasEl.height = 600;
        element.appendChild(canvasEl);
        return canvasEl;
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
    displayScale(diagramEl, ctx, scale, key, scaleNumber, chordTones) {
        const keyName = music_notes[key][0];
        this.drawScale(ctx, scale, key, scaleNumber, chordTones);
    }
    drawScale(ctx, scale, keyOffset, 
    // If multiple scales are drawn.
    scaleNumber, chordTones) {
        const fretCount = 18;
        ctx.fillStyle = 'black';
        ctx.resetTransform();
        ctx.translate(0.5, 0.5);
        const startX = START_PX + scaleNumber * (DEFAULT_FRETBOARD.config.fretLengthPx * 6 + 25);
        const startY = START_PX;
        if (chordTones.length > 0) {
            ctx.font = '12px Sans-serif';
            ctx.fillText(chordTones.join('/'), startX, startY - DEFAULT_FRETBOARD.config.fretLengthPx);
        }
        const fretboard = new fretboard_1.Fretboard(FRETBOARD_CONFIG, startX, startY, fretCount);
        fretboard.render(ctx);
        const theme = RAINBOW_COLORS;
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j <= fretCount; j++) {
                let pos = fretboard.config.tuning.tuning[i] - keyOffset + j;
                pos = pos >= 0 ? pos : 12 + pos;
                const fretStyle = theme[pos % 12] != undefined ? theme[pos % 12] : theme['default'];
                const noteName = music_notes[(fretboard.config.tuning.tuning[i] + j) % 12][0];
                if (scale.degrees.indexOf(pos % 12) >= 0) {
                    const bgColor = chordTones.indexOf(noteName) >= 0 ? 'purple' : fretStyle.color;
                    const fgColor = j > 0 ? 'white' : 'black';
                    ctx.font = '12px Sans-serif';
                    const drawStar = pos % 12 == 0;
                    fretboard.renderFingering(ctx, j, i, noteName, NOTE_RADIUS_PX, 12, bgColor, fgColor, drawStar);
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
        const leftPos = START_PX * (leftIndex + 1) + leftIndex * DEFAULT_FRETBOARD.config.stringSpacingPx * 6;
        const topIndex = Math.floor(index / 2);
        const fullChordHeight = fretCount * DEFAULT_FRETBOARD.config.fretLengthPx + CANVAS_SUBTITLE_HEIGHT_PX;
        const topPos = START_PX * (topIndex + 1) + topIndex * fullChordHeight + CANVAS_SUBTITLE_HEIGHT_PX;
        ctx.font = CANVAS_SUBTITLE_FONT;
        ctx.fillStyle = 'black';
        ctx.fillText(chord.name, leftPos, topPos - CANVAS_SUBTITLE_HEIGHT_PX);
        const fretboard = new fretboard_1.Fretboard(FRETBOARD_CONFIG, leftPos, topPos, fretCount);
        ctx.font = fontSize + 'px Sans-serif';
        fretboard.render(ctx);
        var i = 1;
        for (let i = 0; i < chord.strings.length; i++) {
            const fret = chord.strings[i];
            const finger = chord.fingers[i];
            fretboard.renderFingering(ctx, fret, i, `${finger}`, NOTE_RADIUS_PX, fontSize, 'black', fret > 0 ? 'white' : 'black');
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
        const ctx = canvasEl.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.resetTransform();
        ctx.translate(0.5, 0.5);
        DEFAULT_FRETBOARD.render(ctx);
        for (var i = 0; i < 6; i++) {
            for (var j = 0; j <= DEFAULT_FRETBOARD.fretCount; j++) {
                var pos = (FRETBOARD_CONFIG.tuning.tuning[i] + j) % 12;
                DEFAULT_FRETBOARD.renderTextLabel(ctx, j, i, music_notes[pos][0], 14, 6, '14px Sans-serif');
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
    getChordTones(chordTones) {
        const chords = chordTones.split('|');
        const out = [];
        for (const chord of chords) {
            const tones = chord.split('-').map(e => e.trim());
            out.push(tones);
        }
        return out;
    }
    render(container) {
        console.log(this.config);
        // Reset.
        this.clearAllChildren(container);
        const canvasEl = this.addCanvas(container);
        container.appendChild(canvasEl);
        const ctx = canvasEl.getContext('2d');
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        switch (this.config[0]) {
            case "Notes":
                this.displayNotes(container);
                break;
            case "Scale":
                const scale = scales_1.scale_names[this.config[1]] ? scales_1.scales[scales_1.scale_names[this.config[1]]] : scales_1.scales[this.config[1]];
                const key = this.config.length > 2 ?
                    this.getKeyIndex(this.config[2]) : 0;
                const chordTones = this.config.length > 3 ?
                    this.getChordTones(this.config[3]) : [];
                this.addHeader(container, scale.name + " Scale, Key of " + music_notes[key]);
                if (scales_1.scale_names[this.config[1]]) {
                    console.log(chordTones);
                    if (chordTones.length > 0) {
                        for (let i = 0; i < chordTones.length; i++) {
                            scale.name = this.config[1];
                            this.displayScale(container, ctx, scale, key, /* offset= */ i, chordTones[i]);
                        }
                    }
                    else {
                        scale.name = this.config[1];
                        this.displayScale(container, ctx, scale, key, /* offset= */ 0, /* chordTones= */ []);
                    }
                }
                break;
            case "Chord":
                const chords = [];
                for (var i = 1; i < this.config.length; i++) {
                    if (this.config[i] == "Chord") {
                        i++;
                    }
                    chords.push(chords_1.chord_library[this.config[i]]);
                }
                this.displayChords(container, chords);
                break;
        }
    }
}
exports.GuitarFeature = GuitarFeature;
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

},{"./chords":3,"./fretboard":4,"./scales":6}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scales = exports.scale_names = exports.Scale = void 0;
class Scale {
    constructor(name, degrees) {
        this.name = name;
        this.degrees = degrees;
    }
}
exports.Scale = Scale;
exports.scale_names = {
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
/**
 * As a reference, the interval qualities by semitone.
 * 0	Perfect Unison	P1
 * 1	Minor 2nd	m2
 * 2	Major 2nd	M2
 * 3	Minor 3rd	m3
 * 4	Major 3rd	M3
 * 5	Perfect 4th	P4
 * 6	Augmented 4th/Diminished 5th	A4/d5
 * 7	Perfect 5th	P5
 * 8	Minor 6th	m6
 * 9	Major 6th	M6
 * 10	Minor 7th	m7
 * 11	Major 7th	M7
 * 12	Octave	P8
 */
exports.scales = {
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

},{}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = exports.Main = void 0;
const audio_controller_1 = require("./audio_controller");
const display_controller_1 = require("./display_controller");
const schedule_editor_1 = require("./schedule_editor");
// The HTML countdown timer. If this is not null, the timer is running.
class Main {
    constructor() {
        this.currentSchedule = null;
        this.displayController = new display_controller_1.DisplayController(document.querySelector("#timer"), document.querySelector("#total-timer"), document.querySelector("#task-wrapper"), document.querySelector("#task"), document.querySelector('#diagram'), document.querySelector('#status'), document.querySelector('#upcoming'), document.querySelector("#start-control"));
        this.audioController = new audio_controller_1.AudioController(document.querySelector('#intro-end-sound'), document.querySelector('#interval-end-sound'));
        this.scheduleEditor = new schedule_editor_1.ScheduleEditor(document.querySelector("#schedule-editor"), document.querySelector("#schedule-pretty-editor"), document.querySelector("#schedule-text-editor"), document.querySelector("#set-schedule-control"), () => this.reset());
        this.addControlHandlers();
        this.currentSchedule = this.scheduleEditor.getSchedule(this.displayController, this.audioController);
        this.currentSchedule.prepare();
    }
    addControlHandlers() {
        this.controlButtonEl = document.querySelector("#start-control");
        this.controlButtonEl.onclick = () => this.toggleCountdown();
        document.querySelector("#reset-control").onclick =
            () => this.reset();
    }
    toggleCountdown() {
        if (!this.currentSchedule || this.currentSchedule.isFinished()) {
            this.reset();
        }
        if (this.currentSchedule.isRunning()) {
            this.currentSchedule.pause();
        }
        else {
            this.currentSchedule.start();
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
exports.Main = Main;
function init() {
    new Main();
}
exports.init = init;
module.exports = { "init": init };

},{"./audio_controller":1,"./display_controller":2,"./schedule_editor":9}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Interval = exports.Schedule = void 0;
const display_controller_1 = require("./display_controller");
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
        this.setTotalTime();
        this.accumulatedSeconds++;
    }
    onIntroEnd() {
        this.audio.playIntroEnd();
        this.setDisplayTask(this.getCurrentInterval());
        this.display.flashOverlay();
    }
    onIntervalEnd() {
        this.currentIntervalIndex += 1;
        this.audio.playIntervalEnd();
        this.display.flashOverlay();
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
    setTotalTime() {
        this.display.setTotalTime(this.accumulatedSeconds, this.totalDuration);
    }
    setDisplayTask(interval) {
        console.log(interval);
        const suffix = interval.isIntroActive() ? " (Warmup)" : "";
        this.display.setTask(interval.task + suffix, interval.color);
        if (interval.feature) {
            this.display.renderFeature(interval.feature);
        }
        else {
            this.display.clearFeature();
        }
    }
    setDisplayFinished() {
        this.display.setTask('DONE!', '');
        this.display.setStatus(display_controller_1.Status.Stop);
        this.display.setStart();
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
        this.display.setPause();
        this.display.setStatus(display_controller_1.Status.Play);
        interval.start();
    }
    prepare() {
        this.display.setTime(this.getCurrentInterval().getCurrentTimeRemaining());
        this.setDisplayTask(this.getCurrentInterval());
        this.setTotalTime();
        this.updateUpcoming();
    }
    pause() {
        const interval = this.getCurrentInterval();
        if (!interval) {
            return;
        }
        this.display.setStart();
        this.display.setStatus(display_controller_1.Status.Pause);
        interval.pause();
    }
}
exports.Schedule = Schedule;
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
    isIntroActive() {
        return !this.timer.isIntroFinished;
    }
    getTotalDuration() {
        return this.duration + this.introDuration;
    }
    getCurrentTimeRemaining() {
        if (this.isIntroActive()) {
            return this.timer.introTimeRemaining;
        }
        return this.timer.timeRemaining;
    }
    start() {
        this.timer.countdown();
    }
    pause() {
        this.timer.pause();
    }
}
exports.Interval = Interval;
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
            this.introTimeRemaining -= 1;
            this.updateCallback(this.introTimeRemaining);
            countdownTimer = setTimeout(() => this.countdown(), 1000);
            return;
        }
        else if (!this.isIntroFinished) {
            this.isIntroFinished = true;
            this.introFinishedCallback();
        }
        if (this.timeRemaining > 0) {
            this.timeRemaining -= 1;
            this.updateCallback(this.timeRemaining);
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

},{"./display_controller":2}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleEditor = void 0;
const guitar_1 = require("./guitar/guitar");
const schedule_1 = require("./schedule");
const scheduleRegEx = /([0-9:]+),?([A-z0-9#,\-| ]+)*/;
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
        const schedule = new schedule_1.Schedule(displayController, audioController);
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
            console.log(additionalInfo);
            const feature = additionalInfo.length <= 1 ? null :
                new guitar_1.GuitarFeature(additionalInfo.slice(1));
            const interval = new schedule_1.Interval(seconds, introTime, name, feature);
            schedule.addInterval(interval);
        }
        return schedule;
    }
}
exports.ScheduleEditor = ScheduleEditor;

},{"./guitar/guitar":5,"./schedule":8}]},{},[7])(7)
});

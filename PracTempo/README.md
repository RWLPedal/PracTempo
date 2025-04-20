# Interval Timer

This is a context-specific interval timer, initially created for timing of
Guitar practice sessions. You can enter a schedule and receive notifications as
each interval on the schedule completes, as well as task-specific hints for each
interval. For example, in a guitar context, hints may include scale references
or chords,  tabs, etc.

[Try it here](https://robertlitzke.github.io/interval-timer/).

## TODOs
### General features
* Support UI for updating schedule without needing to modify CSVs (+CSV export).
* More subtle custom color scheme, maybe using Bulma.
* Improve documentation around the CSV schedule, hinting for supported options by feature class.
* Much more sophisticated implementation of instruction parsing.
* Basic support for some non-Guitar feature class, to ensure multiple feature classes work.
* Allow sub-intervals.
* Button to skip current task

### Infrastructure
* README with instructions :)
* Decompose some classes to more basic components.
* Add tests.
* Support cellphone form factors.
* Web workers.
* Support multiple languages.
* ARIA support.

### Guitar-related
* Add more scales.
* Add more chords. Support multiple chord representations.
* Support visual representation of barres for chords.
* Support triads
* Clean up coloring for intervals/triads
* Find good TAB format and display tabs.
* Allow fretboard rotation and support for left-handed mode.
* Prettier rendering of notes on fretboard.
* Show notes in scales on fretboard. Show scale degrees and spellings.
* Add rendering/color scheme for CAGED positions
* Add mode for training a particular CAGED position
* Support larger/rescaled fretboard
* Support licks/TAB notation
* Ability to save and load schedule
* Add more chords and chord shapes, and show chord title
* Metronome
* Clean up and better define functionality that shows important notes over chord changes
* Add coloration key for colored scales.

## Building

Interval Timer is implemented in Typescript and currently uses the CommonJS module system, and will output to a `./js` directory. It relies on [browserify](https://browserify.org/) and [tsify](https://www.npmjs.com/package/tsify) to compile and bundle the javascript. Interval Timer can be compiled with this command:

```
browserify main.ts -p tsify --standalone IntervalTimer > ../js/interval_timer.js
```

Which will run typescript compile according to tsconfig.json, using an entry point of `main.ts`, and compile a module named IntervalTimer to the `js/interval_timer.js` file. `IntervalTimer#init` is referenced from `index.html`'s body onload.
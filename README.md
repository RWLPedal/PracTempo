# PracTempo

PracTempo is a context-specific practice timer for easily practicing intervals.

It supports domain-specific rendering and information. Initially the focus is on guitar.

You can enter a schedule and receive notifications as
each interval on the schedule completes, as well as task-specific hints for each
interval. For example, in a guitar context, hints may include scale references
or chords,  tabs, etc.

## TODOs

Add settings - warmup, timing between activities, per-category settings (left-handed).
Make settings dynamic
Make the fret section of page larger.
Add 50 more common chords and 50 more scales. Validate them
Add fret magic squares and blocks.
Add csv import and export, recent exercises saved to local storage 
Add sheet music tool (and common notation - midi?)
Allow composable views (metronome within another feature, etc)
  Add hierarchy to separate views from features
Add versioning for each module for better saves and past runs
Chord hints mode (adjacent chord shapes)
Triad mode
  Metronome feature standalone
  Refactor guitar.ts
  Pause broken
CAGED system
hide schedule when running (global setting)
Stroke/fill colors
Set regular colors for the root/3rd/5th/etc.
Set regular colors for each note.
Toggle for note/etc coloration.
Make chord view bigger.

### General features
* Improve documentation around the CSV schedule, hinting for supported options by feature class.
* Basic support for some non-Guitar feature class, to ensure multiple feature classes work.
* Allow sub-intervals.
* Button to skip current task
* Support reference pages for a given feature

### Infrastructure
* README with instructions :)
* Decompose some classes to more basic components.
* Add tests.
* Support cellphone form factors, as well as rotation
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
* Add "capo" behavior for instruments that start at other locations or to understand cords with a capo on.
* Add catalog of fret icons besides stars.
* Support larger/rescaled fretboard
* Support licks/TAB notation
* Clean up and better define functionality that shows important notes over chord changes
* Add coloration key for colored scales.
* Sound: allow the user to click a note and for it to be played. Similar with chords.
* Add chord progression feature

## Building

PracTempo is implemented in Typescript and currently uses the CommonJS module system, and will output to a `./js` directory. It relies on WebPack to compile and bundle the javascript. PracTempo can be compiled in this way (from the ts directory):

```
npm run build
```

You can start a local dev service with

```
npm run start
```

Which will run typescript compile according to tsconfig.json, using an entry point of `main.ts`, and compile a module named PracTempo to the `js/bundle.js` file.
# PracTempo TODO List

This file tracks planned features, improvements, and bug fixes for PracTempo.

## General Features

*   Add settings (warmup, timing between activities, per-category settings like left-handed).
*   Make settings dynamic.
*   Implement CSV import/export for schedules.
*   Save recent exercises/schedules to local storage.
*   Add a basic sheet music display tool (consider common notation, potentially MIDI integration).
*   Allow composable views (e.g., metronome within another feature).
*   Refactor/establish a clear hierarchy separating views from features.
*   Implement versioning for modules/features to handle saved data compatibility.
*   Add a "chord hints" mode showing adjacent/related chord shapes.
*   Implement a dedicated "Triad" practice mode/feature.
*   Develop a standalone Metronome feature.
*   Fix the pause functionality.
*   Add a global setting to hide the schedule while a timer is running.
*   Define and implement consistent stroke/fill colors for diagrams.
*   Implement consistent color-coding for intervals (root, 3rd, 5th, etc.) in diagrams.
*   Implement consistent color-coding for specific notes (C, C#, D, etc.).
*   Add toggles to enable/disable different coloration schemes (intervals, notes).
*   Improve documentation around the CSV schedule, hinting for supported options by feature class.
*   Basic support for some non-Guitar feature class, to ensure multiple feature classes work.
*   Allow sub-intervals within a scheduled task.
*   Add a button to skip the current task.
*   Support reference/information pages for each feature.

## Guitar-Related Features

*   Increase the size of the fretboard display area.
*   Add ~50 more common chords and ~50 more scales (ensure validation).
*   Add fretboard visualization modes (e.g., "magic squares", blocks).
*   Implement CAGED system visualization and exercises.
*   Increase the size of the chord diagram display area.
*   Add more scales.
*   Add more chords. Support multiple chord representations/voicings.
*   Support visual representation of barres for chords.
*   Support triads (visualization and exercises).
*   Clean up coloring for intervals/triads.
*   Find a suitable TAB format and implement TAB display.
*   Allow fretboard rotation and support for left-handed mode.
*   Improve rendering quality of notes on the fretboard.
*   Show notes belonging to the current scale on the fretboard.
*   Display scale degrees and note spellings on the fretboard.
*   Add rendering/color scheme for CAGED positions.
*   Add a training mode for specific CAGED positions.
*   Implement "capo" functionality.
*   Add a catalog of fret marker icons (besides stars).
*   Support larger/rescalable fretboard.
*   Support display of licks/TAB notation snippets.
*   Clean up and better define functionality that shows important notes over chord changes.
*   Add a coloration key/legend for colored scales/diagrams.
*   Sound: Allow clicking notes/chords to hear them.
*   Add a chord progression feature/mode.
*   Refactor `guitar.ts`.

## Infrastructure & Development

*   Maintain a clear and helpful README.
*   Decompose some classes to more basic components.
*   Add tests (unit, integration).
*   Support mobile/responsive design (including rotation).
*   Support multiple languages (internationalization/i18n).
*   Implement ARIA support for accessibility.

## Potential Future Ideas (From TODO.md)

*   Refactor timer to be a single element with a dedicated reference function.
*   Show scales colored according to underlying chords.
*   Label notes explicitly on diagrams.
*   Add music-playing or scale-playing functionality (e.g., MIDI playback).

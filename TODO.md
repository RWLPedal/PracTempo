# PracTempo TODO List

This file tracks planned features, improvements, and bug fixes for PracTempo.

## General Features

*   Implement CSV import/export for schedules.
*   Add a basic sheet music display tool (consider common notation, potentially MIDI integration).
*   Refactor/establish a clear hierarchy separating views from features.
*   Implement versioning for modules/features to handle saved data compatibility.
*   Add a "chord hints" mode showing adjacent/related chord shapes.
*   Define and implement consistent stroke/fill colors for diagrams.
*   Improve documentation around the CSV schedule, hinting for supported options by feature class.
*   Basic support for some non-Guitar feature class, to ensure multiple feature classes work.
*   Allow sub-intervals within a scheduled task.
*   Support reference/information pages for each feature.

## Music-Related Features

*   Add ~50 more common chords and ~50 more scales (ensure validation).
*   Add fretboard visualization modes (e.g., "magic squares", blocks).
*   Implement CAGED system visualization and exercises.
*   Increase the size of the chord diagram display area.
*   Add more scales.
*   Add more chords. Support multiple chord representations/voicings.
*   Find a suitable TAB format and implement TAB display.
*   Add rendering/color scheme for CAGED positions.
*   Add a training mode for specific CAGED positions.
*   Implement "capo" functionality.
*   Add a catalog of fret marker icons (besides stars).
*   Support larger/rescalable fretboard.
*   Support display of licks/TAB notation snippets.
*   Clean up and better define functionality that shows important notes over chord changes.
*   Sound: Allow clicking notes/chords to hear them.
*   Add music-playing or scale-playing functionality (e.g., MIDI playback).

## Infrastructure & Development

*   Maintain a clear and helpful README.
*   Decompose some classes to more basic components.
*   Add tests (unit, integration).
*   Support mobile/responsive design (including rotation).
*   Support multiple languages (internationalization/i18n).
*   Implement ARIA support for accessibility.


# PracTempo TODO List

This file tracks planned features, improvements, and bug fixes for PracTempo.

## General Features

*   Add a basic sheet music display tool (consider common notation, potentially MIDI integration).
*   Implement versioning for modules/features to handle saved data compatibility.
*   Add a "chord hints" mode showing adjacent/related chord shapes.
*   Define and implement consistent stroke/fill colors for diagrams.
*   Improve documentation around the CSV schedule, hinting for supported options by feature class.
*   Basic support for some non-Guitar feature class, to ensure multiple feature classes work.
*   Allow sub-intervals within a scheduled task.
*   Support reference/information pages for each feature.

## Music-Related Features

*   Totally refactor chord library, make it more comprehensive.
*   Add fretboard visualization modes (e.g., "magic squares", blocks).
*   Increase the size of the chord diagram display area.
*   Validate existing scales, make sure scales are correct and useful.
*   Find a suitable TAB format and implement TAB display.
*   Add rendering/color scheme for CAGED positions.
*   Add a training mode for specific CAGED positions.
*   Implement "capo" view - how to translate open chords.
*   Implement "overall capo" that translates everything, like scales or notes - basically alternate an alternate tuning.
*   Add a catalog of fret marker icons (besides stars) and use where appropriate.
*   Support display of licks/TAB notation snippets.
*   Clean up and better define functionality that shows important notes over chord changes.

## Infrastructure & Development

*   Maintain a clear and helpful README.
*   Decompose some classes to more basic components.
*   Revisit how generic some implementation is. Over time, the tool has evolved to be fundamentally a fretted instrument tool (rather than a generic practice tool).
*   Add tests (unit, integration).
*   Support mobile/responsive design (including rotation).
*   Support multiple languages (internationalization/i18n).
*   Implement ARIA support for accessibility.
*   Refactor/establish a clear hierarchy separating views from features.

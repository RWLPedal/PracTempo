# PracTempo

PracTempo is a practice timer application designed for musicians, offering scheduled intervals combined with context-specific visual aids and information. It helps structure practice sessions effectively, initially focusing on tools for guitarists. *Think of a highly customizable Pomodoro timer, with hints about each task included.*

Users can define a practice schedule, and PracTempo tracks the schedule with a timer and notifications. For each practice element PracTempo will display relevant hints like scale diagrams, chord shapes, or other pertinent visual aids.

## Key Features

*   **Scheduled Practice:** Define custom practice routines with timed intervals and notifications.
*   **Contextual Hints:** Receive task-specific information and visualizations tailored to the practice item.
*   **Domain-Specific:** Designed to be extensible for different musical contexts.

## Guitar-Specific Features

PracTempo was initially designed for guitar practice (though it is not limited to that). PracTempo includes a growing set of tools specifically for guitar players:

*   **Fretboard display:** Visualize scales and notes directly on the fretboard.
*   **Chord Diagrams:** Display standard chord shapes and progressions.
*   **Triads Diagrams:** Display standard chord shapes and progressions.
*   **Lefty support:** PracTempo was primarily written by a lefty. As such, diagrams can be flipped.
*   **Library:** PracTempo has a library of scales and chords. 

## Building

PracTempo is developed using TypeScript and bundled with Webpack.

**Prerequisites:**

*   Node.js and npm

**Build Steps:**

1.  Navigate to the project's root directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Build the project (outputs bundled JavaScript to `./js/bundle.js`):
    ```bash
    npm run build
    ```
4.  Start the local development server:
    ```bash
    npm run start
    ```
    This command typically compiles the TypeScript (`main.ts` entry point) and serves the application locally.

## Dependencies
*   Bulma - CSS library used for panelization.
---

*(Developer Note: For a detailed list of all planned features and tasks, including more granular guitar items, please refer to the `TODO.md` file or the project's issue tracker.)*

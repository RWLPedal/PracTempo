import { View } from "../../view";
import { Chord } from "../chords";
import { FretboardConfig } from "../fretboard";
import { ChordDiagramView } from "./chord_diagram_view";
import { getMoveableGuitarShapes } from "../moveable_shapes";
import { clearAllChildren } from "../guitar_utils";

/**
 * Renders either static chord diagrams or moveable barre-chord shapes depending
 * on the current mode. The "Moveable" checkbox lives in the owning Feature's
 * header row; call setIsMoveable() when it changes.
 */
export class MoveableToggleView implements View {
  private diagramDiv: HTMLElement | null = null;
  private isMoveable = false;

  private readonly staticViews: ChordDiagramView[];
  private readonly moveableViews: ChordDiagramView[];
  readonly hasMoveableShapes: boolean;

  constructor(chords: ReadonlyArray<Chord>, fretboardConfig: FretboardConfig, initialIsMoveable: boolean = false) {
    this.isMoveable = initialIsMoveable;
    this.staticViews = chords.map(
      (c) => new ChordDiagramView(c, c.name, fretboardConfig)
    );

    const moveableResults = chords.flatMap((c) =>
      getMoveableGuitarShapes(c.name, fretboardConfig.tuning)
    );

    this.moveableViews = moveableResults.map(
      (r) =>
        new ChordDiagramView(r.chord, r.title, fretboardConfig, {
          stringIndex: r.rootStringIndex,
          fret: r.rootFret,
        })
    );

    this.hasMoveableShapes = this.moveableViews.length > 0;
  }

  /** Called by the owning Feature when the "Moveable" checkbox changes. */
  setIsMoveable(value: boolean): void {
    this.isMoveable = value;
    this._renderDiagrams();
  }

  render(container: HTMLElement): void {
    if (!this.diagramDiv) {
      this.diagramDiv = document.createElement("div");
      this.diagramDiv.style.cssText = "display: flex; flex-wrap: wrap;";
    }
    if (!this.diagramDiv.parentNode) {
      container.appendChild(this.diagramDiv);
    }
    this._renderDiagrams();
  }

  private _renderDiagrams(): void {
    if (!this.diagramDiv) return;
    clearAllChildren(this.diagramDiv);

    if (this.isMoveable) {
      if (this.moveableViews.length > 0) {
        this.moveableViews.forEach((v) => v.render(this.diagramDiv!));
      } else {
        const msg = document.createElement("p");
        msg.textContent = "No moveable shapes available.";
        msg.style.color = "var(--clr-text-subtle, #888)";
        this.diagramDiv.appendChild(msg);
      }
    } else {
      this.staticViews.forEach((v) => v.render(this.diagramDiv!));
    }
  }

  start(): void {
    this._activeViews().forEach((v) => v.start());
  }

  stop(): void {
    [...this.staticViews, ...this.moveableViews].forEach((v) => v.stop());
  }

  destroy(): void {
    [...this.staticViews, ...this.moveableViews].forEach((v) => v.destroy());
    if (this.diagramDiv?.parentNode) {
      this.diagramDiv.parentNode.removeChild(this.diagramDiv);
    }
    this.diagramDiv = null;
  }

  private _activeViews(): ChordDiagramView[] {
    return this.isMoveable ? this.moveableViews : this.staticViews;
  }
}

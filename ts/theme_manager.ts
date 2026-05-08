export enum Theme {
  WARM = "warm",
  MOSS = "moss",
  DARK = "dark",
  SIGIL = "sigil",
  NEON = "neon",
}
export const themeNames: { key: Theme; title: string }[] = [
  { key: Theme.WARM, title: "Warm" },
  { key: Theme.MOSS, title: "Moss" },
  { key: Theme.DARK, title: "Dark" },
  { key: Theme.SIGIL, title: "Sigil" },
  { key: Theme.NEON, title: "Neon" },
];

type ThemeListener = (theme: Theme) => void;

export class ThemeManager {
  private _theme: Theme;
  private _listeners: ThemeListener[] = [];

  constructor(initialTheme: Theme = Theme.WARM) {
    this._theme = initialTheme;
  }

  apply(theme: Theme): void {
    this._theme = theme;
    document.documentElement.dataset.theme = theme;
    document.body.classList.toggle("dark-theme", theme !== "warm");
    this._listeners.forEach((cb) => cb(theme));
  }

  get theme(): Theme {
    return this._theme;
  }

  subscribe(cb: ThemeListener): () => void {
    this._listeners.push(cb);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== cb);
    };
  }
}

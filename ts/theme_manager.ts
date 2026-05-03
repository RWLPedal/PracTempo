export type Theme = 'warm' | 'dark' | 'forest';
type ThemeListener = (theme: Theme) => void;

export class ThemeManager {
    private _theme: Theme;
    private _listeners: ThemeListener[] = [];

    constructor(initialTheme: Theme = 'warm') {
        this._theme = initialTheme;
    }

    apply(theme: Theme): void {
        this._theme = theme;
        document.documentElement.dataset.theme = theme;
        document.body.classList.toggle('dark-theme', theme !== 'warm');
        this._listeners.forEach(cb => cb(theme));
    }

    get theme(): Theme {
        return this._theme;
    }

    subscribe(cb: ThemeListener): () => void {
        this._listeners.push(cb);
        return () => {
            this._listeners = this._listeners.filter(l => l !== cb);
        };
    }
}

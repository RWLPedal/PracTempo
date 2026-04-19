export type ReferenceState = {
    rootNote: string;
    scale: string;
    // Add other state properties here, e.g. for chords, triads
}

export class ReferenceStateManager {
    private state: ReferenceState;
    private subscribers: ((state: ReferenceState) => void)[] = [];

    constructor() {
        this.state = {
            rootNote: 'A', // Default value
            scale: 'Major', // Default value
        };
    }

    getState(): ReferenceState {
        return { ...this.state };
    }

    setState(newState: Partial<ReferenceState>): void {
        this.state = { ...this.state, ...newState };
        this.notifySubscribers();
    }

    subscribe(callback: (state: ReferenceState) => void): void {
        this.subscribers.push(callback);
        callback(this.state); // Immediately notify with current state
    }

    private notifySubscribers(): void {
        for (const subscriber of this.subscribers) {
            subscriber(this.state);
        }
    }
}

// ts/app_bootstrap.ts
// Shared registration logic run by both the practice page (main.ts) and the
// reference page (reference_main.ts). Keeps the two entry points in sync without
// copy-pasting.

import { registerCategory } from "./feature_registry";
import { registerFloatingView } from "./floating_views/floating_view_registry";
import { InstrumentCategory } from "./instrument/instrument_category";
import { TimerView } from "./views/timer_view";
import { DroneView } from "./views/drone_view";

export function registerBuiltins(): void {
    registerCategory(new InstrumentCategory());

    registerFloatingView({
        viewId: "floating_timer",
        displayName: "Timer",
        categoryName: "General",
        defaultWidth: 300,
        defaultHeight: 150,
        createView: (initialState?: any) => new TimerView(initialState?.duration ?? 300),
    });

    registerFloatingView({
        viewId: "drone_view",
        displayName: "Drone",
        categoryName: "General",
        defaultWidth: 175,
        defaultHeight: 80,
        createView: (initialState?: any) => new DroneView(initialState),
    });
}

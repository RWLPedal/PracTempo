// ts/app_bootstrap.ts
// Shared registration logic run by both the practice page (main.ts) and the
// reference page (reference_main.ts). Keeps the two entry points in sync without
// copy-pasting.

import { registerCategory } from "./feature_registry";
import { registerFloatingView } from "./floating_views/floating_view_registry";
import { InstrumentCategory } from "./instrument/instrument_category";
import { TimerView } from "./views/timer_view";
import { DroneView } from "./views/drone_view";
import { ScheduleFloatingView } from "./views/schedule_floating_view";
import { AnyFloatingView } from "./views/any_floating_view";
import { AppSettings } from "./settings";

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

    registerFloatingView({
        viewId: "schedule_floating_view",
        displayName: "Schedule",
        categoryName: "Practice",
        defaultWidth: 480,
        defaultHeight: 640,
        showInMenu: false,
        createView: (initialState?: any, appSettings?: AppSettings) =>
            new ScheduleFloatingView(initialState, appSettings!),
    });

    registerFloatingView({
        viewId: "any_floating_view",
        displayName: "Any",
        categoryName: "Practice",
        defaultWidth: 420,
        defaultHeight: 550,
        showInMenu: false,
        createView: (initialState?: any, appSettings?: AppSettings) =>
            new AnyFloatingView(initialState, appSettings!),
    });
}

// ts/screen_config/default_configs.ts
//
// Bundled starter layouts as TypeScript constants. These are always at the
// current payload shape, so they never need migration at runtime.
//
// To add a new starter layout:
//   1. Define a new Readonly<CurrentPayload> constant here.
//   2. Add it to DEFAULT_CONFIGS with a descriptive key.
//   3. It becomes accessible via ScreenConfigManager.loadNamed("default:<key>").

import { CurrentPayload } from "./screen_config_types";

// ─── Built-in layouts ─────────────────────────────────────────────────────────

/** An empty canvas — no open views, no links. Used as the safe fallback when
 *  localStorage is empty or a migration fails unrecoverably. */
export const EMPTY_CONFIG: Readonly<CurrentPayload> = Object.freeze({
  referenceGrid: { cols: 80, rows: 60 },
  openViews: {},
  nextZIndex: 100,
  links: [],
});

// ─── Registry ─────────────────────────────────────────────────────────────────

/** All built-in presets. Keys are accessed via the "default:" namespace in
 *  ScreenConfigManager, e.g. screenConfigManager.loadNamed("default:empty"). */
export const DEFAULT_CONFIGS: Readonly<Record<string, CurrentPayload>> = Object.freeze({
  empty: EMPTY_CONFIG,
});

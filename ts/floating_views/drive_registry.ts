// ts/floating_views/drive_registry.ts
import { DriveSignal, SignalKind } from './link_types';

export interface DriveSourceDescriptor {
  viewId: string;
  featureTypeName?: string; // set for configurable features e.g. 'MultiSelectFretboard'
  /**
   * Returns an ordered array of signals from this source's current state.
   * Index matters: signals[i] is routed to the i-th outgoing link.
   * BackingTrack returns a single-element array.
   * MultiSelectFretboard returns one ChordSignal per chord/driven layer in order.
   */
  extractSignals(eventDetail: any): DriveSignal[];
}

export interface DriveTargetSlot {
  featureTypeName: string;  // e.g. 'Chord', 'MultiSelectFretboard'
  argName: string;          // config arg name this slot can drive
  label: string;            // human-readable label shown in the UI
  acceptedKinds: SignalKind[]; // uses same SignalKind enum as DriveSignal.kind
  /**
   * When true, signals update the arg directly without showing a "Driven" option
   * in the UI. Used for variadic toggle args (e.g. Qualities on TriadFeature).
   */
  transparent?: boolean;
  /**
   * Translates an incoming signal to the concrete config value string.
   * Returns null if this signal cannot be applied (e.g. null chord → no diagram).
   */
  resolveValue(signal: DriveSignal): string | null;
}

// ─── Private registries ───────────────────────────────────────────────────────

const sourceDescriptors = new Map<string, DriveSourceDescriptor>();
const targetSlots = new Map<string, DriveTargetSlot[]>();

// ─── Registration functions ───────────────────────────────────────────────────

export function registerDriveSource(descriptor: DriveSourceDescriptor): void {
  const key = descriptor.featureTypeName
    ? `${descriptor.viewId}::${descriptor.featureTypeName}`
    : descriptor.viewId;
  sourceDescriptors.set(key, descriptor);
}

export function registerDriveTarget(slot: DriveTargetSlot): void {
  const existing = targetSlots.get(slot.featureTypeName) ?? [];
  existing.push(slot);
  targetSlots.set(slot.featureTypeName, existing);
}

// ─── Lookup functions ─────────────────────────────────────────────────────────

export function getDriveSourceDescriptor(
  viewId: string,
  featureTypeName?: string
): DriveSourceDescriptor | undefined {
  if (featureTypeName) {
    const specific = sourceDescriptors.get(`${viewId}::${featureTypeName}`);
    if (specific) return specific;
  }
  return sourceDescriptors.get(viewId);
}

export function getDriveTargetSlots(featureTypeName: string): DriveTargetSlot[] {
  return targetSlots.get(featureTypeName) ?? [];
}

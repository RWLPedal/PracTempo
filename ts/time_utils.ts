/**
 * Parses a duration string (like "MM:SS" or "SS") into total seconds.
 * @param durationStr - The duration string.
 * @returns Total duration in seconds (integer).
 * @throws {Error} if the format is invalid.
 */
export function parseDurationString(durationStr: string): number {
  if (!durationStr || typeof durationStr !== 'string') {
      throw new Error("Invalid duration input: Must be a non-empty string.");
  }

  const parts = durationStr.trim().split(':');
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 1) {
      // Only seconds provided (e.g., "120")
      seconds = parseInt(parts[0], 10);
  } else if (parts.length === 2) {
      // Minutes and seconds provided (e.g., "3:45")
      minutes = parseInt(parts[0], 10);
      seconds = parseInt(parts[1], 10);
  } else {
      throw new Error(`Invalid duration format: "${durationStr}". Use MM:SS or SS.`);
  }

  // Validate parsed numbers
  if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
       throw new Error(`Invalid time values in duration: "${durationStr}". Minutes/seconds must be non-negative, seconds < 60.`);
  }

  return minutes * 60 + seconds;
}

/** Formats total seconds into a MM:SS string */
export function formatDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
      return "0:00";
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutes}:${paddedSeconds}`;
}
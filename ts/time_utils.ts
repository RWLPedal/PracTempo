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
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 1) {
    seconds = parseInt(parts[0], 10);
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10);
    seconds = parseInt(parts[1], 10);
  } else if (parts.length === 3) {
    hours   = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseInt(parts[2], 10);
  } else {
    throw new Error(`Invalid duration format: "${durationStr}". Use H:MM:SS, MM:SS, or SS.`);
  }

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) ||
      hours < 0 || minutes < 0 || seconds < 0 ||
      minutes >= 60 || seconds >= 60) {
    throw new Error(`Invalid time values in duration: "${durationStr}".`);
  }

  return hours * 3600 + minutes * 60 + seconds;
}

/** Formats total seconds into M:SS or H:MM:SS */
export function formatDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return "0:00";
  }
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const mm = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const ss = seconds < 10 ? `0${seconds}` : `${seconds}`;
  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${minutes}:${ss}`;
}
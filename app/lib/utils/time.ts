/**
 * Converts a timestamp to milliseconds
 * Handles both Unix timestamps (seconds) and millisecond timestamps
 * @param timestamp - Unix timestamp in seconds, milliseconds, or date string
 * @returns Milliseconds since epoch
 */
export function toMs(timestamp: string | number | null | undefined): number {
  if (!timestamp) return 0;
  
  // If it's a number, assume it's Unix timestamp in seconds
  // (Supabase provides expires_at in seconds)
  if (typeof timestamp === 'number') {
    // Check if it's already in milliseconds (13 digits) or seconds (10 digits)
    // Unix timestamps in seconds are typically 10 digits until year 2286
    if (timestamp < 10000000000) {
      return timestamp * 1000; // Convert seconds to milliseconds
    }
    return timestamp; // Already in milliseconds
  }
  
  // If it's a string, parse it as a date
  return new Date(timestamp).getTime();
}

/**
 * Debug helper to log timestamp conversions
 */
export function debugTimestamp(label: string, timestamp: any, convertedMs: number) {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[time] ${label}:`, {
      raw: timestamp,
      converted: convertedMs,
      date: new Date(convertedMs).toISOString(),
      isExpired: convertedMs < Date.now()
    });
  }
}
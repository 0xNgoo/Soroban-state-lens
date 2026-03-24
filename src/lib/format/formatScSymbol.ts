/**
 * Safely formats a symbol string.
 *
 * Rules:
 * - Trims whitespace
 * - Returns "?" for empty/invalid input
 * - Returns "?" if control characters are present
 * - Otherwise returns the cleaned string
 */
export function formatScSymbol(value: string): string {
  if (typeof value !== "string") {
    return "?";
  }
  // 🚨 Check control characters FIRST (before trim)
  const hasControlChars = /[\x00-\x1F\x7F]/.test(value);
  if (hasControlChars) {
    return "?";
  }
  const trimmed = value.trim();

  // Empty after trimming
  if (!trimmed) {
    return "?";
  }

  return trimmed;
}
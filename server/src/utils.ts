/**
 * Parse an integer query parameter with a safe default.
 * Returns the default if the value is missing, NaN, negative, or non-finite.
 */
export function parseIntParam(value: string | undefined, defaultVal: number): number {
  const n = value !== undefined ? parseInt(value, 10) : defaultVal;
  return Number.isFinite(n) && n >= 0 ? n : defaultVal;
}

/**
 * Build a SQL `IN (...)` condition from a comma-separated filter value (e.g.
 * `?source=cursor,claude-code`). Returns null when there's nothing to filter
 * on (undefined, empty, or only commas/whitespace) — callers should skip
 * adding the condition entirely in that case, same as today's single-value
 * behavior for a missing/`'all'` filter.
 *
 * A single value (no commas) still produces an `IN (?)` clause, which SQLite
 * evaluates identically to `= ?` — so existing single-value filter behavior
 * is unchanged.
 */
export function buildInCondition(column: string, value: string | undefined): { clause: string; params: string[] } | null {
  if (!value) return null;
  const values = value.split(',').map((v) => v.trim()).filter(Boolean);
  if (values.length === 0) return null;
  return { clause: `${column} IN (${values.map(() => '?').join(', ')})`, params: values };
}

/**
 * Safely parse a JSON-encoded string field from SQLite.
 * Returns defaultValue if the field is null, empty, or invalid JSON.
 * Mirrors dashboard/src/lib/types.ts parseJsonField — keep in sync.
 */
export function safeParseJson<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

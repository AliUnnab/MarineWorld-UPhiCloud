/**
 * Utility to deeply sanitize objects before saving to Firestore,
 * stripping all `undefined` properties recursively.
 */
export function sanitizeUndefined<T>(val: T): T {
  if (val === undefined || val === null) {
    return val;
  }
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => (typeof item === "object" && item !== null ? sanitizeUndefined(item) : item)) as unknown as T;
  }
  if (typeof val === "object") {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val as Record<string, any>)) {
      if (v !== undefined) {
        if (typeof v === "object" && v !== null) {
          res[k] = sanitizeUndefined(v);
        } else {
          res[k] = v;
        }
      }
    }
    return res as T;
  }
  return val;
}

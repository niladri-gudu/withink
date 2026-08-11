/**
 * Deep-clone a value via JSON round-trip. Used to strip Mongoose metadata
 * (ObjectIds, etc.) before caching in Redis.
 */
export function serialize<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

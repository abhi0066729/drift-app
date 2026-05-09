/**
 * Deterministic hash for UUID to Numeric ID conversion.
 * Required for HNSW engines that only support numeric keys.
 */
export function hashUUIDToNumber(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

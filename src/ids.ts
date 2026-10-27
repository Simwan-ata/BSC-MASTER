/**
 * Creates a stable numeric identifier for a newly created record.
 * The generated value is persisted with the record; it does not depend on the
 * current maximum ID, so independent edits are much less likely to collide.
 * Existing IDs remain unchanged for backward compatibility.
 */
export function createStableId(existingIds: readonly number[] = []): number {
  const used = new Set(existingIds);
  for (let attempt = 0; attempt < 32; attempt += 1) {
    let candidate: number;
    if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
      const words = new Uint32Array(2);
      globalThis.crypto.getRandomValues(words);
      candidate = (words[0] & 0x1fffff) * 0x100000000 + words[1];
    } else {
      // Compatibility fallback for older/non-secure browser contexts.
      candidate = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    }
    if (Number.isSafeInteger(candidate) && candidate > 0 && !used.has(candidate)) return candidate;
  }
  throw new Error('Unable to allocate a unique record identifier. Retry the operation.');
}

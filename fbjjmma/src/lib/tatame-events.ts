/**
 * In-memory SSE pub/sub for tatame real-time updates.
 * Works in a single Node.js process (Next.js dev or standalone server).
 */

type Listener = () => void

// Module-level map persists across requests in the same process
const listeners = new Map<string, Set<Listener>>()

export function subscribeToTatame(tatameId: string, listener: Listener): () => void {
  if (!listeners.has(tatameId)) listeners.set(tatameId, new Set())
  listeners.get(tatameId)!.add(listener)
  return () => {
    const set = listeners.get(tatameId)
    if (set) {
      set.delete(listener)
      if (set.size === 0) listeners.delete(tatameId)
    }
  }
}

export function notifyTatame(tatameId: string): void {
  listeners.get(tatameId)?.forEach(l => {
    try { l() } catch { /* stream already closed */ }
  })
}

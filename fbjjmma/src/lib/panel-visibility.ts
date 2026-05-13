const store = new Map<string, { ids: Set<string>; ts: number }>()

export function setPanelVisible(tatameId: string, bracketIds: string[]): void {
  store.set(tatameId, { ids: new Set(bracketIds), ts: Date.now() })
}

export function isPanelVisible(tatameId: string, bracketId: string): boolean {
  const entry = store.get(tatameId)
  if (!entry) return false
  if (Date.now() - entry.ts > 30_000) return false
  return entry.ids.has(bracketId)
}

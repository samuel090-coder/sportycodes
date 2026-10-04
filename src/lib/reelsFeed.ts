/** Fresh unseen items lead each visit, with shuffled older picks interleaved. */
export function mixReels<T extends { id: string; created_at: string }>(items: T[], seen: Set<string>, random = Math.random): T[] {
  const shuffle = (list: T[]) => {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const sorted = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const freshCount = Math.max(1, Math.ceil(sorted.length * .35));
  const fresh = shuffle(sorted.slice(0, freshCount).filter(item => !seen.has(item.id)));
  const freshIds = new Set(fresh.map(item => item.id));
  const older = shuffle(sorted.filter(item => !freshIds.has(item.id)));
  const result: T[] = [];
  while (fresh.length || older.length) {
    result.push(...fresh.splice(0, 2), ...older.splice(0, 1));
  }
  return result;
}

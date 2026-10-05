type ReelLike = {
  id: string;
  created_at: string;
  user_id?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  is_following?: boolean;
  media_type?: string | null;
};

/**
 * Smart feed ordering.
 * - Unwatched posts always come before watched ones, so anything skipped returns on the next visit.
 * - Within unwatched: score by freshness, engagement and following, with randomness so every visit feels new.
 * - Avoid the same creator twice in a row where possible.
 * - Watched posts are shuffled and appended at the end.
 */
export function mixReels<T extends ReelLike>(items: T[], watched: Set<string>, random = Math.random): T[] {
  const now = Date.now();
  const score = (item: T) => {
    const hours = Math.max(0, (now - new Date(item.created_at).getTime()) / 36e5);
    const freshness = 40 / (1 + hours / 12);
    const engagement = Math.log1p((item.likes_count || 0) + (item.comments_count || 0) * 2 + (item.shares_count || 0) * 3) * 6;
    const following = item.is_following ? 12 : 0;
    const video = item.media_type === "video" ? 4 : 0;
    return freshness + engagement + following + video + random() * 25;
  };

  const spread = (list: T[]) => {
    const pool = [...list];
    const result: T[] = [];
    while (pool.length) {
      const last = result[result.length - 1];
      const index = pool.findIndex(item => !last || !item.user_id || item.user_id !== last.user_id);
      result.push(...pool.splice(index < 0 ? 0 : index, 1));
    }
    return result;
  };

  const unwatched = items.filter(item => !watched.has(item.id))
    .map(item => ({ item, value: score(item) }))
    .sort((a, b) => b.value - a.value)
    .map(entry => entry.item);
  const seen = items.filter(item => watched.has(item.id));
  for (let i = seen.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [seen[i], seen[j]] = [seen[j], seen[i]];
  }
  return [...spread(unwatched), ...spread(seen)];
}

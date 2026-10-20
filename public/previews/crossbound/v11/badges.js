// Market IDs match the existing passport. Artwork never changes earned tiers.
export const BADGE_MARKETS = Object.freeze([
  'singapore', 'london', 'los-angeles', 'berlin', 'paris', 'tokyo',
  'sydney', 'toronto', 'dubai', 'mexico-city', 'sao-paulo', 'amsterdam',
]);
export const BADGE_TIERS = Object.freeze(['bronze', 'silver', 'gold']);

export function countryBadgeAsset(marketId, tier) {
  if (!BADGE_MARKETS.includes(marketId)) return null;
  const earned = BADGE_TIERS.includes(tier);
  return {
    src: new URL(`../assets/badges/countries-v1/web/${earned ? tier : 'gold'}/${marketId}.webp`, import.meta.url).href,
    locked: !earned,
    tier: earned ? tier : 'locked',
  };
}

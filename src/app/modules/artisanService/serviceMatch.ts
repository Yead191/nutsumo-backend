const STOP_WORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'your',
  'service',
  'services',
  'job',
  'work',
]);

export const NAME_MATCH_THRESHOLD = 0.5;

export const normalizeServiceName = (value?: string | null) =>
  (value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const serviceTokens = (value?: string | null) =>
  normalizeServiceName(value)
    .split(' ')
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));

/**
 * 1 means the names are the same offering. 0 means they do not overlap.
 * Used to match a customer's custom job title to an artisan's custom service
 * without requiring an admin catalog row.
 */
export const nameMatchScore = (
  left?: string | null,
  right?: string | null,
) => {
  const normalizedLeft = normalizeServiceName(left);
  const normalizedRight = normalizeServiceName(right);

  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;

  const leftTokens = serviceTokens(left);
  const rightTokens = serviceTokens(right);

  if (!leftTokens.length || !rightTokens.length) {
    return normalizedLeft.includes(normalizedRight) ||
      normalizedRight.includes(normalizedLeft)
      ? 0.8
      : 0;
  }

  const rightSet = new Set(rightTokens);
  const hits = leftTokens.filter(token => rightSet.has(token)).length;
  const overlap = hits / Math.max(leftTokens.length, rightTokens.length);
  const shorterCoverage = hits / Math.min(leftTokens.length, rightTokens.length);
  const contained =
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft);

  return contained ? Math.max(overlap, shorterCoverage, 0.85) : Math.max(overlap, shorterCoverage);
};

export const tokenRegex = (value?: string | null) => {
  const tokens = serviceTokens(value).slice(0, 5);
  if (!tokens.length) return null;

  const pattern = tokens
    .map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  return new RegExp(pattern, 'i');
};

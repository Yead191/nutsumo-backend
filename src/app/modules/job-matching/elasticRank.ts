import { elasticHelper } from '../../../tools/elastic-search/elastic-search';

export const ARTISAN_INDEX = 'nutsumo-artisans';

export interface ArtisanSearchDoc {
  artisanId: string;
  text: string;
  acceptRate?: number;
  responseTimeMinutes?: number;
  rating?: number;
  lat?: number;
  lng?: number;
  isProfilePublic?: boolean;
  availabilityStatus?: string;
  postCode?: string;
  locationText?: string;
  categoryIds?: string[];
  card?: Record<string, unknown>;
}

const MAPPINGS = {
  properties: {
    artisanId: { type: 'keyword' },
    text: { type: 'text' },
    acceptRate: { type: 'float' },
    responseTimeMinutes: { type: 'float' },
    rating: { type: 'float' },
    location: { type: 'geo_point' },
    isProfilePublic: { type: 'boolean' },
    availabilityStatus: { type: 'keyword' },
    postCode: { type: 'keyword' },
    locationText: { type: 'text' },
    categoryIds: { type: 'keyword' },
    card: { type: 'object', enabled: false },
  },
};

const documentOf = (doc: ArtisanSearchDoc) => ({
  artisanId: doc.artisanId,
  text: doc.text,
  acceptRate: doc.acceptRate ?? 0,
  responseTimeMinutes: doc.responseTimeMinutes ?? 0,
  rating: doc.rating ?? 0,
  isProfilePublic: doc.isProfilePublic !== false,
  availabilityStatus: doc.availabilityStatus || '',
  postCode: doc.postCode || '',
  locationText: doc.locationText || '',
  categoryIds: doc.categoryIds || [],
  ...(doc.card ? { card: doc.card } : {}),
  ...(doc.lat != null && doc.lng != null
    ? { location: { lat: doc.lat, lon: doc.lng } }
    : {}),
});

const fuzzyTextQuery = (query: string) => ({
  multi_match: {
    query,
    fields: ['text^3', 'locationText'],
    fuzziness: 'AUTO',
    prefix_length: 0,
    fuzzy_transpositions: true,
  },
});

const indexArtisans = async (docs: ArtisanSearchDoc[]) => {
  if (!docs.length) return;
  await elasticHelper.bulkIndex(
    ARTISAN_INDEX,
    docs.map(doc => ({ id: doc.artisanId, document: documentOf(doc) })),
    MAPPINGS,
  );
};

const textScores = async (query: string, artisanIds: string[]) => {
  const scores = new Map<string, number>();
  if (!query.trim() || !artisanIds.length) return scores;

  const found = await elasticHelper.searchDocuments<{ artisanId?: string }>(
    ARTISAN_INDEX,
    {
      bool: {
        must: [fuzzyTextQuery(query)],
        filter: [{ terms: { artisanId: artisanIds.slice(0, 50) } }],
      },
    },
    { page: 1, limit: Math.min(artisanIds.length, 50), mappings: MAPPINGS },
  );
  if (!found?.hits.length) return scores;

  const max = found.hits[0]?.score || 1;
  for (const hit of found.hits) {
    const id = hit.source.artisanId || hit.id;
    if (!id || hit.score == null) continue;
    scores.set(id, Math.round((hit.score / max) * 15));
  }
  return scores;
};

const searchPage = async (query: string, page: number, limit: number) => {
  if (!query.trim()) return null;

  const found = await elasticHelper.searchDocuments<ArtisanSearchDoc>(
    ARTISAN_INDEX,
    fuzzyTextQuery(query),
    { page, limit, mappings: MAPPINGS },
  );
  if (!found) return null;

  const ids = found.hits
    .map(hit => hit.source.artisanId || hit.id)
    .filter((id): id is string => Boolean(id));
  const cards = found.hits
    .map(hit => hit.source.card)
    .filter((card): card is Record<string, unknown> => Boolean(card));

  return { ids, total: found.total, cards };
};

export const ElasticArtisanRank = {
  indexArtisans,
  textScores,
  searchPage,
};

import config from '../../../config';
import { esClient } from '../../../config/elastic-search';
import { logger } from '../../../shared/logger';

const INDEX = 'nutsumo-artisans';

export interface ArtisanSearchDoc {
  artisanId: string;
  text: string;
  acceptRate?: number;
  responseTimeMinutes?: number;
  rating?: number;
  lat?: number;
  lng?: number;
}

let indexReady: Promise<boolean> | null = null;

const ensureIndex = () => {
  if (!config.elasticSearch?.url) return Promise.resolve(false);
  if (!indexReady) {
    indexReady = (async () => {
      const exists = await esClient.indices.exists({ index: INDEX });
      if (!exists) {
        await esClient.indices.create({
          index: INDEX,
          mappings: {
            properties: {
              artisanId: { type: 'keyword' },
              text: { type: 'text' },
              acceptRate: { type: 'float' },
              responseTimeMinutes: { type: 'float' },
              rating: { type: 'float' },
              location: { type: 'geo_point' },
            },
          },
        });
      }
      return true;
    })().catch(error => {
      indexReady = null;
      logger.warn(`[Elasticsearch] Index unavailable: ${error?.message || error}`);
      return false;
    });
  }
  return indexReady;
};

const indexArtisans = async (docs: ArtisanSearchDoc[]) => {
  if (!docs.length || !(await ensureIndex())) return;
  try {
    await esClient.bulk({
      refresh: false,
      operations: docs.flatMap(doc => [
        { index: { _index: INDEX, _id: doc.artisanId } },
        {
          artisanId: doc.artisanId,
          text: doc.text,
          acceptRate: doc.acceptRate ?? 0,
          responseTimeMinutes: doc.responseTimeMinutes ?? 0,
          rating: doc.rating ?? 0,
          ...(doc.lat != null && doc.lng != null
            ? { location: { lat: doc.lat, lon: doc.lng } }
            : {}),
        },
      ]),
    });
  } catch (error: any) {
    logger.warn(`[Elasticsearch] Index write skipped: ${error?.message || error}`);
  }
};

const textScores = async (query: string, artisanIds: string[]) => {
  const scores = new Map<string, number>();
  if (!query.trim() || !artisanIds.length || !(await ensureIndex())) {
    return scores;
  }

  try {
    const result = await esClient.search({
      index: INDEX,
      size: Math.min(artisanIds.length, 50),
      timeout: '400ms',
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['text'],
              },
            },
          ],
          filter: [{ terms: { artisanId: artisanIds } }],
        },
      },
    });

    const max = result.hits.hits[0]?._score || 1;
    for (const hit of result.hits.hits) {
      const id = (hit._source as { artisanId?: string } | undefined)?.artisanId;
      if (!id || hit._score == null) continue;
      scores.set(id, Math.round((hit._score / max) * 15));
    }
  } catch (error: any) {
    logger.warn(`[Elasticsearch] Search skipped: ${error?.message || error}`);
  }

  return scores;
};

const searchPage = async (query: string, page: number, limit: number) => {
  if (!query.trim() || !(await ensureIndex())) return null;

  try {
    const result = await esClient.search({
      index: INDEX,
      from: Math.max(0, (page - 1) * limit),
      size: limit,
      timeout: '400ms',
      query: {
        multi_match: {
          query,
          fields: ['text'],
        },
      },
    });

    const ids = result.hits.hits
      .map(hit => (hit._source as { artisanId?: string } | undefined)?.artisanId)
      .filter((id): id is string => Boolean(id));
    const rawTotal = result.hits.total;
    const total = typeof rawTotal === 'number' ? rawTotal : rawTotal?.value || ids.length;

    return { ids, total };
  } catch (error: any) {
    logger.warn(`[Elasticsearch] Discover skipped: ${error?.message || error}`);
    return null;
  }
};

export const ElasticArtisanRank = {
  indexArtisans,
  textScores,
  searchPage,
};

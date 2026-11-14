import { esClient } from '../../config/elastic-search';
import config from '../../config';
import { logger } from '../../shared/logger';

const COOLDOWN_MS = 5 * 60 * 1000;
const ready = new Map<string, Promise<boolean>>();
let unavailableUntil = 0;

export type ElasticHit<T> = {
  id: string;
  score: number | null;
  source: T;
};

export type ElasticPage<T> = {
  total: number;
  hits: ElasticHit<T>[];
};

const isConnectionFailure = (error: any) => {
  const name = String(error?.name || '');
  const message = String(error?.message || error || '');
  return (
    name === 'ConnectionError' ||
    name === 'TimeoutError' ||
    name === 'NoLivingConnectionsError' ||
    /ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|socket hang up|ConnectionError|TimeoutError|No Living connections/i.test(
      message,
    )
  );
};

const markUnavailable = (error: any) => {
  unavailableUntil = Date.now() + COOLDOWN_MS;
  ready.clear();
  logger.warn(
    `[Elasticsearch] ${error?.name || error?.message || error}. Using MongoDB search for the next 5 minutes.`,
  );
};

const indexNameOf = (indexName: string) => indexName.toLowerCase();

const ensureIndex = (
  indexName: string,
  mappings?: Record<string, unknown>,
): Promise<boolean> => {
  if (!config.elasticSearch?.url || !indexName) return Promise.resolve(false);
  if (Date.now() < unavailableUntil) return Promise.resolve(false);

  const index = indexNameOf(indexName);
  const existing = ready.get(index);
  if (existing) return existing;

  let pending!: Promise<boolean>;
  pending = (async () => {
    const exists = await esClient.indices.exists(
      { index },
      { requestTimeout: 10000 },
    );
    if (!exists) {
      await esClient.indices.create(
        {
          index,
          ...(mappings ? { mappings: mappings as any } : {}),
        },
        { requestTimeout: 10000 },
      );
    }
    return true;
  })().catch(error => {
    if (ready.get(index) === pending) ready.delete(index);
    if (isConnectionFailure(error)) markUnavailable(error);
    else logger.warn(`[Elasticsearch] Index unavailable: ${error?.message || error}`);
    return false;
  });

  ready.set(index, pending);
  return pending;
};

const bulkIndex = async <T>(
  indexName: string,
  docs: Array<{ id: string; document: T }>,
  mappings?: Record<string, unknown>,
) => {
  if (!docs.length || !(await ensureIndex(indexName, mappings))) return;

  const index = indexNameOf(indexName);
  try {
    for (let offset = 0; offset < docs.length; offset += 200) {
      const chunk = docs.slice(offset, offset + 200);
      const result = await esClient.bulk(
        {
          refresh: false,
          operations: chunk.flatMap(doc => [
            { index: { _index: index, _id: doc.id } },
            doc.document as Record<string, unknown>,
          ]),
        },
        { requestTimeout: 30000 },
      );
      if (result.errors) {
        const failed = result.items.filter(item => item.index?.error);
        logger.warn(
          `[Elasticsearch] Bulk index failed for ${failed.length} document(s): ${failed[0]?.index?.error?.reason || 'unknown'}`,
        );
      }
    }
  } catch (error: any) {
    if (isConnectionFailure(error)) markUnavailable(error);
    else logger.warn(`[Elasticsearch] Bulk index skipped: ${error?.message || error}`);
  }
};

const searchDocuments = async <T>(
  indexName: string,
  query: Record<string, unknown>,
  options?: { page?: number; limit?: number; mappings?: Record<string, unknown> },
): Promise<ElasticPage<T> | null> => {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(50, Math.max(1, options?.limit || 12));
  if (!(await ensureIndex(indexName, options?.mappings))) return null;

  try {
    const response = await esClient.search<T>({
      index: indexNameOf(indexName),
      from: (page - 1) * limit,
      size: limit,
      timeout: '800ms',
      query: query as any,
    });
    const rawTotal = response.hits.total;
    const total = typeof rawTotal === 'number' ? rawTotal : rawTotal?.value || 0;
    const hits = response.hits.hits.map(hit => ({
      id: String(hit._id || ''),
      score: hit._score ?? null,
      source: (hit._source || {}) as T,
    }));
    return { total, hits };
  } catch (error: any) {
    if (isConnectionFailure(error)) markUnavailable(error);
    else logger.warn(`[Elasticsearch] Search skipped: ${error?.message || error}`);
    return null;
  }
};

const createIndex = async <T>(indexName: string, id: string, data: T) => {
  if (!indexName || !id || !data || !(await ensureIndex(indexName))) return;

  const document = { ...(data as Record<string, unknown>) };
  delete document._id;

  try {
    await esClient.index({
      index: indexNameOf(indexName),
      id,
      document,
    });
  } catch (error: any) {
    if (isConnectionFailure(error)) markUnavailable(error);
    else logger.warn(`[Elasticsearch] Index write skipped: ${error?.message || error}`);
  }
};

const searchIndex = async (indexName: string, query: string, fields?: string[]) => {
  if (!query?.trim()) return { total: 0, hits: [] as Array<Record<string, unknown>> };

  const page = await searchDocuments<Record<string, unknown>>(indexName, {
    multi_match: {
      query,
      fields: fields?.length ? fields : ['text', 'locationText'],
      fuzziness: 'AUTO',
      prefix_length: 0,
      fuzzy_transpositions: true,
      lenient: true,
    },
  });
  if (!page) return { total: 0, hits: [] as Array<Record<string, unknown>> };

  return {
    total: page.total,
    hits: page.hits.map(hit => ({
      _id: hit.id,
      _score: hit.score,
      ...hit.source,
    })),
  };
};

const updateIndex = async <T>(indexName: string, id: string, data: T) => {
  if (!indexName || !id || !data || !(await ensureIndex(indexName))) return;

  const doc = { ...(data as Record<string, unknown>) };
  delete doc._id;

  try {
    await esClient.update({
      index: indexNameOf(indexName),
      id,
      doc,
      doc_as_upsert: true,
    });
  } catch (error: any) {
    if (isConnectionFailure(error)) markUnavailable(error);
    else logger.warn(`[Elasticsearch] Update skipped: ${error?.message || error}`);
  }
};

const deleteIndex = async (indexName: string, id: string) => {
  if (!indexName || !id) return;
  try {
    await esClient.delete({
      index: indexNameOf(indexName),
      id,
    });
  } catch (error: any) {
    if (isConnectionFailure(error)) markUnavailable(error);
    else logger.warn(`[Elasticsearch] Delete skipped: ${error?.message || error}`);
  }
};

export const elasticHelper = {
  ensureIndex,
  bulkIndex,
  searchDocuments,
  createIndex,
  searchIndex,
  updateIndex,
  deleteIndex,
};

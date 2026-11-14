import { Client } from '@elastic/elasticsearch';
import config from '.';

export const esClient = new Client({
  node: config.elasticSearch.url || 'http://127.0.0.1:9200',
  // Discover falls back to MongoDB. Fail fast when Elasticsearch is not running.
  requestTimeout: 800,
  pingTimeout: 500,
  maxRetries: 0,
});

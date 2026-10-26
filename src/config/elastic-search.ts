import { Client } from '@elastic/elasticsearch';
import config from '.';

export const esClient = new Client({
  node: config.elasticSearch.url,
});


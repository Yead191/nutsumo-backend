import mongoose from 'mongoose';
import config from '../config';
import { reindexAllArtisans } from '../app/modules/artisanProfile/artisanSearch.sync';
import { esClient } from '../config/elastic-search';
import '../app/modules/service/service.model';
import '../app/modules/category/category.model';

const run = async () => {
  await mongoose.connect(config.database_url as string);
  const count = await reindexAllArtisans();
  await esClient.indices.refresh({ index: 'nutsumo-artisans' });
  const indexed = await esClient.count({ index: 'nutsumo-artisans' });
  console.log(`profiles=${count} indexed=${indexed.count}`);
  await mongoose.disconnect();
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});

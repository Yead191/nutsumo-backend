import { esClient } from "../../config/elastic-search";


const createIndex = async <T>(indexName: string, id: string, data: T) => {
  try {
    if (!indexName || !id || !data) return;

    const newData: any = { ...data };

    if (newData._id) delete newData._id;

    const clientExists = await esClient.indices.exists({
      index: indexName.toLowerCase(),
    });

    if (!clientExists) {
      await esClient.indices.create({ index: indexName.toLowerCase() });
    }
    await esClient.index({
      index: indexName.toLowerCase(),
      id,
      body: newData as any,
    });
    await esClient.indices.refresh({ index: indexName.toLowerCase() });
    console.log('index created');
  } catch (error) {
    console.log(error);
  }
};

const searchIndex = async (
  indexName: string,
  query: any,
  fields?: string[]
) => {
  try {
    const response = await esClient.search({
      index: indexName.toLowerCase(),
      body: {
        query: {
          multi_match: {
            query: query,
            fields: fields?.length ? fields : ['*'],
            fuzziness: 'AUTO',
          },
        } as any,
        highlight: {
          pre_tags: ['<em>'],
          post_tags: ['</em>'],
          require_field_match: false,
          fields: {
            "place": {},
          },
        },
      },
    });

    return response.hits.hits;
  } catch (error) {
    console.log(error);
  }
};

const updateIndex = async <T>(indexName: string, id: string, data: T) => {
  try {
    if (!indexName || !id || !data) return;
    
    const newData: any = { ...data };

    if (newData._id) delete newData._id;
    await esClient.update({
      index: indexName.toLowerCase(),
      id,
      body: {
        doc: newData,
        doc_as_upsert: true,
      },
    });
  } catch (error) {
    console.log(error);
  }
};


const deleteIndex = async (indexName: string, id: string) => {
  try {
    if (!indexName || !id) return;
    await esClient.delete({
      index: indexName.toLowerCase(),
      id,
    });
  } catch (error) {
    console.log(error);
  }
}

export const elasticHelper = {
  createIndex,
  searchIndex,
  updateIndex,
  deleteIndex
};

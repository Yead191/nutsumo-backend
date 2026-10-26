import { PipelineStage, Model } from 'mongoose';

class AggregateQueryBuilder<T> {
  private pipeline: PipelineStage[];
  private query: Record<string, any>;
  private model: Model<T>;

  constructor(model: Model<T>, query: Record<string, any>) {
    this.model = model;
    this.query = query;
    this.pipeline = [];
  }

  search(searchableFields: string[]) {
    if (this.query.searchTerm) {
      const regex = new RegExp(this.query.searchTerm, 'i');
      this.pipeline.push({
        $match: {
          $or: searchableFields.map(field => ({ [field]: { $regex: regex } })),
        },
      });
    }
    return this;
  }


  insertCustomStage(stage: PipelineStage[]) {
    this.pipeline.push(...stage);
    return this;
  }


  filter(excludeFieldss: string[] = []) {
    const queryObj = { ...this.query };
    const excludeFields = ['searchTerm', 'sort', 'page', 'limit', 'fields', ...excludeFieldss];
    excludeFields.forEach(f => delete queryObj[f]);

    Object.keys(queryObj).forEach(key => {
      if (queryObj[key] === '' || queryObj[key] == null) delete queryObj[key];
    });

    if (Object.keys(queryObj).length > 0) {
      this.pipeline.push({ $match: queryObj });
    }

    return this;
  }


  sort() {
    const sortParam = this.query.sort as string;
    const sortStage: Record<string, 1 | -1> = {};

    if (sortParam) {
      sortParam.split(',').forEach(field => {
        const direction = field.startsWith('-') ? -1 : 1;
        sortStage[field.replace('-', '')] = direction;
      });
    } else {
      sortStage['createdAt'] = -1;
    }

    this.pipeline.push({ $sort: sortStage });
    return this;
  }


  fields() {
    if (this.query.fields) {
      const fields = this.query.fields.split(',');
      const projectStage: Record<string, 1> = {};
      fields.forEach((f:any) => (projectStage[f] = 1));
      this.pipeline.push({ $project: projectStage });
    }
    return this;
  }

  populate(localField: string, foreignField: string, from: string, as: string) {
    this.pipeline.push({
      $lookup: {
        from,
        localField,
        foreignField,
        as,
      },
    });
    return this;
  }


  paginate() {
    const limit = Number(this.query.limit) || 10;
    const page = Number(this.query.page) || 1;
    const skip = (page - 1) * limit;

    this.pipeline.push({ $skip: skip });
    this.pipeline.push({ $limit: limit });

    return this;
  }


  async exec() {
    return await this.model.aggregate(this.pipeline);
  }


  async getPaginationInfo() {
    const countPipeline = [...this.pipeline];
    countPipeline.push({ $count: 'total' });
    const totalResult = await this.model.aggregate(countPipeline);
    const total = totalResult[0]?.total || 0;

    const limit = Number(this.query.limit) || 10;
    const page = Number(this.query.page) || 1;
    const totalPage = Math.ceil(total / limit);

    return { total, limit, page, totalPage };
  }
}

export default AggregateQueryBuilder;

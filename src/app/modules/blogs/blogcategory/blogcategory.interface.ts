import { Model } from 'mongoose';

export interface IBlogcategory {
  name: string;
  slug: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type BlogcategoryModel = Model<IBlogcategory>;

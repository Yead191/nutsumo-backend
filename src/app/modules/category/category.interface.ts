import { Model } from 'mongoose';

export interface ICategory {
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  image?: string;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryModel = Model<ICategory>;

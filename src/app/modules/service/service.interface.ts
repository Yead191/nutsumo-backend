import { Model, Types } from 'mongoose';
import { ICategory } from '../category/category.interface';

export interface IService {
  name: string;
  slug: string;
  category: Types.ObjectId | ICategory;
  description?: string;
  isActive: boolean;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ServiceModel = Model<IService>;

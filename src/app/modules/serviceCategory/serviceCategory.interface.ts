import { Model } from 'mongoose';

export interface IServiceCategory {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  services: string[];
  status: 'active' | 'inactive';
}

export type ServiceCategoryModel = Model<IServiceCategory>;

import { Model, Types } from 'mongoose';

export type PortfolioImageType = 'before' | 'after' | 'work';

export interface IPortfolioImage {
  url: string;
  type: PortfolioImageType;
}

export interface IPortfolio {
  artisan: Types.ObjectId; // User ID
  title: string;
  description: string;
  category: Types.ObjectId; // ServiceCategory ID
  images: IPortfolioImage[];
  completedAt?: Date;
  isPublished: boolean;
}

export type PortfolioModel = Model<IPortfolio>;

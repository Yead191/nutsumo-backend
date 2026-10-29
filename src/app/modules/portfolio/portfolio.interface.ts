import { Model, Types } from 'mongoose';

export type PortfolioImageType = 'before' | 'after' | 'work';

export interface IPortfolioImage {
  url: string; // Uploaded file path from fileUploadHandler (e.g. '/image/filename-123.jpg')
  type: PortfolioImageType; // 'before' | 'after' | 'work'
}

export interface IPortfolio {
  _id?: Types.ObjectId;
  artisan: Types.ObjectId; // User ID
  title: string;
  description: string;
  category: Types.ObjectId; // Category ID
  images: IPortfolioImage[];
  completedAt?: Date;
  isPublished: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PortfolioModel = Model<IPortfolio>;

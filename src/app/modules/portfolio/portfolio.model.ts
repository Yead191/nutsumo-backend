import { Schema, model } from 'mongoose';
import {
  IPortfolio,
  IPortfolioImage,
  PortfolioModel,
} from './portfolio.interface';

const portfolioImageSchema = new Schema<IPortfolioImage>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['before', 'after', 'work'],
      default: 'work',
    },
  },
  { _id: false },
);

const portfolioSchema = new Schema<IPortfolio, PortfolioModel>(
  {
    artisan: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    images: {
      type: [portfolioImageSchema],
      default: [],
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

portfolioSchema.index({ artisan: 1, createdAt: -1 });
portfolioSchema.index({ category: 1, isPublished: 1 });
portfolioSchema.index({ title: 'text', description: 'text' });

export const Portfolio = model<IPortfolio, PortfolioModel>(
  'Portfolio',
  portfolioSchema,
);

import { Schema, model } from 'mongoose';
import { IPortfolio, PortfolioModel } from './portfolio.interface';

const portfolioImageSchema = new Schema(
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
      ref: 'ServiceCategory',
      required: true,
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
    },
  },
  {
    timestamps: true,
  },
);

portfolioSchema.index({ artisan: 1 });
portfolioSchema.index({ category: 1 });
portfolioSchema.index({ isPublished: 1 });
portfolioSchema.index({ createdAt: -1 });

export const Portfolio = model<IPortfolio, PortfolioModel>(
  'Portfolio',
  portfolioSchema,
);

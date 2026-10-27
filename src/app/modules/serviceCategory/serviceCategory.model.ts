import { Schema, model } from 'mongoose';
import {
  IServiceCategory,
  ServiceCategoryModel,
} from './serviceCategory.interface';

const serviceCategorySchema = new Schema<
  IServiceCategory,
  ServiceCategoryModel
>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    services: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  },
);

serviceCategorySchema.index({ slug: 1 });
serviceCategorySchema.index({ status: 1 });

export const ServiceCategory = model<IServiceCategory, ServiceCategoryModel>(
  'ServiceCategory',
  serviceCategorySchema,
);

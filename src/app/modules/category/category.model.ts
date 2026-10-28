import { Schema, model } from 'mongoose';
import { ICategory, CategoryModel } from './category.interface';

const categorySchema = new Schema<ICategory, CategoryModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    image: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ createdAt: -1 });

export const Category = model<ICategory, CategoryModel>('Category', categorySchema);
export const ServiceCategory =
  model<ICategory, CategoryModel>('ServiceCategory', categorySchema);

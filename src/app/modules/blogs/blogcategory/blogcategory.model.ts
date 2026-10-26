import { Schema, model } from 'mongoose';
import { IBlogcategory, BlogcategoryModel } from './blogcategory.interface';

const blogcategorySchema = new Schema<IBlogcategory, BlogcategoryModel>(
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
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  },
);

export const BlogCategory = model<IBlogcategory, BlogcategoryModel>(
  'BlogCategory',
  blogcategorySchema,
);

// Also export alias Blogcategory
export const Blogcategory = BlogCategory;

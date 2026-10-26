import { Schema, model } from 'mongoose';
import { IBlog, BlogModel } from './blog.interface';
import { BLOG_STATUS } from './blog.constants';

const blogSchema = new Schema<IBlog, BlogModel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    image: {
      type: String,
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: 'BlogCategory',
      required: true,
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: Object.values(BLOG_STATUS),
      default: BLOG_STATUS.DRAFT,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    totalLikes: {
      type: Number,
      default: 0,
    },

    totalComments: {
      type: Number,
      default: 0,
    },

    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export const Blog = model<IBlog, BlogModel>('Blog', blogSchema);

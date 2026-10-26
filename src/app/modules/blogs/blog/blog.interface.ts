import { Model, Types } from 'mongoose';
import { BLOG_STATUS } from './blog.constants';

export interface IBlog {
  title: string;
  slug: string;
  content: string;
  image?: string;

  category: Types.ObjectId;
  author: Types.ObjectId;

  tags?: string[];

  status: BLOG_STATUS;
  isFeatured: boolean;

  totalLikes: number;
  totalComments: number;

  publishedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export type BlogModel = Model<IBlog>;

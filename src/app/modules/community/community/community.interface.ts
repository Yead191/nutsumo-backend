import { Model, Types } from 'mongoose';

export type ICommunity = {
  title?: string;
  content: string;
  images?: string[];
  author: Types.ObjectId;
  totalLikes: number;
  totalComments: number;
  isPinned?: boolean;
  isLocked?: boolean;
  status?: 'published' | 'draft' | 'archived';
  isLikedByMe?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CommunityModel = Model<ICommunity>;

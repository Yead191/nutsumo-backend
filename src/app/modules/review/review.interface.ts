import { Model, Types } from 'mongoose';
import { IUser } from '../user/user.interface';
import { IJob } from '../job/job.interface';
import { IBooking } from '../booking/booking.interface';

export interface IReviewReply {
  comment: string;
  repliedAt: Date;
}

export type ReviewStatus = 'ACTIVE' | 'FLAGGED' | 'HIDDEN';

export interface IReview {
  _id?: Types.ObjectId;
  booking: Types.ObjectId | IBooking;
  job: Types.ObjectId | IJob;
  customer: Types.ObjectId | IUser;
  artisan: Types.ObjectId | IUser;

  rating: number; // 1 to 5
  comment: string;

  // Specific rating breakdown (optional for detailed feedback)
  qualityRating?: number;
  communicationRating?: number;
  timelinessRating?: number;

  // Artisan reply/response to the review
  reply?: IReviewReply | null;

  isPublic: boolean;
  status: ReviewStatus;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ReviewModel = Model<IReview>;

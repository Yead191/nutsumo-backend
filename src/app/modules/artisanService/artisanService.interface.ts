import { Model, Types } from 'mongoose';
import { IUser } from '../user/user.interface';
import { IService } from '../service/service.interface';

export type RateType = 'HOURLY' | 'DAILY';
export type ArtisanServiceSource = 'CATALOG' | 'CUSTOM';
export type ArtisanServiceReviewStatus =
  | 'APPROVED'
  | 'PENDING_REVIEW'
  | 'REJECTED';

export interface IArtisanService {
  artisan: Types.ObjectId | IUser;
  source: ArtisanServiceSource;
  service?: Types.ObjectId | IService | null;
  category?: Types.ObjectId | null;
  customName?: string;
  proposedCategory?: string;
  normalizedName?: string;
  reviewStatus: ArtisanServiceReviewStatus;
  rejectionReason?: string;
  rateAmount: number;
  rateType: RateType;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ArtisanServiceModel = Model<IArtisanService>;

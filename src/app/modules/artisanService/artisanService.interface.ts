import { Model, Types } from 'mongoose';
import { IUser } from '../user/user.interface';
import { IService } from '../service/service.interface';

export type RateType = 'HOURLY' | 'DAILY';

export interface IArtisanService {
  artisan: Types.ObjectId | IUser;
  service: Types.ObjectId | IService;
  rateAmount: number;
  rateType: RateType;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ArtisanServiceModel = Model<IArtisanService>;

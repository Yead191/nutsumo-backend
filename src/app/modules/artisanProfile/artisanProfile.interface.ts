import { Model, Types } from 'mongoose';
import { IUser } from '../user/user.interface';

export type AvailabilityStatus = 'Available' | 'Booked' | 'Unavailable';

export interface IArtisanProfile {
  _id?: Types.ObjectId;
  user: Types.ObjectId | IUser;
  businessName?: string;
  trade?: string;
  bio?: string;
  location?: string;
  experienceYears?: number;
  availabilityStatus: AvailabilityStatus;
  hourlyRate?: number;
  startingRate?: number;
  completedJobs?: number;
  rating?: number;
  reviewsCount?: number;
  isProfilePublic?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ArtisanProfileModel = Model<IArtisanProfile>;

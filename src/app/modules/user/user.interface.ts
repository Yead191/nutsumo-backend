import { Model, Types } from 'mongoose';
import { USER_ROLES } from '../../../enums/user';

export interface IUser {
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: USER_ROLES;
  googleId?: string;
  authType?: 'credentials' | 'google';

  subscription?: Types.ObjectId;

  verified: boolean;

  status: 'active' | 'blocked' | 'rejected' | 'pending';
  rejectionReason?: string;

  mustChangePassword: boolean;
  phone?: string;

  // Identity Verification (NID Front, Back & Selfie)
  idCardFront?: string;
  idCardBack?: string;
  selfie?: string;
  trade?: string;
  identityStatus?: 'not_submitted' | 'pending' | 'verified' | 'needs_update';
  identityRejectionReason?: string;

  // Professional Artisan Profile Fields
  businessName?: string;
  bio?: string;
  location?: string;
  experienceYears?: number;
  availabilityStatus?: 'Available' | 'Booked' | 'Unavailable';

  authentication?: {
    isResetPassword: boolean;
    oneTimeCode: number;
    expireAt: Date;
  };
}

export type UserModal = {
  isExistUserById(id: string): any;
  isExistUserByEmail(email: string): any;
  isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;

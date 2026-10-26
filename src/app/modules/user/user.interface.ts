import { Model, Types } from 'mongoose';
import { USER_ROLES } from '../../../enums/user';

export interface IVendorProfile {
  jobTitle: string;
  contactNo: string;
  company: string;
  bio: string;
  expertise: string[];
  yearsExperience: string;
  degree?: string;
  linkedin?: string;
  hourlyRate: number;
  availability: string;
  consultationTypes: string[];

  applicationStatus: 'pending' | 'approved' | 'rejected';
  approvedAt?: Date;
  rejectedReason?: string;
  isProfileVisible?: boolean;
}

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

  company?: string;

  // Regular User Only
  interest?: string;

  // Vendor Only
  vendorProfile?: IVendorProfile;

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

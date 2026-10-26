import { USER_ROLES } from "../enums/user";

export type IVerifyEmail = {
  email: string;
  oneTimeCode: number;
};

export type ILoginData = {
  email: string;
  password: string;
};

export type IAuthResetPassword = {
  newPassword: string;
  confirmPassword: string;
};

export type IChangePassword = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type IRegisterData = {
  name: string
  email: string
  password: string
  role?: USER_ROLES
  company?: string
  interest?: string
}
export type IRegisterVendor = {
  fullName: string;
  email: string;
  password: string
  image?: string
  contactNo: string;
  company: string;
  jobTitle: string;
  bio: string;
  expertise: string[];
  yearsExperience: string;
  degree?: string;
  linkedin?: string;
  hourlyRate: number;
  availability: string;
  consultationTypes: string[];
};
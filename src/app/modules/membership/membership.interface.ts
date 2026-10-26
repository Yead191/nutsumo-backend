import { Model } from 'mongoose';

export enum MembershipType {
  USER = 'user',
  VENDOR = 'vendor',
}

export type IMembership = {
  name: string;

  tagline: string;

  price: number;

  recurring: 'week' | 'month' | 'year';

  interval: number;

  featured: boolean;

  highlight?: string;

  features: string[];
  has_trial?: boolean;
  trial_period_days?: number;
  priceId: string;
  productId: string;
  paymentUrl: string;
  type: MembershipType;
  is_auto_renew?: boolean;
};

export type MembershipModel = Model<IMembership>;

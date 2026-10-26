import { Types } from 'mongoose';
import { Model } from 'mongoose';

export type ISubscription = {
  user: Types.ObjectId;
  plan: Types.ObjectId;
  name: string;
  status: 'active' | 'inactive' | 'cancel' | 'expire' | 'cancel-pending';
  start_date: Date;
  recuring?: 'week' | 'month' | 'year' | 'free';
  end_date: Date;
  trial_period_days?: number;
  is_trial?: boolean;
  trial_end_date?: Date;
  price: number;
  features: string[];
  payment_intent_id?: string;
  trxId?: string;
  auto_renew?: boolean;
};

export type SubscriptionModel = Model<ISubscription>;

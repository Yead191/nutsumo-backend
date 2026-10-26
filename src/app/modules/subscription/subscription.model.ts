import { Schema, model } from 'mongoose';
import { ISubscription, SubscriptionModel } from './subscription.interface';

const subscriptionSchema = new Schema<ISubscription, SubscriptionModel>(
  {
    // Define schema fields here
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      default: '',
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'Membership',
      required: true,
    },
    recuring: {
      type: String,
      enum: ['week', 'month', 'year'],
      default: 'month',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancel', 'expire', 'cancel-pending'],
      default: 'active',
    },
    start_date: {
      type: Date,
    },
    end_date: {
      type: Date,
    },
    price: {
      type: Number,
      default: 0,
    },
    features: {
      type: [Object],
      default: [],
    },
    payment_intent_id: {
      type: String,
      default: '',
    },
    trxId: {
      type: String,
      default: '',
    },
    is_trial: {
      type: Boolean,
      default: false,
    },
    trial_period_days: {
      type: Number,
      default: 0,
    },
    trial_end_date: {
      type: Date,
    },
    auto_renew: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const Subscription = model<ISubscription, SubscriptionModel>(
  'Subscription',
  subscriptionSchema,
);

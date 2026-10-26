import { Schema, model } from 'mongoose';
import {
  IMembership,
  MembershipModel,
  MembershipType,
} from './membership.interface';

const membershipSchema = new Schema<IMembership, MembershipModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: false,
    },
    tagline: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [MembershipType.USER, MembershipType.VENDOR],
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    recurring: {
      type: String,
      required: false,
      enum: ['week', 'month', 'year'],
      default: 'month',
    },
    interval: {
      type: Number,
      required: false,
      default: 1,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    highlight: {
      type: String,
      trim: true,
    },
    features: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]) => value.length > 0,
        message: 'At least one feature is required.',
      },
    },
    paymentUrl: {
      type: String,
      required: false,
    },
    productId: {
      type: String,
      required: false,
    },
    priceId: {
      type: String,
      required: false,
    },
    has_trial: {
      type: Boolean,
      default: false,
    },
    trial_period_days: {
      type: Number,
      default: 0,
    },
    is_auto_renew: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const Membership = model<IMembership, MembershipModel>(
  'Membership',
  membershipSchema,
);

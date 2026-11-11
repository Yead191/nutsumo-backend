import { Schema, model } from 'mongoose';
import { IBooking, BookingModel } from './booking.interface';
import {
  BOOKING_STATUSES,
  BOOKING_PAYMENT_STATUSES,
  BOOKING_PAYOUT_STATUSES,
  DEFAULT_PLATFORM_COMMISSION_PERCENTAGE,
  TAX_RATES,
} from './booking.constants';

const bookingSchema = new Schema<IBooking, BookingModel>(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    job: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    quotation: {
      type: Schema.Types.ObjectId,
      ref: 'Quotation',
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    artisan: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    rateType: {
      type: String,
      enum: ['HOURLY', 'DAILY', 'FIXED'],
      required: true,
    },
    vatRate: {
      type: Number,
      default: TAX_RATES.VAT,
      min: 0,
    },
    vatAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    nhilRate: {
      type: Number,
      default: TAX_RATES.NHIL,
      min: 0,
    },
    nhilAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    getFundLevyRate: {
      type: Number,
      default: TAX_RATES.GET_FUND_LEVY,
      min: 0,
    },
    getFundLevyAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    platformCommissionRate: {
      type: Number,
      default: DEFAULT_PLATFORM_COMMISSION_PERCENTAGE,
      min: 0,
      max: 100,
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    artisanPayoutAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUSES),
      default: BOOKING_STATUSES.AWAITING_PAYMENT,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(BOOKING_PAYMENT_STATUSES),
      default: BOOKING_PAYMENT_STATUSES.UNPAID,
      index: true,
    },
    payoutStatus: {
      type: String,
      enum: Object.values(BOOKING_PAYOUT_STATUSES),
      default: BOOKING_PAYOUT_STATUSES.PENDING,
      index: true,
    },
    stripeSessionId: {
      type: String,
      default: null,
      index: true,
    },
    stripePaymentIntentId: {
      type: String,
      default: null,
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    startDate: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    deliveryNotes: {
      type: String,
      default: '',
      trim: true,
    },
    deliveryProof: {
      type: [String],
      default: [],
    },
    revisionNotes: {
      type: String,
      default: '',
      trim: true,
    },
    revisionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    disputeReason: {
      type: String,
      default: '',
      trim: true,
    },
    disputedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    disputedAt: {
      type: Date,
      default: null,
    },
    customerConfirmedAt: {
      type: Date,
      default: null,
    },
    completionDate: {
      type: Date,
      default: null,
    },
    review: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
      default: null,
    },
    customerRating: {
      type: Number,
      default: null,
      min: 1,
      max: 5,
    },
    customerFeedback: {
      type: String,
      default: '',
      trim: true,
    },
    payoutApprovedAt: {
      type: Date,
      default: null,
    },
    payoutApprovedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    payoutReleasedAt: {
      type: Date,
      default: null,
    },
    payoutReleasedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    payoutTransferId: {
      type: String,
      default: null,
    },
    payoutMethod: {
      type: String,
      default: '',
      trim: true,
    },
    payoutNotes: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

bookingSchema.index({ customer: 1, status: 1, createdAt: -1 });
bookingSchema.index({ artisan: 1, status: 1, createdAt: -1 });
bookingSchema.index({ job: 1, status: 1 });
bookingSchema.index({ payoutStatus: 1, status: 1 });

export const Booking = model<IBooking, BookingModel>('Booking', bookingSchema);

import { Schema, model } from 'mongoose';
import { IBooking, BookingModel } from './booking.interface';
import {
  BOOKING_STATUSES,
  BOOKING_PAYMENT_STATUSES,
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
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUSES),
      default: BOOKING_STATUSES.CONFIRMED,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(BOOKING_PAYMENT_STATUSES),
      default: BOOKING_PAYMENT_STATUSES.UNPAID,
      index: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    completionDate: {
      type: Date,
      default: null,
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

export const Booking = model<IBooking, BookingModel>('Booking', bookingSchema);

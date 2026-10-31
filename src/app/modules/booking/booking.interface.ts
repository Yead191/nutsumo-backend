import { Model, Types } from 'mongoose';

export type BookingStatus =
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type BookingPaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';

export interface IBooking {
  bookingNumber: string;
  job: Types.ObjectId;
  quotation: Types.ObjectId;
  customer: Types.ObjectId;
  artisan: Types.ObjectId;

  totalAmount: number;
  rateType: 'HOURLY' | 'DAILY' | 'FIXED';

  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;

  startDate?: Date | null;
  completionDate?: Date | null;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type BookingModel = Model<IBooking>;

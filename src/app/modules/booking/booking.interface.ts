import { Model, Types } from 'mongoose';

export type BookingStatus =
  | 'AWAITING_PAYMENT'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'REVISION_REQUESTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export type BookingPaymentStatus =
  | 'UNPAID'
  | 'ESCROW_HELD'
  | 'PAID'
  | 'REFUNDED';

export type BookingPayoutStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'RELEASED'
  | 'REJECTED';

export interface IBooking {
  bookingNumber: string;
  job: Types.ObjectId;
  quotation: Types.ObjectId;
  customer: Types.ObjectId;
  artisan: Types.ObjectId;

  totalAmount: number;
  rateType: 'HOURLY' | 'DAILY' | 'FIXED';

  // Platform commission and artisan payout
  platformCommissionRate: number; // e.g. 10 (representing 10%)
  platformFee: number;            // e.g. 10.00
  artisanPayoutAmount: number;    // e.g. 90.00

  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  payoutStatus: BookingPayoutStatus;

  // Stripe Payment Details
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paidAt?: Date | null;

  // Milestones
  startDate?: Date | null;
  deliveredAt?: Date | null;
  customerConfirmedAt?: Date | null;
  completionDate?: Date | null;

  // Delivery details from Artisan
  deliveryNotes?: string;
  deliveryProof?: string[];

  // Revision details from Customer
  revisionNotes?: string;
  revisionCount?: number;

  // Dispute details
  disputeReason?: string;
  disputedBy?: Types.ObjectId | null;
  disputedAt?: Date | null;

  // Dedicated Review ref
  review?: Types.ObjectId | null;

  // Customer Feedback & Review (legacy/cache fields)
  customerRating?: number;
  customerFeedback?: string;

  // Payout Details
  payoutApprovedAt?: Date | null;
  payoutApprovedBy?: Types.ObjectId | null;
  payoutReleasedAt?: Date | null;
  payoutReleasedBy?: Types.ObjectId | null;
  payoutTransferId?: string | null;
  payoutMethod?: string;
  payoutNotes?: string;

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type BookingModel = Model<IBooking>;

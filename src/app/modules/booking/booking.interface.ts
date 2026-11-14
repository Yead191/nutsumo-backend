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

  // Statutory Levies & Platform Fee Breakdown
  vatRate: number;            // 15% (VAT)
  vatAmount: number;          // e.g. 15.00
  nhilRate: number;           // 2.5% (National Health Insurance Levy)
  nhilAmount: number;         // e.g. 2.50
  getFundLevyRate: number;    // 2.5% (Ghana Education Trust Fund Levy)
  getFundLevyAmount: number;  // e.g. 2.50
  platformServiceFeeRate: number;   // 2.5% Nutsumo platform fee
  platformServiceFeeAmount: number;

  // Total withheld (statutory + platform fee) and artisan payout
  platformCommissionRate: number; // 22.5%
  platformFee: number;            // statutory + platform fee
  artisanPayoutAmount: number;    // 77.5% net credited to the artisan balance

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

  // Cancellation details
  cancelledAt?: Date | null;
  cancelledBy?: Types.ObjectId | null;
  cancellationReason?: string;
  refundId?: string | null;
  refundAmount?: number;

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

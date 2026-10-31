import { Model, Types } from 'mongoose';
import {
  QUOTATION_RATE_TYPES,
  QUOTATION_STATUSES,
} from './quotation.constants';

export type QuotationStatus =
  (typeof QUOTATION_STATUSES)[keyof typeof QUOTATION_STATUSES];

export type QuotationRateType =
  (typeof QUOTATION_RATE_TYPES)[keyof typeof QUOTATION_RATE_TYPES];

export interface IQuotation {
  job: Types.ObjectId;
  customer: Types.ObjectId;
  artisan: Types.ObjectId;

  proposedAmount: number;
  rateType: QuotationRateType;

  message: string;
  estimatedDuration?: string;

  status: QuotationStatus;
  rejectReason?: string;

  withdrawnAt?: Date | null;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type QuotationModel = Model<IQuotation>;

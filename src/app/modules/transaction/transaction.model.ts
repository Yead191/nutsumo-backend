import { Schema, model } from 'mongoose';
import { ITransaction, TransactionModel } from './transaction.interface';
import {
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '../../../enums/transaction';

const transactionSchema = new Schema<ITransaction, TransactionModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    amount: {
      type: Number,
      required: false,
      default: 0,
    },
    total_price: {
      type: Number,
      default: 0,
    },
    payment_received: {
      type: Number,
      required: false,
      default: 0,
    },
    discount_percentage: {
      type: Number,
      required: false,
      default: 0,
    },
    discount_amount: {
      type: Number,
      required: false,
      default: 0,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    platform_fee: {
      type: Number,
      required: false,
      default: 0,
    },
    transaction_id: {
      type: String,
      trim: true,
    },
    payment_intent_id: {
      type: String,
      trim: true,
    },
    payment_method: {
      type: String,
      trim: true,
      default: 'stripe',
    },
    status: {
      type: String,
      enum: Object.values(TRANSACTION_STATUS),
      default: TRANSACTION_STATUS.SUCCESS,
    },
    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPE),
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(TRANSACTION_CATEGORY),
      required: true,
    },
    prev_transaction_id: {
      type: String,
      required: false,
    },
  },
  { timestamps: true },
);

// Pre-save synchronization hook to keep amount, total_price, and payment_received consistent
transactionSchema.pre('save', function (next) {
  if ((!this.total_price || this.total_price === 0) && this.amount) {
    this.total_price = this.amount;
  }
  if ((!this.amount || this.amount === 0) && this.total_price) {
    this.amount = this.total_price;
  }
  if ((!this.payment_received || this.payment_received === 0) && this.total_price) {
    this.payment_received = this.total_price;
  }
  if (!this.transaction_id && this.payment_intent_id) {
    this.transaction_id = this.payment_intent_id;
  }
  next();
});

// Database indexes for high performance querying and dashboard filtering
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ user: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ category: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ transaction_id: 1 });
transactionSchema.index({ order: 1 });

export const Transaction = model<ITransaction, TransactionModel>(
  'Transaction',
  transactionSchema,
);

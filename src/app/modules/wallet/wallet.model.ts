import { Schema, model } from 'mongoose';
import {
  IArtisanWallet,
  IWalletLedger,
  IWithdrawal,
  ArtisanWalletModel,
  WalletLedgerModel,
  WithdrawalModel,
} from './wallet.interface';

const destinationSchema = new Schema(
  {
    method: {
      type: String,
      enum: ['BANK', 'MOMO'],
    },
    accountName: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    momoNetwork: {
      type: String,
      enum: ['MTN', 'VODAFONE', 'AIRTELTIGO'],
    },
    momoNumber: { type: String, trim: true },
  },
  { _id: false },
);

const artisanWalletSchema = new Schema<IArtisanWallet, ArtisanWalletModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    available: { type: Number, default: 0, min: 0 },
    lifetimeCredited: { type: Number, default: 0, min: 0 },
    lifetimeWithdrawn: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'GHS' },
    destination: { type: destinationSchema, default: undefined },
  },
  { timestamps: true },
);

const walletLedgerSchema = new Schema<IWalletLedger, WalletLedgerModel>(
  {
    artisan: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    entryType: {
      type: String,
      enum: ['CREDIT_RELEASE', 'DEBIT_WITHDRAW', 'CREDIT_REVERSAL'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true, min: 0 },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking' },
    withdrawal: { type: Schema.Types.ObjectId, ref: 'Withdrawal' },
    idempotencyKey: { type: String, required: true, unique: true },
    note: { type: String },
  },
  { timestamps: true },
);

const withdrawalSchema = new Schema<IWithdrawal, WithdrawalModel>(
  {
    artisan: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['REQUESTED', 'PROCESSING', 'PAID', 'FAILED'],
      default: 'REQUESTED',
      index: true,
    },
    method: {
      type: String,
      enum: ['BANK', 'MOMO', 'STRIPE'],
      required: true,
    },
    destination: { type: destinationSchema, default: undefined },
    transferId: { type: String },
    reference: { type: String },
    failureReason: { type: String },
    settledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    settledAt: { type: Date },
  },
  { timestamps: true },
);

export const ArtisanWallet = model<IArtisanWallet, ArtisanWalletModel>(
  'ArtisanWallet',
  artisanWalletSchema,
);
export const WalletLedger = model<IWalletLedger, WalletLedgerModel>(
  'WalletLedger',
  walletLedgerSchema,
);
export const Withdrawal = model<IWithdrawal, WithdrawalModel>(
  'Withdrawal',
  withdrawalSchema,
);

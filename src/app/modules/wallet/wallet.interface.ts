import { Model, Types } from 'mongoose';

export type PayoutDestinationMethod = 'BANK' | 'MOMO';
export type MomoNetwork = 'MTN' | 'VODAFONE' | 'AIRTELTIGO';
export type WithdrawalStatus = 'REQUESTED' | 'PROCESSING' | 'PAID' | 'FAILED';
export type WithdrawalMethod = 'BANK' | 'MOMO' | 'STRIPE';
export type LedgerEntryType =
  | 'CREDIT_RELEASE'
  | 'DEBIT_WITHDRAW'
  | 'CREDIT_REVERSAL';

export interface IPayoutDestination {
  method: PayoutDestinationMethod;
  accountName: string;
  bankName?: string;
  accountNumber?: string;
  momoNetwork?: MomoNetwork;
  momoNumber?: string;
}

export interface IArtisanWallet {
  user: Types.ObjectId;
  available: number;
  lifetimeCredited: number;
  lifetimeWithdrawn: number;
  currency: string;
  destination?: IPayoutDestination;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWalletLedger {
  artisan: Types.ObjectId;
  entryType: LedgerEntryType;
  amount: number;
  balanceAfter: number;
  booking?: Types.ObjectId;
  withdrawal?: Types.ObjectId;
  idempotencyKey: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWithdrawal {
  artisan: Types.ObjectId;
  amount: number;
  status: WithdrawalStatus;
  method: WithdrawalMethod;
  destination?: IPayoutDestination;
  transferId?: string;
  reference?: string;
  failureReason?: string;
  settledBy?: Types.ObjectId;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ArtisanWalletModel = Model<IArtisanWallet>;
export type WalletLedgerModel = Model<IWalletLedger>;
export type WithdrawalModel = Model<IWithdrawal>;

import { Model } from 'mongoose';

export enum DisclaimerType {
  PRIVACY = 'privacy',

  USER_TERMS = 'user-terms',
  VENDOR_TERMS = 'vendor-terms',

  REFUND = 'refund',
}

export type IDisclaimer = {
  content: string;
  type: DisclaimerType;
};

export type DisclaimerModel = Model<IDisclaimer>;

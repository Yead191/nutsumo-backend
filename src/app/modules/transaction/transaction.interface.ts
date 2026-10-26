import { Model, Types } from 'mongoose';
import {
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '../../../enums/transaction';

export type ITransaction = {
  user?: Types.ObjectId;
  amount?: number;
  total_price: number;
  payment_received: number;
  discount_percentage?: number;
  discount_amount?: number;
  platform_fee?: number;
  transaction_id?: string;
  payment_intent_id?: string;
  payment_method?: string;
  order?: Types.ObjectId;
  status: TRANSACTION_STATUS;
  type: TRANSACTION_TYPE;
  category: TRANSACTION_CATEGORY;
  prev_transaction_id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TransactionModel = Model<ITransaction>;

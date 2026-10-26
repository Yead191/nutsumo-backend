import { Schema, model } from 'mongoose';
import {
  IDisclaimer,
  DisclaimerModel,
  DisclaimerType,
} from './disclaimer.interface';

const disclaimerSchema = new Schema<IDisclaimer, DisclaimerModel>(
  {
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(DisclaimerType),
      required: true,
      unique: true,
    },
  },
  { timestamps: true },
);

export const Disclaimer = model<IDisclaimer, DisclaimerModel>(
  'Disclaimer',
  disclaimerSchema,
);

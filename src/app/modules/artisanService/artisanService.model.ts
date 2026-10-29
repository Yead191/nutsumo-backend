import { Schema, model } from 'mongoose';
import { IArtisanService, ArtisanServiceModel } from './artisanService.interface';

const artisanServiceSchema = new Schema<IArtisanService, ArtisanServiceModel>(
  {
    artisan: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      index: true,
    },
    rateAmount: {
      type: Number,
      required: true,
      min: [1, 'Rate amount must be greater than zero'],
    },
    description: {
      type: String,
      default: "",
    },
    rateType: {
      type: String,
      enum: {
        values: ['HOURLY', 'DAILY'],
        message: '{VALUE} is not a valid rate type. Must be HOURLY or DAILY',
      },
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound Unique Index: prevents duplicate service selections for the same artisan!
artisanServiceSchema.index({ artisan: 1, service: 1 }, { unique: true });
artisanServiceSchema.index({ artisan: 1, isActive: 1 });
artisanServiceSchema.index({ service: 1, isActive: 1 });
artisanServiceSchema.index({ createdAt: -1 });

export const ArtisanService = model<IArtisanService, ArtisanServiceModel>(
  'ArtisanService',
  artisanServiceSchema,
);

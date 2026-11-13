import { Schema, model } from 'mongoose';
import { logger } from '../../../shared/logger';
import { IArtisanService, ArtisanServiceModel } from './artisanService.interface';

const artisanServiceSchema = new Schema<IArtisanService, ArtisanServiceModel>(
  {
    artisan: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['CATALOG', 'CUSTOM'],
      default: 'CATALOG',
      index: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
    },
    customName: {
      type: String,
      trim: true,
      default: '',
    },
    proposedCategory: {
      type: String,
      trim: true,
      default: '',
    },
    normalizedName: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    reviewStatus: {
      type: String,
      enum: ['APPROVED', 'PENDING_REVIEW', 'REJECTED'],
      default: 'APPROVED',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
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

// Catalog picks stay unique per artisan. Custom offerings have no service id,
// so the unique rule only applies when a catalog service is set.
artisanServiceSchema.index(
  { artisan: 1, service: 1 },
  {
    unique: true,
    partialFilterExpression: { service: { $type: 'objectId' } },
  },
);
artisanServiceSchema.index(
  { artisan: 1, category: 1, normalizedName: 1 },
  {
    unique: true,
    partialFilterExpression: { source: 'CUSTOM' },
  },
);
artisanServiceSchema.index({ artisan: 1, isActive: 1 });
artisanServiceSchema.index({ service: 1, isActive: 1 });
artisanServiceSchema.index({ category: 1, isActive: 1, reviewStatus: 1 });
artisanServiceSchema.index({ createdAt: -1 });

export const ArtisanService = model<IArtisanService, ArtisanServiceModel>(
  'ArtisanService',
  artisanServiceSchema,
);

void ArtisanService.syncIndexes().catch(error => {
  logger.error('ArtisanService index sync failed', error);
});

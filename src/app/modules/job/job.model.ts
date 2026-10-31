import { Schema, model } from 'mongoose';
import { IJob, JobModel } from './job.interface';
import { JOB_STATUSES } from './job.constants';

const jobSchema = new Schema<IJob, JobModel>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },

    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      default: null,
    },

    customServiceName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },

    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    budget: {
      type: Number,
      min: [0, 'Budget cannot be negative'],
      default: null,
    },

    preferredDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(JOB_STATUSES),
      default: JOB_STATUSES.OPEN,
      required: true,
    },
    images: {
      type: [String],
      required: false,
      validate: {
        validator: (images: string[]) => images.length <= 10,
        message: 'A job can contain a maximum of 10 images',
      },
    },
    postCode: {
      type: String,
      trim: true,
    },
    selectedQuotation: {
      type: Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null,
    },
    selectedArtisan: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

jobSchema.index({ category: 1, status: 1, createdAt: -1 });
jobSchema.index({ service: 1, status: 1, createdAt: -1 });

export const Job = model<IJob, JobModel>('Job', jobSchema);

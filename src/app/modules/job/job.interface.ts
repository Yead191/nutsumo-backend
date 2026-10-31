import { Model, Types } from 'mongoose';
import { JOB_STATUSES } from './job.constants';

export type JobStatus = (typeof JOB_STATUSES)[keyof typeof JOB_STATUSES];

export interface IJob {
  customer: Types.ObjectId;

  title: string;
  description: string;

  category?: Types.ObjectId | null;
  service?: Types.ObjectId | null;
  customServiceName?: string;
  postCode?: string;
  location: string;

  budget?: number | null;
  preferredDate?: Date | null;

  status: JobStatus;

  selectedQuotation?: Types.ObjectId | null;
  selectedArtisan?: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
  images?: string[];
}

export type JobModel = Model<IJob>;

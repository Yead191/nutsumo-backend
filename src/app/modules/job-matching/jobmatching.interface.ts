import { Model, Types } from 'mongoose';
import { RateType } from '../artisanService/artisanService.interface';

export interface IJobMatch {
  artisan: Types.ObjectId;
  artisanService: Types.ObjectId;
  service: Types.ObjectId;
  rateAmount: number;
  rateType: RateType;
  matchScore: number;
  matchReason: string[];
}

export interface IJobMatchingJobData {
  jobId: string;
  jobTitle?: string;
}

export type IJobmatching = {
  // Define the interface for Jobmatching here
};

export type JobmatchingModel = Model<IJobmatching>;

import { Schema, model } from 'mongoose';
import { IJobmatching, JobmatchingModel } from './jobmatching.interface'; 

const jobmatchingSchema = new Schema<IJobmatching, JobmatchingModel>({
  // Define schema fields here
});

export const Jobmatching = model<IJobmatching, JobmatchingModel>('Jobmatching', jobmatchingSchema);

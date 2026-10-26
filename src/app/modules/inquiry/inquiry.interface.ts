import { Model } from 'mongoose';

export enum InquiryStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  MEETING_SCHEDULED = 'MEETING_SCHEDULED',
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
}
export enum ProjectBudget {
  UNDER_100 = 'UNDER_100',
  RANGE_100_300 = '100_300',
  RANGE_300_500 = '300_500',
  RANGE_600_1000 = '600_1000',
  ABOVE_1000 = 'ABOVE_1000',
}

export type IInquiry = {
  name: string;

  email: string;

  phone?: string;

  company?: string;

  projectDescription: string;

  budget: ProjectBudget;

  status?: InquiryStatus;
  note?: string;
  createdAt?: string;
};

export type InquiryModel = Model<IInquiry>;

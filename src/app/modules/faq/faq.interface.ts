import { Model } from 'mongoose';

export interface IFAQItem {
  question: string;
  answer: string;
}

export interface IFAQ {
  title: string;
  items: IFAQItem[];
  isActive: boolean;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type FAQModel = Model<IFAQ>;

// Backward compatibility aliases
export type IFaq = IFAQ;
export type IFaqItem = IFAQItem;
export type FaqModel = FAQModel;

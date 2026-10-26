import { Schema, model } from 'mongoose';
import { IFAQ, FAQModel } from './faq.interface';

const faqItemSchema = new Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const faqSchema = new Schema<IFAQ, FAQModel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    items: {
      type: [faqItemSchema],
      required: true,
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export const FAQ = model<IFAQ, FAQModel>('FAQ', faqSchema);
export const Faq = FAQ;

import { z } from 'zod';

const objectId = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .regex(/^[a-f\d]{24}$/i, `Invalid ${label}`);

const startConversationValidationSchema = z.object({
  body: z.object({
    participantId: objectId('participant ID'),
    jobId: objectId('job ID').optional(),
  }),
});

const conversationIdValidationSchema = z.object({
  params: z.object({ id: objectId('conversation ID') }),
});

const sendMessageValidationSchema = z.object({
  params: z.object({ id: objectId('conversation ID') }),
  body: z.object({
    text: z.string().max(4000, 'Message is too long').optional(),
  }),
});

export const ChatValidations = {
  startConversationValidationSchema,
  conversationIdValidationSchema,
  sendMessageValidationSchema,
};

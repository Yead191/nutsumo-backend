import { z } from 'zod';
import { DisclaimerType } from './disclaimer.interface';

const createDisclaimerZod = z.object({
  body: z.object({
    content: z.string({ required_error: 'content is required!' }),
    type: z.enum(Object.values(DisclaimerType) as [string, ...string[]]),
  }),
});

export const DisclaimerValidations = { createDisclaimerZod };

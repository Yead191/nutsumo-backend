import { z } from 'zod';

const deleteMultipleTransactionsSchema = z.object({
  body: z.object({
    ids: z
      .array(z.string().min(1, 'ID cannot be empty'), {
        required_error: 'Array of transaction IDs is required',
      })
      .min(1, 'At least one ID is required'),
  }),
});

export const TransactionValidations = {
  deleteMultipleTransactionsSchema,
};

import { z } from 'zod';

const saveDestinationZodSchema = z.object({
  body: z
    .object({
      method: z.enum(['BANK', 'MOMO']),
      accountName: z.string().trim().min(2).max(80),
      bankName: z.string().trim().max(80).optional(),
      accountNumber: z.string().trim().max(40).optional(),
      momoNetwork: z.enum(['MTN', 'VODAFONE', 'AIRTELTIGO']).optional(),
      momoNumber: z.string().trim().max(20).optional(),
    })
    .superRefine((value, ctx) => {
      if (value.method === 'BANK') {
        if (!value.bankName?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['bankName'],
            message: 'Bank name is required',
          });
        }
        if (!value.accountNumber || value.accountNumber.trim().length < 5) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['accountNumber'],
            message: 'Account number is required',
          });
        }
      }
      if (value.method === 'MOMO') {
        if (!value.momoNetwork) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['momoNetwork'],
            message: 'Choose a mobile money network',
          });
        }
        if (!value.momoNumber || value.momoNumber.replace(/\s/g, '').length < 10) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['momoNumber'],
            message: 'Enter the mobile money number',
          });
        }
      }
    }),
});

const withdrawZodSchema = z.object({
  body: z.object({
    amount: z.coerce.number().positive(),
  }),
});

const settleWithdrawalZodSchema = z.object({
  body: z.object({
    decision: z.enum(['PAID', 'FAILED']),
    reference: z.string().trim().max(80).optional(),
    reason: z.string().trim().max(240).optional(),
  }),
});

export const WalletValidation = {
  saveDestinationZodSchema,
  withdrawZodSchema,
  settleWithdrawalZodSchema,
};

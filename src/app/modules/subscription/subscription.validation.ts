import { z } from 'zod';

const cancelSubscriptionZod = z.object({
  body: z.object({
    subscriptionId: z.string({ required_error: 'Subscription ID is required' }),
    cancelType: z.enum(['end_of_period', 'immediate'], {
      required_error: 'Cancel type is required',
    }),
  }),
});

const subscribePackageZod = z.object({
  body: z.object({
    auto_renew: z.boolean().optional(),
  }),
});

export const SubscriptionValidations = {
  cancelSubscriptionZod,
  subscribePackageZod,
};

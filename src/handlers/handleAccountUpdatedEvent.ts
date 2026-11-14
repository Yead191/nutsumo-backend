import Stripe from 'stripe';
import { logger } from '../shared/logger';
import { User } from '../app/modules/user/user.model';
import { WalletServices } from '../app/modules/wallet/wallet.service';

export const handleAccountUpdatedEvent = async (data: Stripe.Account) => {
  const existingUser = await User.findOne({
    'stripeAccountInfo.accountId': data.id,
  }).select('_id');

  if (!existingUser && data.metadata?.userId) {
    await WalletServices.persistStripeAccount(data.metadata.userId, data);
    return;
  }

  if (!existingUser) {
    logger.warn(`[Stripe] Connected account ${data.id} is not linked to a user`);
    return;
  }

  await WalletServices.persistStripeAccount(String(existingUser._id), data);
};

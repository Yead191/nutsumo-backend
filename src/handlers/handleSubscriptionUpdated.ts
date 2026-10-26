import Stripe from 'stripe';
import { Subscription } from '../app/modules/subscription/subscription.model';
import handleSubscriptionDelete from './handleSubscriptionDelete';

export const handleSubscriptionUpdated = async (
  subscription: Stripe.Subscription,
) => {
  if (subscription.status === 'canceled') {
    await handleSubscriptionDelete(subscription.id);
  } else if (subscription.cancel_at_period_end) {
    await Subscription.findOneAndUpdate(
      {
        $or: [
          { trxId: subscription.id },
          { payment_intent_id: subscription.id },
        ],
      },
      { status: 'cancel-pending' },
    );
  }
};

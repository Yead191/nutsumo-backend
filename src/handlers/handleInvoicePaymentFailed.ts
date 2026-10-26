import mongoose from 'mongoose';
import Stripe from 'stripe';
import { Subscription } from '../app/modules/subscription/subscription.model';
import { NotificationServices } from '../app/modules/notification/notification.service';
import { emailHelper } from '../helpers/emailHelper';
import { emailTemplate } from '../shared/emailTemplate';

export const handleInvoicePaymentFailed = async (invoice: Stripe.Invoice) => {
  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    const rawSubscription =
      (invoice as any).subscription ||
      (invoice as any).subscription_details?.subscription ||
      (invoice as any).parent?.subscription_details?.subscription;
    const subscriptionId =
      typeof rawSubscription === 'string'
        ? rawSubscription
        : rawSubscription?.id;

    if (!subscriptionId) {
      console.log(
        '[Invoice Payment Failed] Skipping: No subscription ID found on invoice:',
        invoice.id,
      );
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      return;
    }

    // 1. Find Subscription
    const subscription: any = await Subscription.findOne({
      $or: [{ payment_intent_id: subscriptionId }, { trxId: subscriptionId }],
    })
      .populate('user')
      .session(mongoSession);

    if (!subscription) {
      console.error(
        `[Invoice Payment Failed] Subscription not found for ID: ${subscriptionId}`,
      );
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      return;
    }

    const user = subscription.user as any;
    const amountDue = (invoice.amount_due || 0) / 100;

    // 2. Mark Subscription as inactive
    await Subscription.findByIdAndUpdate(
      subscription._id,
      { status: 'inactive' },
      { session: mongoSession },
    );

    // 3. Send Notifications & Email
    if (user?._id) {
      await NotificationServices.createNotification({
        receiver: user._id,
        title: 'Subscription Payment Failed',
        message: `Payment of $${amountDue.toFixed(2)} failed for your ${subscription.name} subscription. Please update your payment method.`,
        refId: subscription._id,
        path: '/dashboard/subscriptions',
      });
    }

    if (user?.email) {
      try {
        const userEmailData = emailTemplate.subscriptionPaymentFailed({
          email: user.email,
          name: user.name || 'Member',
          membershipName: subscription.name,
          amountDue,
          reason: 'Your payment method could not be charged.',
        });
        await emailHelper.sendEmail(userEmailData);
      } catch (emailErr) {
        console.error(
          'Failed to send subscription payment failed email:',
          emailErr,
        );
      }
    }

    await mongoSession.commitTransaction();
    mongoSession.endSession();
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }
    mongoSession.endSession();
    console.error('[Invoice Payment Failed Error]:', error);
  }
};

import mongoose from 'mongoose';
import Stripe from 'stripe';
import { Subscription } from '../app/modules/subscription/subscription.model';
import { Transaction } from '../app/modules/transaction/transaction.model';
import {
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '../enums/transaction';
import { NotificationServices } from '../app/modules/notification/notification.service';
import { emailHelper } from '../helpers/emailHelper';
import { emailTemplate } from '../shared/emailTemplate';

export const handleInvoicePaymentSucceeded = async (
  invoice: Stripe.Invoice,
) => {
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
        '[Invoice Payment Succeeded] Skipping: No subscription ID found on invoice:',
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
      .populate('plan')
      .session(mongoSession);

    if (!subscription) {
      console.error(
        `[Invoice Payment Succeeded] Subscription not found for ID: ${subscriptionId}`,
      );
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      return;
    }

    const user = subscription.user as any;
    const amountPaid = (invoice.amount_paid || 0) / 100;
    const periodEndTimestamp =
      invoice.lines?.data?.[0]?.period?.end || (invoice as any).period_end;
    const newEndDate = periodEndTimestamp
      ? new Date(periodEndTimestamp * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const formattedNextBillingDate = newEndDate.toISOString().split('T')[0];

    // 2. Update Subscription: Convert trial to active, set is_trial = false, extend end_date
    await Subscription.findByIdAndUpdate(
      subscription._id,
      {
        status: 'active',
        is_trial: false,
        end_date: newEndDate,
      },
      { session: mongoSession },
    );

    // 3. Prevent Duplicate Transaction using Payment Intent or Invoice ID
    const rawPaymentIntent = (invoice as any).payment_intent;
    const transactionId =
      (typeof rawPaymentIntent === 'string'
        ? rawPaymentIntent
        : rawPaymentIntent?.id) || invoice.id;

    const existingTransaction = await Transaction.findOne({
      transaction_id: transactionId,
    }).session(mongoSession);

    if (!existingTransaction && amountPaid > 0) {
      await Transaction.create(
        [
          {
            user: user._id,
            total_price: amountPaid,
            payment_received: amountPaid,
            status: TRANSACTION_STATUS.SUCCESS,
            type: TRANSACTION_TYPE.CREDIT,
            category: TRANSACTION_CATEGORY.MEMBERSHIP,
            transaction_id: transactionId,
          },
        ],
        { session: mongoSession },
      );
    }

    // 4. Send Notifications & Email
    if (user?._id) {
      await NotificationServices.createNotification({
        receiver: user._id,
        title: 'Subscription Payment Successful',
        message: `Your payment of $${amountPaid.toFixed(2)} for ${subscription.name} was successful. Active until ${formattedNextBillingDate}.`,
        refId: subscription._id,
        path: '/dashboard/subscriptions',
      });
    }

    await NotificationServices.sendNotificationToAdmins({
      title: 'Subscription Payment Received',
      message: `Recurring payment of $${amountPaid.toFixed(2)} received from ${user?.name || 'Customer'} for ${subscription.name}.`,
      refId: subscription._id,
      path: `/membership/${subscription.plan?._id?.toString() || ''}/subscribers`,
    });

    if (user?.email) {
      try {
        const userEmailData = emailTemplate.subscriptionPaymentSuccess({
          email: user.email,
          name: user.name || 'Member',
          membershipName: subscription.name,
          amountPaid,
          transactionId,
          nextBillingDate: formattedNextBillingDate,
        });
        await emailHelper.sendEmail(userEmailData);
      } catch (emailErr) {
        console.error(
          'Failed to send subscription payment success email:',
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
    console.error('[Invoice Payment Succeeded Error]:', error);
  }
};

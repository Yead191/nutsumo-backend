import mongoose from 'mongoose';
import Stripe from 'stripe';
import stripe from '../config/stripe';
import config from '../config';
import { USER_ROLES } from '../enums/user';
import { Membership } from '../app/modules/membership/membership.model';
import { Subscription } from '../app/modules/subscription/subscription.model';
import { User } from '../app/modules/user/user.model';
import { Transaction } from '../app/modules/transaction/transaction.model';
import {
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '../enums/transaction';
import { NotificationServices } from '../app/modules/notification/notification.service';
import { emailHelper } from '../helpers/emailHelper';
import { emailTemplate } from '../shared/emailTemplate';

export const handleMembershipCheckout = async (
  checkoutSession: Stripe.Checkout.Session | Stripe.Subscription | any,
) => {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const mongoSession = await mongoose.startSession();

    try {
      mongoSession.startTransaction();

    const metadata = checkoutSession?.metadata || {};
    // console.log(metadata);
    const membershipId = metadata?.membershipId;
    const userId = metadata?.userId;
    const autoRenew = metadata?.autoRenew != 'false';

    if (!metadata?.userId) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      return;
    }
    // prevent duplicate transaction Id
    const stripeSubscriptionId =
      typeof checkoutSession.subscription === 'string'
        ? checkoutSession.subscription
        : (checkoutSession as any).subscription?.id || checkoutSession.id;

    // Check for existing transaction using session ID or subscription ID
    const existingTransaction = await Transaction.findOne({
      transaction_id: { $in: [checkoutSession.id, stripeSubscriptionId] },
    }).session(mongoSession);

    if (existingTransaction) {
      console.log(
        `[Membership Checkout] Transaction already processed for ID: ${checkoutSession.id} / ${stripeSubscriptionId}`,
      );
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      return;
    }

    // 1. Find User
    let user: any = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId).session(mongoSession);
    }
    if (!user) {
      console.error(
        '[Membership Checkout] User not found for email:',
        'userId:',
        userId,
      );
      throw new Error('User not found');
    }

    // 2. Find Membership
    let membership: any = null;
    if (membershipId && mongoose.Types.ObjectId.isValid(membershipId)) {
      membership =
        await Membership.findById(membershipId).session(mongoSession);
    }

    if (!membership) {
      // Fallback: List session line items to match priceId or productId
      const lineItems = await stripe.checkout.sessions.listLineItems(
        checkoutSession.id,
      );
      const priceId = lineItems.data[0]?.price?.id;
      const productId = lineItems.data[0]?.price?.product as string;

      if (priceId || productId) {
        membership = await Membership.findOne({
          $or: [{ priceId }, { productId }],
        }).session(mongoSession);
      }
    }

    if (!membership) {
      console.error(
        '[Membership Checkout] Membership plan not found for session:',
        checkoutSession.id,
      );
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      return;
    }

    // 3. Deactivate any existing active subscriptions for this user
    await Subscription.updateMany(
      { user: user._id, status: 'active' },
      { status: 'inactive' },
    ).session(mongoSession);

    // 4. Retrieve Stripe subscription to accurately check trial status
    let stripeSubscription: Stripe.Subscription | null = null;
    if (checkoutSession && checkoutSession.object === 'subscription') {
      stripeSubscription = checkoutSession as Stripe.Subscription;
    } else if (
      stripeSubscriptionId &&
      typeof stripeSubscriptionId === 'string' &&
      stripeSubscriptionId.startsWith('sub_')
    ) {
      try {
        stripeSubscription =
          await stripe.subscriptions.retrieve(stripeSubscriptionId);
      } catch (err) {
        console.error(
          '[Membership Checkout] Error retrieving Stripe subscription:',
          err,
        );
      }
    }

    // If autoRenew is false, update Stripe subscription to cancel at period end
    if (
      !autoRenew &&
      stripeSubscriptionId &&
      stripeSubscriptionId.startsWith('sub_')
    ) {
      try {
        await stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      } catch (err) {
        console.error(
          '[Membership Checkout] Error setting cancel_at_period_end on Stripe:',
          err,
        );
      }
    }

    // Accurately determine if this specific purchase received a trial from Stripe
    const isTrial = stripeSubscription
      ? stripeSubscription.status === 'trialing' ||
        Boolean(
          stripeSubscription.trial_end &&
          stripeSubscription.trial_end * 1000 > Date.now(),
        )
      : Boolean(
          membership?.has_trial && (membership?.trial_period_days || 0) > 0,
        );

    const trialDays = isTrial ? membership?.trial_period_days || 0 : 0;
    const startDate = new Date();

    const trialEndDate = stripeSubscription?.trial_end
      ? new Date(stripeSubscription.trial_end * 1000)
      : isTrial && trialDays > 0
        ? new Date(startDate.getTime() + trialDays * 24 * 60 * 60 * 1000)
        : undefined;

    const formattedTrialEndDate = trialEndDate
      ? trialEndDate.toISOString().split('T')[0]
      : undefined;

    // Calculate subscription end date (ends at trial end date if trial, or 1 interval if paid)
    let endDate: Date;
    if (isTrial && trialEndDate) {
      endDate = new Date(trialEndDate);
    } else {
      endDate = new Date(startDate);
      const intervalCount = membership.interval || 1;
      if (membership.recurring === 'year') {
        endDate.setFullYear(endDate.getFullYear() + intervalCount);
      } else if (membership.recurring === 'week') {
        endDate.setDate(endDate.getDate() + 7 * intervalCount);
      } else {
        endDate.setMonth(endDate.getMonth() + intervalCount);
      }
    }

    // 5. Store information in Subscription model
    const [subscription] = await Subscription.create(
      [
        {
          user: user._id,
          plan: membership._id,
          name: membership.name,
          recuring: membership.recurring || 'month',
          status: autoRenew ? 'active' : 'cancel-pending',
          start_date: startDate,
          end_date: endDate,
          price: membership.price,
          features: membership.features || [],
          payment_intent_id: stripeSubscriptionId,
          trxId: stripeSubscriptionId,
          is_trial: isTrial,
          trial_period_days: trialDays,
          trial_end_date: trialEndDate,
          auto_renew: autoRenew,
        },
      ],
      { session: mongoSession },
    );

    // Update User model with the new Subscription ID
    await User.findByIdAndUpdate(
      user._id,
      { subscription: subscription._id },
      { session: mongoSession },
    );

    // 6. Create Transaction record
    await Transaction.create(
      [
        {
          user: user._id,
          total_price: membership.price,
          payment_received: isTrial ? 0 : membership.price,
          status: TRANSACTION_STATUS.SUCCESS,
          type: TRANSACTION_TYPE.CREDIT,
          category: TRANSACTION_CATEGORY.MEMBERSHIP,
          transaction_id: stripeSubscriptionId,
        },
      ],
      { session: mongoSession },
    );

    // 7. Send Notifications & Email
    const userMessage = isTrial
      ? `Your ${membership.name} membership is active with a ${trialDays}-day free trial! Trial ends on ${formattedTrialEndDate || ''}.`
      : `Your ${membership.name} membership plan is now active!`;

    await NotificationServices.createNotification({
      receiver: user._id,
      title: 'Membership Activated',
      message: userMessage,
      refId: subscription._id,
      path: '/dashboard/subscriptions',
    });

    const adminMessage = isTrial
      ? `${user.name} subscribed to ${membership.name} (${trialDays}-day free trial).`
      : `${user.name} subscribed to ${membership.name} ($${membership.price}/${membership.recurring}).`;

    await NotificationServices.sendNotificationToAdmins({
      title: 'New Membership Subscription',
      message: adminMessage,
      refId: subscription._id,
      path: `/membership/${membership?._id?.toString()}/subscribers`,
    });

    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];
    const planFeatures = membership.features || [];

    if (user.email) {
      try {
        const userEmailData =
          emailTemplate.membershipSubscriptionUserConfirmation({
            email: user.email,
            name: user.name || 'Member',
            membershipName: membership.name,
            price: Number(membership.price),
            recurring: membership.recurring || 'month',
            isTrial,
            trialPeriodDays: trialDays,
            trialEndDate: formattedTrialEndDate,
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            features: planFeatures,
            autoRenew,
            transactionId: stripeSubscriptionId,
          });
        await emailHelper.sendEmail(userEmailData);
      } catch (emailErr) {
        console.error(
          'Failed to send user membership confirmation email:',
          emailErr,
        );
      }
    }

    try {
      const admins = await User.find({
        $or: [{ role: USER_ROLES.ADMIN }, { role: USER_ROLES.SUPER_ADMIN }],
      });

      const adminEmails = Array.from(
        new Set(
          [...admins.map(a => a.email), config.super_admin.email].filter(
            Boolean,
          ),
        ),
      );

      for (const adminEmail of adminEmails) {
        const adminEmailData = emailTemplate.adminMembershipNotification({
          adminEmail: adminEmail as string,
          adminName: 'Admin',
          customerName: user.name || 'Customer',
          customerEmail: user.email || 'N/A',
          membershipName: membership.name,
          price: Number(membership.price),
          recurring: membership.recurring || 'month',
          isTrial,
          trialPeriodDays: trialDays,
          trialEndDate: formattedTrialEndDate,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          features: planFeatures,
          autoRenew,
          transactionId: stripeSubscriptionId,
        });
        await emailHelper.sendEmail(adminEmailData);
      }
    } catch (adminEmailErr) {
      console.error(
        'Failed to send admin membership notification email:',
        adminEmailErr,
      );
    }

    await mongoSession.commitTransaction();
    mongoSession.endSession();
    return;
  } catch (error: any) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }
    mongoSession.endSession();

    const isWriteConflict =
      error?.code === 112 ||
      error?.codeName === 'WriteConflict' ||
      error?.errorLabels?.has?.('TransientTransactionError') ||
      error?.errorLabels?.includes?.('TransientTransactionError');

    if (isWriteConflict && attempt < maxRetries) {
      console.warn(
        `[Membership Checkout] Write conflict encountered (attempt ${attempt}/${maxRetries}), retrying...`,
      );
      await new Promise(resolve => setTimeout(resolve, 250 * attempt));
      continue;
    }

    console.error('[Membership Checkout Error]:', error);
    break;
  }
}
};

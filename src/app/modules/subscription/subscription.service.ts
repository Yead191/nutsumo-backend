import { JwtPayload } from 'jsonwebtoken';
import { Membership } from '../membership/membership.model';
import ApiError from '../../../errors/ApiError';
import stripe from '../../../config/stripe';
import config from '../../../config';
import { Subscription } from './subscription.model';
import QueryBuilder from '../../builder/QueryBuilder';
import { StatusCodes } from 'http-status-codes';
import { User } from '../user/user.model';
import { NotificationServices } from '../notification/notification.service';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';

const subscribePackage = async (
  user: JwtPayload,
  packageId: string,
  autoRenew: boolean = true,
) => {
  const membership = await Membership.findOne({ _id: packageId });
  const userSubscription = await Subscription.findOne({
    user: user.id,
    status: 'active',
  }).select('plan');

  // validations
  if (!membership) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Membership not found');
  }

  if (membership.type !== user.role.toLowerCase()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `You are ${user.role}, can't subscribe ${membership.type} membership.`,
    );
  }
  if (
    userSubscription &&
    userSubscription.plan.toString() === membership._id.toString()
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `You are already subscribed to ${membership.name}.`,
    );
  }

  const hasTakenTrial = await Subscription.exists({
    user: user.id,
    $or: [{ is_trial: true }, { trial_period_days: { $gt: 0 } }],
  });

  // check auto renew
  const isAutoRenew = autoRenew && (membership.is_auto_renew ?? true);

  const shouldGiveTrial =
    !hasTakenTrial &&
    membership.has_trial &&
    membership.trial_period_days &&
    membership.trial_period_days > 0;

  const subscriptionCheckoutSession = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: membership.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${config.frontend_url}/payment/success?type=membership`,
    cancel_url: `${config.frontend_url}/payment/failed?type=membership`,
    customer_email: user.email,
    metadata: {
      userId: user.id,
      membershipId: packageId,
      autoRenew: String(isAutoRenew),
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        membershipId: packageId,
      },

      ...(shouldGiveTrial
        ? { trial_period_days: membership.trial_period_days }
        : {}),
    },
  });

  if (!subscriptionCheckoutSession.url) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to create subscription checkout session',
    );
  }

  return subscriptionCheckoutSession.url;
};

const getMySubcription = async (user: JwtPayload) => {
  const result = await Subscription.find({ user: user.id })
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
  if (!result.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'No subscription found!');
  }
  return result;
};

const getSubsribersByPackage = async (
  id: string,
  query: Record<string, any>,
) => {
  const qb = new QueryBuilder(
    Subscription.find({ plan: id })
      .populate('user', 'name email image')
      .populate('plan', 'name'),
    query,
  )
    .search([])
    .filter()
    .paginate()
    .sort()
    .fields();

  const [data, pagination] = await Promise.all([
    qb.modelQuery,
    qb.getPaginationInfo(),
  ]);
  return { data, pagination };
};

const cancelSubscription = async (
  user: JwtPayload,
  subscriptionId: string,
  cancelType: 'end_of_period' | 'immediate',
) => {
  const subscription = await Subscription.findOne({
    user: user.id,
    _id: subscriptionId,
    status: 'active',
  });
  if (!subscription) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Active subscription not found for this user',
    );
  }

  const stripeSubscriptionId =
    subscription.trxId || subscription.payment_intent_id;

  if (!stripeSubscriptionId) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'No valid Stripe subscription ID found!',
    );
  }
  if (cancelType === 'immediate') {
    await stripe.subscriptions.cancel(stripeSubscriptionId);
  } else {
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }
  subscription.status =
    cancelType === 'immediate' ? 'cancel' : 'cancel-pending';
  await subscription.save();

  const userProfile = await User.findById(user.id);
  const formattedEndDate = subscription.end_date
    ? subscription.end_date.toISOString().split('T')[0]
    : undefined;

  // Send In-App Notification
  await NotificationServices.createNotification({
    receiver: user.id,
    title: 'Subscription Canceled',
    message:
      cancelType === 'immediate'
        ? `Your subscription for ${subscription.name} was canceled immediately.`
        : `Auto-renew turned off for your ${subscription.name} subscription. Active until ${formattedEndDate}.`,
    refId: subscription._id,
    path: '/dashboard/subscriptions',
  });

  // Send Email Confirmation
  if (userProfile?.email) {
    try {
      const emailData = emailTemplate.subscriptionCancelled({
        email: userProfile.email,
        name: userProfile.name || 'Member',
        membershipName: subscription.name,
        cancelType,
        endDate: formattedEndDate,
      });
      await emailHelper.sendEmail(emailData);
    } catch (emailErr) {
      console.error(
        'Failed to send subscription cancellation email:',
        emailErr,
      );
    }
  }

  return subscription;
};

const checkTrialEligibility = async (user: JwtPayload) => {
  const hasTakenTrial = await Subscription.exists({
    user: user.id,
    $or: [{ is_trial: true }, { trial_period_days: { $gt: 0 } }],
  });

  return {
    isEligible: !hasTakenTrial,
    hasTakenTrial: Boolean(hasTakenTrial),
  };
};

export const SubscriptionServices = {
  subscribePackage,
  getMySubcription,
  getSubsribersByPackage,
  cancelSubscription,
  checkTrialEligibility,
};

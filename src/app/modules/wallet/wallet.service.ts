import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { logger } from '../../../shared/logger';
import stripe from '../../../config/stripe';
import config from '../../../config';
import { User } from '../user/user.model';
import { Booking } from '../booking/booking.model';
import {
  BOOKING_PAYMENT_STATUSES,
  BOOKING_PAYOUT_STATUSES,
  BOOKING_STATUSES,
} from '../booking/booking.constants';
import { NotificationServices } from '../notification/notification.service';
import { ArtisanWallet, WalletLedger, Withdrawal } from './wallet.model';
import { Quotation } from '../quotation/quotation.model';
import { ArtisanProfile } from '../artisanProfile/artisanProfile.model';
import { ArtisanService } from '../artisanService/artisanService.model';
import { Portfolio } from '../portfolio/portfolio.model';
import { Notification } from '../notification/notification.model';
import { IPayoutDestination } from './wallet.interface';

export const MIN_WITHDRAWAL = 10;

const roundMoney = (value: number) => Number(Number(value || 0).toFixed(2));

const isDuplicateKey = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: number }).code === 11000;

const ensureWallet = async (artisanId: string) => {
  return ArtisanWallet.findOneAndUpdate(
    { user: artisanId },
    { $setOnInsert: { user: artisanId, currency: 'GHS' } },
    { upsert: true, new: true },
  );
};

const sumPayout = (
  rows: Array<{ artisanPayoutAmount?: number; payoutStatus?: string }>,
  statuses?: string[],
) =>
  roundMoney(
    rows
      .filter((row) => !statuses || statuses.includes(row.payoutStatus || ''))
      .reduce((total, row) => total + Number(row.artisanPayoutAmount || 0), 0),
  );

const getMine = async (artisanId: string) => {
  const [wallet, escrowRows, completedJobs, ledger, withdrawals, artisanUser] =
    await Promise.all([
      ensureWallet(artisanId),
      Booking.find({
        artisan: artisanId,
        paymentStatus: BOOKING_PAYMENT_STATUSES.ESCROW_HELD,
        payoutStatus: { $ne: BOOKING_PAYOUT_STATUSES.RELEASED },
        status: { $ne: BOOKING_STATUSES.CANCELLED },
      }).select('artisanPayoutAmount payoutStatus'),
      Booking.countDocuments({
        artisan: artisanId,
        status: BOOKING_STATUSES.COMPLETED,
      }),
      WalletLedger.find({ artisan: artisanId }).sort({ createdAt: -1 }).limit(12),
      Withdrawal.find({ artisan: artisanId }).sort({ createdAt: -1 }).limit(8),
      User.findById(artisanId).select('stripeAccountInfo'),
    ]);

  return {
    available: roundMoney(wallet.available),
    inEscrow: sumPayout(escrowRows),
    awaitingRelease: sumPayout(escrowRows, [BOOKING_PAYOUT_STATUSES.APPROVED]),
    lifetimeCredited: roundMoney(wallet.lifetimeCredited),
    lifetimeWithdrawn: roundMoney(wallet.lifetimeWithdrawn),
    currency: wallet.currency || 'GHS',
    minimumWithdrawal: MIN_WITHDRAWAL,
    completedJobs,
    stripeConnected: isStripeConnected(artisanUser?.stripeAccountInfo),
    ledger,
    withdrawals,
  };
};

const isStripeConnected = (info?: {
  accountId?: string | null;
  loginUrl?: string | null;
  details_submitted?: boolean;
  payouts_enabled?: boolean;
}) =>
  Boolean(
    info?.accountId &&
      (info.details_submitted || info.payouts_enabled || info.loginUrl),
  );

const saveDestination = async (
  artisanId: string,
  payload: IPayoutDestination,
) => {
  const destination: IPayoutDestination =
    payload.method === 'BANK'
      ? {
          method: 'BANK',
          accountName: payload.accountName.trim(),
          bankName: payload.bankName?.trim(),
          accountNumber: payload.accountNumber?.trim(),
        }
      : {
          method: 'MOMO',
          accountName: payload.accountName.trim(),
          momoNetwork: payload.momoNetwork,
          momoNumber: payload.momoNumber?.replace(/\s/g, ''),
        };

  const wallet = await ArtisanWallet.findOneAndUpdate(
    { user: artisanId },
    { $set: { destination }, $setOnInsert: { user: artisanId, currency: 'GHS' } },
    { upsert: true, new: true },
  );

  return wallet.destination;
};

const creditReleasedPayout = async (booking: {
  _id: Types.ObjectId;
  artisan: Types.ObjectId;
  artisanPayoutAmount: number;
  bookingNumber: string;
}) => {
  const amount = roundMoney(booking.artisanPayoutAmount);
  const idempotencyKey = `release:${booking._id.toString()}`;
  const existing = await WalletLedger.findOne({ idempotencyKey });
  if (existing || amount <= 0) {
    return { alreadyCredited: Boolean(existing) || amount <= 0, amount };
  }

  const wallet = await ArtisanWallet.findOneAndUpdate(
    { user: booking.artisan },
    {
      $inc: { available: amount, lifetimeCredited: amount },
      $setOnInsert: { user: booking.artisan, currency: 'GHS' },
    },
    { upsert: true, new: true },
  );

  try {
    await WalletLedger.create({
      artisan: booking.artisan,
      entryType: 'CREDIT_RELEASE',
      amount,
      balanceAfter: roundMoney(wallet.available),
      booking: booking._id,
      idempotencyKey,
      note: `Released from booking ${booking.bookingNumber}`,
    });
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    await ArtisanWallet.updateOne(
      { user: booking.artisan },
      { $inc: { available: -amount, lifetimeCredited: -amount } },
    );
    return { alreadyCredited: true, amount };
  }

  return { alreadyCredited: false, amount };
};

const restoreWithdrawal = async (
  artisanId: Types.ObjectId | string,
  withdrawalId: string,
  amount: number,
  note: string,
) => {
  const wallet = await ArtisanWallet.findOneAndUpdate(
    { user: artisanId },
    { $inc: { available: amount } },
    { new: true },
  );
  const idempotencyKey = `reversal:${withdrawalId}`;
  const existing = await WalletLedger.findOne({ idempotencyKey });
  if (existing) return;

  await WalletLedger.create({
    artisan: artisanId,
    entryType: 'CREDIT_REVERSAL',
    amount,
    balanceAfter: roundMoney(wallet?.available || amount),
    withdrawal: withdrawalId,
    idempotencyKey,
    note,
  });
};

const withdraw = async (artisanId: string, rawAmount: number) => {
  const amount = roundMoney(rawAmount);
  if (amount < MIN_WITHDRAWAL) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Minimum withdrawal is GH₵ ${MIN_WITHDRAWAL.toFixed(2)}.`,
    );
  }

  await ensureWallet(artisanId);
  const artisanUser = await User.findById(artisanId).select(
    'name stripeAccountInfo',
  );
  const accountId = artisanUser?.stripeAccountInfo?.accountId;
  if (!accountId || !isStripeConnected(artisanUser?.stripeAccountInfo)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Connect Stripe from your profile before withdrawing.',
    );
  }

  const debited = await ArtisanWallet.findOneAndUpdate(
    { user: artisanId, available: { $gte: amount } },
    { $inc: { available: -amount } },
    { new: true },
  );
  if (!debited) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'That amount is higher than your available balance.',
    );
  }

  const withdrawal = await Withdrawal.create({
    artisan: artisanId,
    amount,
    status: 'PROCESSING',
    method: 'STRIPE',
  });

  await WalletLedger.create({
    artisan: artisanId,
    entryType: 'DEBIT_WITHDRAW',
    amount,
    balanceAfter: roundMoney(debited.available),
    withdrawal: withdrawal._id,
    idempotencyKey: `withdraw:${withdrawal._id.toString()}`,
    note: 'Withdrawal to Stripe',
  });

  try {
    const transfer = await stripe.transfers.create(
      {
        amount: Math.round(amount * 100),
        currency: 'usd',
        destination: accountId,
        description: `Nutsumo withdrawal ${withdrawal._id.toString()}`,
        metadata: {
          withdrawalId: withdrawal._id.toString(),
          artisanId,
        },
      },
      { idempotencyKey: withdrawal._id.toString() },
    );
    withdrawal.status = 'PAID';
    withdrawal.transferId = transfer.id;
    withdrawal.settledAt = new Date();
    await withdrawal.save();
    await ArtisanWallet.updateOne(
      { user: artisanId },
      { $inc: { lifetimeWithdrawn: amount } },
    );
  } catch (error: any) {
    logger.warn(`[Wallet] Stripe transfer failed: ${error?.message}`);
    withdrawal.status = 'FAILED';
    withdrawal.failureReason = error?.message || 'Stripe transfer failed';
    withdrawal.settledAt = new Date();
    await withdrawal.save();
    await restoreWithdrawal(
      artisanId,
      withdrawal._id.toString(),
      amount,
      'Stripe transfer failed. Balance restored.',
    );
    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      error?.message ||
        'Stripe could not send this withdrawal. Your balance was restored.',
    );
  }

  await NotificationServices.createNotification({
    receiver: new Types.ObjectId(artisanId),
    title: 'Withdrawal sent',
    message: `GH₵ ${amount.toFixed(2)} was sent to your connected Stripe account.`,
    refId: withdrawal._id,
    path: '/pro',
    seen: false,
  });

  return withdrawal;
};

const listWithdrawalsAdmin = async (query: {
  status?: string;
  page?: string;
  limit?: string;
}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
  const filter = query.status ? { status: query.status } : {};
  const [rows, total] = await Promise.all([
    Withdrawal.find(filter)
      .populate('artisan', 'name email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Withdrawal.countDocuments(filter),
  ]);

  return {
    withdrawals: rows,
    pagination: {
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit) || 1,
    },
  };
};

const settleWithdrawal = async (
  withdrawalId: string,
  adminId: string,
  payload: { decision: 'PAID' | 'FAILED'; reference?: string; reason?: string },
) => {
  const withdrawal = await Withdrawal.findById(withdrawalId);
  if (!withdrawal) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Withdrawal not found');
  }
  if (withdrawal.status !== 'REQUESTED') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `This withdrawal is already ${withdrawal.status}.`,
    );
  }
  if (withdrawal.method === 'STRIPE') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Stripe withdrawals are settled by the payout provider.',
    );
  }

  withdrawal.settledBy = new Types.ObjectId(adminId);
  withdrawal.settledAt = new Date();

  if (payload.decision === 'PAID') {
    withdrawal.status = 'PAID';
    withdrawal.reference = payload.reference?.trim();
    await withdrawal.save();
    await ArtisanWallet.updateOne(
      { user: withdrawal.artisan },
      { $inc: { lifetimeWithdrawn: withdrawal.amount } },
    );
    await NotificationServices.createNotification({
      receiver: withdrawal.artisan,
      title: 'Withdrawal paid',
      message: `GH₵ ${Number(withdrawal.amount).toFixed(2)} was paid to your ${withdrawal.method === 'MOMO' ? 'mobile money' : 'bank'} account${withdrawal.reference ? ` (${withdrawal.reference})` : ''}.`,
      refId: withdrawal._id,
      path: '/pro',
      seen: false,
    });
    return withdrawal;
  }

  withdrawal.status = 'FAILED';
  withdrawal.failureReason = payload.reason?.trim() || 'Payout could not be completed';
  await withdrawal.save();
  await restoreWithdrawal(
    withdrawal.artisan,
    withdrawal._id.toString(),
    withdrawal.amount,
    withdrawal.failureReason,
  );
  await NotificationServices.createNotification({
    receiver: withdrawal.artisan,
    title: 'Withdrawal returned',
    message: `GH₵ ${Number(withdrawal.amount).toFixed(2)} is back in your Nutsumo balance. ${withdrawal.failureReason}`,
    refId: withdrawal._id,
    path: '/pro',
    seen: false,
  });
  return withdrawal;
};

const persistStripeAccount = async (
  userId: string,
  account: {
    id: string;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
    details_submitted?: boolean;
  },
) => {
  const update: Record<string, unknown> = {
    'stripeAccountInfo.accountId': account.id,
    'stripeAccountInfo.charges_enabled': Boolean(account.charges_enabled),
    'stripeAccountInfo.payouts_enabled': Boolean(account.payouts_enabled),
    'stripeAccountInfo.details_submitted': Boolean(account.details_submitted),
  };

  if (account.details_submitted) {
    try {
      const loginLink = await stripe.accounts.createLoginLink(account.id);
      update['stripeAccountInfo.loginUrl'] = loginLink.url;
    } catch (error: any) {
      logger.warn(`[Stripe] Login link was not ready: ${error?.message}`);
    }
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: update },
    { new: true },
  ).select('stripeAccountInfo');

  return {
    stripeAccountInfo: user?.stripeAccountInfo,
    connected: isStripeConnected(user?.stripeAccountInfo),
  };
};

const ghanaPhone = (raw?: string) => {
  if (!raw) return undefined;
  const compact = raw.replace(/[\s()-]/g, '');
  if (/^\+\d{8,15}$/.test(compact)) return compact;
  const digits = compact.replace(/\D/g, '');
  if (digits.startsWith('233') && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+233${digits.slice(1)}`;
  return undefined;
};

const stripeProfileFromUser = (
  user: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    postCode?: string;
    trade?: string;
    artisanProfile?: unknown;
  },
  artisanId: string,
) => {
  const profile =
    user.artisanProfile &&
    typeof user.artisanProfile === 'object' &&
    'trade' in user.artisanProfile
      ? (user.artisanProfile as {
          businessName?: string;
          trade?: string;
          bio?: string;
          location?: string;
          postCode?: string;
        })
      : undefined;
  const nameParts = (user.name || '').trim().split(/\s+/).filter(Boolean);
  const phone = ghanaPhone(user.phone);
  const trade = profile?.trade || user.trade;
  const location = profile?.location || user.location;
  const postCode = profile?.postCode || user.postCode;
  const description = [trade, location, postCode ? `postcode ${postCode}` : '', profile?.bio]
    .filter(Boolean)
    .join('. ')
    .slice(0, 500);

  return {
    email: user.email,
    business_type: 'individual' as const,
    individual: {
      ...(nameParts[0] ? { first_name: nameParts[0] } : {}),
      ...(nameParts.length > 1 ? { last_name: nameParts.slice(1).join(' ') } : {}),
      ...(user.email ? { email: user.email } : {}),
      ...(phone ? { phone } : {}),
    },
    business_profile: {
      ...(profile?.businessName || user.name
        ? { name: profile?.businessName || user.name }
        : {}),
      ...(description ? { product_description: description, mcc: '1799' } : {}),
      ...(phone ? { support_phone: phone } : {}),
      url: `${config.frontend_url}/job-seeker/${artisanId}`,
    },
  };
};

const openStripeAccount = async (artisanId: string) => {
  const user = await User.findById(artisanId)
    .select('name email phone location postCode trade stripeAccountInfo')
    .populate('artisanProfile', 'businessName trade bio location postCode');
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Artisan not found');
  }

  const profileFields = stripeProfileFromUser(user, artisanId);
  let accountId = user.stripeAccountInfo?.accountId;
  if (!accountId) {
    const platform = await stripe.accounts.retrieve();
    const account = await stripe.accounts.create({
      type: 'express',
      country: platform.country || 'US',
      ...profileFields,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { userId: artisanId },
    });
    accountId = account.id;
    await User.findByIdAndUpdate(artisanId, {
      $set: {
        'stripeAccountInfo.accountId': accountId,
        'stripeAccountInfo.charges_enabled': false,
        'stripeAccountInfo.payouts_enabled': false,
        'stripeAccountInfo.details_submitted': false,
      },
    });
  } else {
    try {
      await stripe.accounts.update(accountId, profileFields);
    } catch (error: any) {
      logger.warn(`[Stripe] Could not prefill connected account: ${error?.message}`);
    }
  }

  const account = await stripe.accounts.retrieve(accountId);
  if (account.details_submitted) {
    const saved = await persistStripeAccount(artisanId, account);
    const loginUrl = saved.stripeAccountInfo?.loginUrl;
    if (!loginUrl) {
      throw new ApiError(StatusCodes.BAD_GATEWAY, 'Stripe did not return a login link');
    }
    return { url: loginUrl, connected: true };
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${config.frontend_url}/pro/wallet?stripe=refresh`,
    return_url: `${config.frontend_url}/pro/wallet?stripe=return`,
    type: 'account_onboarding',
    collection_options: {
      fields: 'currently_due',
      future_requirements: 'omit',
    },
  });

  return { url: accountLink.url, connected: false };
};

const syncStripeAccount = async (artisanId: string) => {
  const user = await User.findById(artisanId).select('stripeAccountInfo');
  if (!user?.stripeAccountInfo?.accountId) {
    return { stripeAccountInfo: user?.stripeAccountInfo || null, connected: false };
  }
  const account = await stripe.accounts.retrieve(user.stripeAccountInfo.accountId);
  return persistStripeAccount(artisanId, account);
};

const monthLabel = (year: number, month: number) =>
  new Date(year, month - 1, 1).toLocaleString('en-GB', { month: 'short' });

const countBy = (rows: Array<{ _id: string; count: number }>) =>
  Object.fromEntries(rows.map((row) => [row._id, row.count]));

const getDashboard = async (artisanId: string) => {
  const artisanObjectId = new Types.ObjectId(artisanId);
  const start = new Date();
  start.setMonth(start.getMonth() - 11, 1);
  start.setHours(0, 0, 0, 0);

  const [wallet, bookingGroups, quoteGroups, monthlyRows, profile, recentBookings, liveServices, servicesInReview, portfolioItems, unreadNotifications] =
    await Promise.all([
      ensureWallet(artisanId),
      Booking.aggregate([
        { $match: { artisan: artisanObjectId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            payout: { $sum: '$artisanPayoutAmount' },
          },
        },
      ]),
      Quotation.aggregate([
        { $match: { artisan: artisanObjectId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        {
          $match: {
            artisan: artisanObjectId,
            payoutStatus: BOOKING_PAYOUT_STATUSES.RELEASED,
            payoutReleasedAt: { $gte: start },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$payoutReleasedAt' },
              month: { $month: '$payoutReleasedAt' },
            },
            earned: { $sum: '$artisanPayoutAmount' },
            jobs: { $sum: 1 },
          },
        },
      ]),
      ArtisanProfile.findOne({ user: artisanId }).select(
        'rating reviewsCount acceptRate responseTimeMinutes responseSamples completedJobs',
      ),
      Booking.find({ artisan: artisanId })
        .sort({ updatedAt: -1 })
        .limit(6)
        .populate('job', 'title')
        .select('bookingNumber status payoutStatus artisanPayoutAmount totalAmount updatedAt'),
      ArtisanService.countDocuments({
        artisan: artisanObjectId,
        isActive: true,
        reviewStatus: { $ne: 'REJECTED' },
      }),
      ArtisanService.countDocuments({
        artisan: artisanObjectId,
        isActive: true,
        reviewStatus: 'PENDING_REVIEW',
      }),
      Portfolio.countDocuments({ artisan: artisanObjectId, isPublished: true }),
      Notification.countDocuments({ receiver: artisanObjectId, seen: false }),
    ]);

  const escrowRows = await Booking.find({
    artisan: artisanId,
    paymentStatus: BOOKING_PAYMENT_STATUSES.ESCROW_HELD,
    payoutStatus: { $ne: BOOKING_PAYOUT_STATUSES.RELEASED },
    status: { $ne: BOOKING_STATUSES.CANCELLED },
  }).select('artisanPayoutAmount payoutStatus');

  const bookings = countBy(bookingGroups);
  const quotes = countBy(quoteGroups);
  const earnedByMonth = new Map(
    monthlyRows.map((row) => [
      `${row._id.year}-${row._id.month}`,
      { earned: roundMoney(row.earned), jobs: row.jobs },
    ]),
  );
  const monthly = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    const point = earnedByMonth.get(key);
    return {
      label: monthLabel(date.getFullYear(), date.getMonth() + 1),
      earned: point?.earned || 0,
      jobs: point?.jobs || 0,
    };
  });

  const active =
    (bookings.CONFIRMED || 0) +
    (bookings.IN_PROGRESS || 0) +
    (bookings.REVISION_REQUESTED || 0);
  const quotesSent = Object.values(quotes).reduce((sum, count) => sum + count, 0);

  return {
    balance: {
      available: roundMoney(wallet.available),
      inEscrow: sumPayout(escrowRows),
      awaitingRelease: sumPayout(escrowRows, [BOOKING_PAYOUT_STATUSES.APPROVED]),
      lifetimeCredited: roundMoney(wallet.lifetimeCredited),
      lifetimeWithdrawn: roundMoney(wallet.lifetimeWithdrawn),
    },
    work: {
      pendingQuotes: quotes.PENDING || 0,
      acceptedQuotes: quotes.ACCEPTED || 0,
      quotesRejected: quotes.REJECTED || 0,
      quotesWithdrawn: quotes.WITHDRAWN || 0,
      quotesSent,
      awaitingPayment: bookings.AWAITING_PAYMENT || 0,
      activeBookings: active,
      delivered: bookings.DELIVERED || 0,
      completed: bookings.COMPLETED || 0,
      disputed: bookings.DISPUTED || 0,
    },
    presence: {
      liveServices,
      servicesInReview,
      portfolioItems,
      unreadNotifications,
    },
    reputation: {
      rating: profile?.rating || 0,
      reviewsCount: profile?.reviewsCount || 0,
      acceptRate: profile?.acceptRate || 0,
      responseTimeMinutes: profile?.responseTimeMinutes || 0,
      responseSamples: profile?.responseSamples || 0,
      completedJobs: profile?.completedJobs || bookings.COMPLETED || 0,
    },
    monthly,
    recentBookings,
  };
};

export const WalletServices = {
  getMine,
  saveDestination,
  creditReleasedPayout,
  withdraw,
  listWithdrawalsAdmin,
  settleWithdrawal,
  openStripeAccount,
  syncStripeAccount,
  persistStripeAccount,
  getDashboard,
};

import mongoose, { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Booking } from './booking.model';
import {
  BOOKING_STATUSES,
  BOOKING_PAYMENT_STATUSES,
  BOOKING_PAYOUT_STATUSES,
  BOOKING_SEARCHABLE_FIELDS,
} from './booking.constants';
import { USER_ROLES } from '../../../enums/user';
import QueryBuilder from '../../builder/QueryBuilder';
import { Job } from '../job/job.model';
import { JOB_STATUSES } from '../job/job.constants';
import { User } from '../user/user.model';
import { ArtisanProfile } from '../artisanProfile/artisanProfile.model';
import { Transaction } from '../transaction/transaction.model';
import {
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '../../../enums/transaction';
import { NotificationServices } from '../notification/notification.service';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import { kafkaProducer } from '../../../tools/kafka/kafka-producers/kafka.producer';
import { logger } from '../../../shared/logger';
import stripe from '../../../config/stripe';
import config from '../../../config';
import { handleBookingPayment } from '../../../handlers/handleBookingPayment';

/**
 * 1. CREATE STRIPE CHECKOUT SESSION (CUSTOMER)
 */
const createBookingCheckoutSession = async (
  bookingId: string,
  customerId: string,
) => {
  const booking = await Booking.findById(bookingId).populate([
    { path: 'customer', select: 'name email phone' },
    { path: 'artisan', select: 'name email phone' },
    { path: 'job', select: 'title location budget' },
  ]);

  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  if (booking.customer?._id?.toString() !== customerId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to pay for this booking',
    );
  }

  if (
    booking.paymentStatus === BOOKING_PAYMENT_STATUSES.ESCROW_HELD ||
    booking.paymentStatus === BOOKING_PAYMENT_STATUSES.PAID
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This booking is already paid and held in escrow',
    );
  }

  const customerUser = booking.customer as any;
  const artisanUser = booking.artisan as any;
  const jobDoc = booking.job as any;

  const line_items = [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Booking #${booking.bookingNumber} - ${jobDoc?.title || 'Service'}`,
          description: `Escrow payment for ${artisanUser?.name || 'Artisan'}'s service on "${jobDoc?.title || 'Service'}"`,
        },
        unit_amount: Math.round(booking.totalAmount * 100),
      },
      quantity: 1,
    },
  ];

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items,
    mode: 'payment',
    success_url: `${config.frontend_url}/payment/success?bookingId=${booking._id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.frontend_url}/payment/cancel?bookingId=${booking._id}`,
    customer_email: customerUser?.email,
    metadata: {
      type: 'BOOKING_ESCROW_PAYMENT',
      bookingId: booking._id.toString(),
      jobId: booking.job?._id
        ? booking.job._id.toString()
        : String(booking.job),
      customerId: customerId.toString(),
      artisanId: booking.artisan?._id
        ? booking.artisan._id.toString()
        : String(booking.artisan),
      bookingNumber: booking.bookingNumber,
    },
  });

  if (!session.url) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to create Stripe checkout session',
    );
  }

  booking.stripeSessionId = session.id;
  await booking.save();

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
};

/**
 * 2. VERIFY BOOKING PAYMENT (FALLBACK VERIFICATION)
 */
const verifyBookingPayment = async (sessionId: string, userId: string) => {
  if (!sessionId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Session ID is required');
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Stripe session not found');
  }

  const bookingId = session.metadata?.bookingId;
  if (!bookingId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid session metadata for booking',
    );
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  // If session is paid, process via handleBookingPayment if not yet processed
  if (
    session.payment_status === 'paid' &&
    booking.paymentStatus === BOOKING_PAYMENT_STATUSES.UNPAID
  ) {
    await handleBookingPayment(session);
  }

  return Booking.findById(bookingId).populate([
    { path: 'customer', select: 'name email phone' },
    { path: 'artisan', select: 'name email phone' },
    { path: 'job', select: 'title location budget status' },
  ]);
};

/**
 * 3. START WORK (ARTISAN)
 */
const startWork = async (bookingId: string, artisanId: string) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  if (booking.artisan.toString() !== artisanId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only the assigned artisan can start work on this booking',
    );
  }

  if (booking.paymentStatus !== BOOKING_PAYMENT_STATUSES.ESCROW_HELD) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot start work. Escrow payment status is ${booking.paymentStatus}. Customer must fund escrow first.`,
    );
  }

  if (booking.status !== BOOKING_STATUSES.CONFIRMED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot start work. Current booking status is ${booking.status}.`,
    );
  }

  booking.status = BOOKING_STATUSES.IN_PROGRESS;
  booking.startDate = new Date();
  await booking.save();

  // Notify Customer
  await NotificationServices.createNotification({
    receiver: booking.customer,
    title: 'Work Started 🔨',
    message: `Artisan has started work on Booking #${booking.bookingNumber}.`,
    refId: booking._id,
    path: `/account/bookings/${booking._id}`,
    seen: false,
  });

  return booking;
};

/**
 * 4. DELIVER WORK (ARTISAN)
 */
const deliverBooking = async (
  bookingId: string,
  artisanId: string,
  payload: { deliveryNotes: string; workImages?: string[] },
) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  if (booking.artisan.toString() !== artisanId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only the assigned artisan can deliver work for this booking',
    );
  }

  if (
    booking.paymentStatus !== BOOKING_PAYMENT_STATUSES.ESCROW_HELD &&
    booking.paymentStatus !== BOOKING_PAYMENT_STATUSES.PAID
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot deliver an unpaid booking. Customer payment is required.',
    );
  }

  if (
    booking.status !== BOOKING_STATUSES.CONFIRMED &&
    booking.status !== BOOKING_STATUSES.IN_PROGRESS
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot deliver booking with current status: ${booking.status}`,
    );
  }

  booking.status = BOOKING_STATUSES.DELIVERED;
  booking.deliveredAt = new Date();
  booking.deliveryNotes = payload.deliveryNotes;
  booking.deliveryProof = payload.workImages || [];
  await booking.save();

  // Populate details for Notifications & Email
  const [customer, artisan, job] = await Promise.all([
    User.findById(booking.customer).select('name email phone'),
    User.findById(booking.artisan).select('name email phone'),
    Job.findById(booking.job).select('title'),
  ]);

  const jobTitle = job?.title || 'Job Service';

  // Publish Kafka event
  try {
    await kafkaProducer.sendMessage('notification', {
      type: 'BOOKING_DELIVERED',
      data: {
        bookingId: String(booking._id),
        bookingNumber: booking.bookingNumber,
        customerId: String(booking.customer),
        artisanId: String(booking.artisan),
        deliveredAt: booking.deliveredAt,
      },
    });
  } catch (err: any) {
    logger.warn(`[Kafka] Could not publish BOOKING_DELIVERED: ${err?.message}`);
  }

  // In-App Notification to Customer
  await NotificationServices.createNotification({
    receiver: booking.customer,
    title: 'Work Delivered for Review 📦',
    message: `${artisan?.name || 'Artisan'} has marked Booking #${booking.bookingNumber} as delivered. Please review and confirm completion.`,
    refId: booking._id,
    path: `/account/bookings/${booking._id}`,
    seen: false,
  });

  // Email to Customer
  if (customer && customer.email) {
    const emailData = emailTemplate.bookingDeliveredCustomerEmail({
      customerName: customer.name,
      customerEmail: customer.email,
      artisanName: artisan?.name || 'Artisan',
      jobTitle,
      bookingNumber: booking.bookingNumber,
      bookingId: String(booking._id),
      deliveryNotes: payload.deliveryNotes,
    });
    await emailHelper.sendEmail(emailData);
  }

  return booking;
};

/**
 * 5. CONFIRM COMPLETION (CUSTOMER)
 */
const confirmBookingCompletion = async (
  bookingId: string,
  customerId: string,
  payload: { rating?: number; feedback?: string },
) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  if (booking.customer.toString() !== customerId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only the job customer can confirm completion',
    );
  }

  if (booking.status !== BOOKING_STATUSES.DELIVERED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot confirm completion. Artisan has not delivered the work yet (Current status: ${booking.status}).`,
    );
  }

  const completionDate = new Date();
  booking.status = BOOKING_STATUSES.COMPLETED;
  booking.customerConfirmedAt = completionDate;
  booking.completionDate = completionDate;
  booking.payoutStatus = BOOKING_PAYOUT_STATUSES.PENDING;

  if (payload.rating) {
    booking.customerRating = payload.rating;
  }
  if (payload.feedback) {
    booking.customerFeedback = payload.feedback;
  }

  await booking.save();

  // Mark Job as COMPLETED
  await Job.findByIdAndUpdate(booking.job, {
    status: JOB_STATUSES.COMPLETED,
  });

  // If rating given, update ArtisanProfile stats
  if (payload.rating) {
    try {
      const profile = await ArtisanProfile.findOne({ user: booking.artisan });
      if (profile) {
        const currentReviews = profile.reviewsCount || 0;
        const currentRating = profile.rating || 0;
        const newReviewsCount = currentReviews + 1;
        const newRating = Number(
          (
            (currentRating * currentReviews + payload.rating) /
            newReviewsCount
          ).toFixed(1),
        );

        profile.rating = newRating;
        profile.reviewsCount = newReviewsCount;
        await profile.save();
      }
    } catch (err: any) {
      logger.warn(
        `[ArtisanProfile] Could not update rating stats: ${err?.message}`,
      );
    }
  }

  // Populate for notifications & emails
  const [customer, artisan, job] = await Promise.all([
    User.findById(booking.customer).select('name email phone'),
    User.findById(booking.artisan).select('name email phone'),
    Job.findById(booking.job).select('title'),
  ]);

  const jobTitle = job?.title || 'Job Service';

  // Kafka Event
  try {
    await kafkaProducer.sendMessage('notification', {
      type: 'BOOKING_COMPLETED',
      data: {
        bookingId: String(booking._id),
        bookingNumber: booking.bookingNumber,
        customerId: String(booking.customer),
        artisanId: String(booking.artisan),
        netPayoutAmount: booking.artisanPayoutAmount,
      },
    });
  } catch (err: any) {
    logger.warn(`[Kafka] Could not publish BOOKING_COMPLETED: ${err?.message}`);
  }

  // In-App Notification to Artisan
  await NotificationServices.createNotification({
    receiver: booking.artisan,
    title: 'Customer Confirmed Completion! 🎉',
    message: `${customer?.name || 'Customer'} confirmed completion of Booking #${booking.bookingNumber}. Payout ($${Number(booking.artisanPayoutAmount).toFixed(2)}) is awaiting Admin approval.`,
    refId: booking._id,
    path: `/pro/jobs/${booking._id}`,
    seen: false,
  });

  // In-App Notification to Admins
  await NotificationServices.sendNotificationToAdmins({
    title: 'Payout Ready for Approval',
    message: `Booking #${booking.bookingNumber} completed. Net Artisan Payout: $${Number(booking.artisanPayoutAmount).toFixed(2)}.`,
    refId: booking._id,
    path: `/admin/bookings/${booking._id}`,
  });

  // Email to Artisan
  if (artisan && artisan.email) {
    const emailData = emailTemplate.bookingCompletionConfirmedArtisanEmail({
      artisanName: artisan.name,
      artisanEmail: artisan.email,
      customerName: customer?.name || 'Customer',
      jobTitle,
      bookingNumber: booking.bookingNumber,
      bookingId: String(booking._id),
      netPayoutAmount: booking.artisanPayoutAmount,
      rating: payload.rating,
      feedback: payload.feedback,
    });
    await emailHelper.sendEmail(emailData);
  }

  return booking;
};

/**
 * 6. APPROVE PAYOUT (ADMIN)
 */
const approveBookingPayout = async (
  bookingId: string,
  adminId: string,
  payload: { notes?: string },
) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  if (booking.status !== BOOKING_STATUSES.COMPLETED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot approve payout. Booking must be completed (Current status: ${booking.status}).`,
    );
  }

  if (booking.payoutStatus !== BOOKING_PAYOUT_STATUSES.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Payout is already ${booking.payoutStatus}. Cannot approve again.`,
    );
  }

  booking.payoutStatus = BOOKING_PAYOUT_STATUSES.APPROVED;
  booking.payoutApprovedAt = new Date();
  booking.payoutApprovedBy = new Types.ObjectId(adminId);
  if (payload.notes) {
    booking.payoutNotes = payload.notes;
  }
  await booking.save();

  // Populate details
  const [artisan, job] = await Promise.all([
    User.findById(booking.artisan).select('name email'),
    Job.findById(booking.job).select('title'),
  ]);

  const jobTitle = job?.title || 'Job Service';

  // Kafka Event
  try {
    await kafkaProducer.sendMessage('notification', {
      type: 'BOOKING_PAYOUT_APPROVED',
      data: {
        bookingId: String(booking._id),
        bookingNumber: booking.bookingNumber,
        artisanId: String(booking.artisan),
        netPayoutAmount: booking.artisanPayoutAmount,
      },
    });
  } catch (err: any) {
    logger.warn(
      `[Kafka] Could not publish BOOKING_PAYOUT_APPROVED: ${err?.message}`,
    );
  }

  // In-App Notification to Artisan
  await NotificationServices.createNotification({
    receiver: booking.artisan,
    title: 'Payout Approved! 🛡️',
    message: `Admin approved your payout of $${Number(booking.artisanPayoutAmount).toFixed(2)} for Booking #${booking.bookingNumber}. Release will occur shortly.`,
    refId: booking._id,
    path: `/artisan/bookings/${booking._id}`,
    seen: false,
  });

  // Email to Artisan
  if (artisan && artisan.email) {
    const emailData = emailTemplate.bookingPayoutApprovedArtisanEmail({
      artisanName: artisan.name,
      artisanEmail: artisan.email,
      jobTitle,
      bookingNumber: booking.bookingNumber,
      bookingId: String(booking._id),
      netPayoutAmount: booking.artisanPayoutAmount,
    });
    await emailHelper.sendEmail(emailData);
  }

  return booking;
};

/**
 * 7. RELEASE PAYOUT (ADMIN / SYSTEM)
 * Platform commission deducted & Net amount transferred/released to Artisan
 */
const releaseBookingPayout = async (
  bookingId: string,
  adminId: string,
  payload: { payoutMethod?: string; notes?: string },
) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  if (booking.status !== BOOKING_STATUSES.COMPLETED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot release payout. Booking must be COMPLETED (Current status: ${booking.status}).`,
    );
  }

  if (booking.payoutStatus === BOOKING_PAYOUT_STATUSES.RELEASED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Payout for this booking has already been released.',
    );
  }

  const artisanUser = await User.findById(booking.artisan);
  if (!artisanUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Artisan not found');
  }

  let payoutTransferId = '';
  let payoutMethod = payload.payoutMethod || 'MANUAL_BANK';

  // If artisan has Stripe Connect account connected, attempt automated transfer
  if (artisanUser.stripeAccountInfo?.accountId) {
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(booking.artisanPayoutAmount * 100),
        currency: 'usd',
        destination: artisanUser.stripeAccountInfo.accountId,
        description: `Payout for Booking #${booking.bookingNumber}`,
        metadata: {
          bookingId: booking._id.toString(),
          bookingNumber: booking.bookingNumber,
          artisanId: booking.artisan.toString(),
        },
      });

      payoutTransferId = transfer.id;
      payoutMethod = 'STRIPE_TRANSFER';
    } catch (transferErr: any) {
      logger.warn(
        `[StripeTransfer] Automated transfer failed: ${transferErr?.message}. Falling back to manual settlement reference.`,
      );
      payoutTransferId = `PAYOUT-${booking.bookingNumber}-${Date.now()}`;
      payoutMethod = payload.payoutMethod || 'MANUAL_SETTLEMENT';
    }
  } else {
    payoutTransferId = `PAYOUT-${booking.bookingNumber}-${Date.now()}`;
    payoutMethod = payload.payoutMethod || 'MANUAL_BANK';
  }

  // Create Payout Transaction record in Transaction model
  await Transaction.create({
    user: booking.artisan,
    total_price: booking.artisanPayoutAmount,
    payment_received: booking.artisanPayoutAmount,
    platform_fee: booking.platformFee,
    transaction_id: payoutTransferId,
    payment_method: payoutMethod,
    status: TRANSACTION_STATUS.SUCCESS,
    type: TRANSACTION_TYPE.DEBIT,
    category: TRANSACTION_CATEGORY.SERVICE,
    order: booking._id,
  });

  // Update Booking
  booking.payoutStatus = BOOKING_PAYOUT_STATUSES.RELEASED;
  booking.payoutReleasedAt = new Date();
  booking.payoutReleasedBy = new Types.ObjectId(adminId);
  booking.payoutTransferId = payoutTransferId;
  booking.payoutMethod = payoutMethod;
  booking.paymentStatus = BOOKING_PAYMENT_STATUSES.PAID;
  if (payload.notes) {
    booking.payoutNotes = payload.notes;
  }
  await booking.save();

  // Increment completedJobs on ArtisanProfile
  try {
    await ArtisanProfile.findOneAndUpdate(
      { user: booking.artisan },
      { $inc: { completedJobs: 1 } },
    );
  } catch (profErr: any) {
    logger.warn(
      `[ArtisanProfile] Could not increment completedJobs: ${profErr?.message}`,
    );
  }

  // Populate job for notification and email
  const job = await Job.findById(booking.job).select('title');
  const jobTitle = job?.title || 'Job Service';

  // Kafka Event
  try {
    await kafkaProducer.sendMessage('notification', {
      type: 'BOOKING_PAYOUT_RELEASED',
      data: {
        bookingId: String(booking._id),
        bookingNumber: booking.bookingNumber,
        artisanId: String(booking.artisan),
        netPayoutAmount: booking.artisanPayoutAmount,
        platformFee: booking.platformFee,
        payoutTransferId,
      },
    });
  } catch (err: any) {
    logger.warn(
      `[Kafka] Could not publish BOOKING_PAYOUT_RELEASED: ${err?.message}`,
    );
  }

  // In-App Notification to Artisan
  await NotificationServices.createNotification({
    receiver: booking.artisan,
    title: 'Payout Released! 💵',
    message: `Your net payout of $${Number(booking.artisanPayoutAmount).toFixed(2)} for Booking #${booking.bookingNumber} has been released (Platform Commission deducted: $${Number(booking.platformFee).toFixed(2)}).`,
    refId: booking._id,
    path: `/artisan/bookings/${booking._id}`,
    seen: false,
  });

  // Email to Artisan
  if (artisanUser && artisanUser.email) {
    const emailData = emailTemplate.bookingPayoutReleasedArtisanEmail({
      artisanName: artisanUser.name,
      artisanEmail: artisanUser.email,
      jobTitle,
      bookingNumber: booking.bookingNumber,
      bookingId: String(booking._id),
      totalAmount: booking.totalAmount,
      platformFee: booking.platformFee,
      netPayoutAmount: booking.artisanPayoutAmount,
      payoutMethod,
      payoutTransferId,
    });
    await emailHelper.sendEmail(emailData);
  }

  return booking;
};

/**
 * 8. GET MY BOOKINGS (CUSTOMER OR ARTISAN)
 */
const getMyBookings = async (
  userId: string,
  userRole: USER_ROLES,
  query: Record<string, any>,
) => {
  const filter: Record<string, any> = {};

  if (userRole === USER_ROLES.ARTISAN) {
    filter.artisan = new Types.ObjectId(userId);
  } else {
    filter.customer = new Types.ObjectId(userId);
  }

  const qb = new QueryBuilder(
    Booking.find(filter).populate([
      {
        path: 'job',
        select:
          'title location budget status category service images preferredDate postCode',
      },
      {
        path: 'customer',
        select: 'name email phone image location',
      },
      {
        path: 'artisan',
        select: 'name email phone image location verified',
      },
      {
        path: 'quotation',
        select: 'proposedAmount rateType estimatedDuration message',
      },
    ]),
    query,
  )
    .search(BOOKING_SEARCHABLE_FIELDS)
    .filter(['status', 'paymentStatus', 'payoutStatus'])
    .fields()
    .sort()
    .paginate();

  const [bookings, pagination] = await Promise.all([
    qb.modelQuery.lean().exec(),
    qb.getPaginationInfo(),
  ]);

  return { bookings, pagination };
};

/**
 * 9. GET ALL BOOKINGS (ADMIN ONLY)
 */
const getAllBookingsAdmin = async (query: Record<string, any>) => {
  const qb = new QueryBuilder(
    Booking.find().populate([
      {
        path: 'job',
        select: 'title location budget status category service images postCode',
      },
      {
        path: 'customer',
        select: 'name email phone image location',
      },
      {
        path: 'artisan',
        select: 'name email phone image location verified',
      },
      {
        path: 'quotation',
        select: 'proposedAmount rateType estimatedDuration message',
      },
      {
        path: 'payoutApprovedBy',
        select: 'name email',
      },
      {
        path: 'payoutReleasedBy',
        select: 'name email',
      },
    ]),
    query,
  )
    .search(BOOKING_SEARCHABLE_FIELDS)
    .filter(['status', 'paymentStatus', 'payoutStatus'])
    .fields()
    .sort()
    .paginate();

  const [bookings, pagination] = await Promise.all([
    qb.modelQuery.lean().exec(),
    qb.getPaginationInfo(),
  ]);

  return { bookings, pagination };
};

/**
 * 10. GET SINGLE BOOKING
 */
const getSingleBooking = async (
  bookingId: string,
  userId: string,
  isAdmin = false,
) => {
  const booking = await Booking.findById(bookingId)
    .populate([
      {
        path: 'job',
        select:
          'title description location budget status preferredDate images postCode category service',
      },
      {
        path: 'customer',
        select: 'name email phone image location',
      },
      {
        path: 'artisan',
        select: 'name email phone image location verified',
      },
      {
        path: 'quotation',
        select: 'proposedAmount rateType estimatedDuration message acceptedAt',
      },
      {
        path: 'payoutApprovedBy',
        select: 'name email',
      },
      {
        path: 'payoutReleasedBy',
        select: 'name email',
      },
    ])
    .lean();

  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  const isCustomer = booking.customer?._id?.toString() === userId;
  const isArtisan = booking.artisan?._id?.toString() === userId;

  if (!isAdmin && !isCustomer && !isArtisan) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to view this booking',
    );
  }

  return booking;
};

export const BookingServices = {
  createBookingCheckoutSession,
  verifyBookingPayment,
  startWork,
  deliverBooking,
  confirmBookingCompletion,
  approveBookingPayout,
  releaseBookingPayout,
  getMyBookings,
  getAllBookingsAdmin,
  getSingleBooking,
};

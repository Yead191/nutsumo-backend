import mongoose, { Types } from 'mongoose';
import Stripe from 'stripe';
import { Booking } from '../app/modules/booking/booking.model';
import {
  BOOKING_STATUSES,
  BOOKING_PAYMENT_STATUSES,
} from '../app/modules/booking/booking.constants';
import { Transaction } from '../app/modules/transaction/transaction.model';
import {
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '../enums/transaction';
import { Job } from '../app/modules/job/job.model';
import { JOB_STATUSES } from '../app/modules/job/job.constants';
import { User } from '../app/modules/user/user.model';
import { NotificationServices } from '../app/modules/notification/notification.service';
import { emailHelper } from '../helpers/emailHelper';
import { emailTemplate } from '../shared/emailTemplate';
import { kafkaProducer } from '../tools/kafka/kafka-producers/kafka.producer';
import { logger } from '../shared/logger';

export const handleBookingPayment = async (
  checkoutSession: Stripe.Checkout.Session,
) => {
  const metadata = checkoutSession?.metadata || {};
  const bookingId = metadata?.bookingId;

  if (!bookingId || !Types.ObjectId.isValid(bookingId)) {
    logger.warn(
      '[BookingPayment] No valid bookingId found in session metadata',
    );
    return;
  }

  const paymentTxnId =
    (checkoutSession.payment_intent as string) || checkoutSession.id;

  let session: mongoose.ClientSession | null = null;
  let useTransaction = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransaction = true;
  } catch {
    session = null;
    useTransaction = false;
  }

  try {
    // 1. Check idempotency: Has this transaction already been processed?
    const existingTransaction = session
      ? await Transaction.findOne({
          transaction_id: { $in: [checkoutSession.id, paymentTxnId] },
        }).session(session)
      : await Transaction.findOne({
          transaction_id: { $in: [checkoutSession.id, paymentTxnId] },
        });

    if (existingTransaction) {
      logger.info(
        `[BookingPayment] Transaction already processed for ID: ${paymentTxnId}`,
      );
      if (useTransaction && session) {
        await session.abortTransaction();
        session.endSession();
      }
      return;
    }

    // 2. Fetch Booking
    const booking = session
      ? await Booking.findById(bookingId).session(session)
      : await Booking.findById(bookingId);

    if (!booking) {
      logger.error(`[BookingPayment] Booking not found for ID: ${bookingId}`);
      if (useTransaction && session) {
        await session.abortTransaction();
        session.endSession();
      }
      return;
    }

    // If already in escrow or paid, avoid duplicate state transition
    if (
      booking.paymentStatus === BOOKING_PAYMENT_STATUSES.ESCROW_HELD ||
      booking.paymentStatus === BOOKING_PAYMENT_STATUSES.PAID
    ) {
      logger.info(
        `[BookingPayment] Booking #${booking.bookingNumber} is already paid or held in escrow`,
      );
      if (useTransaction && session) {
        await session.abortTransaction();
        session.endSession();
      }
      return;
    }

    // 3. Update Booking to ESCROW_HELD & CONFIRMED
    booking.paymentStatus = BOOKING_PAYMENT_STATUSES.ESCROW_HELD;
    booking.status = BOOKING_STATUSES.CONFIRMED;
    booking.stripePaymentIntentId = paymentTxnId;
    booking.stripeSessionId = checkoutSession.id;
    booking.paidAt = new Date();

    if (session) {
      await booking.save({ session });
    } else {
      await booking.save();
    }

    // 4. Update Job status to BOOKED
    if (session) {
      await Job.findByIdAndUpdate(
        booking.job,
        { status: JOB_STATUSES.BOOKED },
        { session },
      );
    } else {
      await Job.findByIdAndUpdate(booking.job, { status: JOB_STATUSES.BOOKED });
    }

    // 5. Create Transaction Record
    const amountReceived = checkoutSession.amount_total
      ? checkoutSession.amount_total / 100
      : booking.totalAmount;

    const transactionPayload = {
      user: booking.customer,
      total_price: booking.totalAmount,
      payment_received: amountReceived,
      vat: booking.vatAmount,
      nhil: booking.nhilAmount,
      get_fund_levy: booking.getFundLevyAmount,
      platform_fee: booking.platformFee,
      transaction_id: paymentTxnId,
      payment_intent_id:
        typeof checkoutSession.payment_intent === 'string'
          ? checkoutSession.payment_intent
          : undefined,
      payment_method: checkoutSession.payment_method_types?.[0] || 'card',
      status: TRANSACTION_STATUS.SUCCESS,
      type: TRANSACTION_TYPE.CREDIT,
      category: TRANSACTION_CATEGORY.SERVICE,
      order: booking._id,
    };

    if (session) {
      await Transaction.create([transactionPayload], { session });
    } else {
      await Transaction.create(transactionPayload);
    }

    // Commit Transaction
    if (useTransaction && session) {
      await session.commitTransaction();
      session.endSession();
    }

    logger.info(
      `[BookingPayment] Successfully processed Escrow payment for Booking #${booking.bookingNumber}`,
    );

    // 6. Fetch details for Notifications and Emails
    const [customer, artisan, job] = await Promise.all([
      User.findById(booking.customer).select('name email phone'),
      User.findById(booking.artisan).select('name email phone'),
      Job.findById(booking.job).select('title location'),
    ]);

    const jobTitle = job?.title || 'Job Service';

    // 7. Post-Transaction Kafka Event
    try {
      await kafkaProducer.sendMessage('notification', {
        type: 'BOOKING_PAYMENT_ESCROW_HELD',
        data: {
          bookingId: String(booking._id),
          bookingNumber: booking.bookingNumber,
          customerId: String(booking.customer),
          artisanId: String(booking.artisan),
          amount: booking.totalAmount,
          transactionId: paymentTxnId,
        },
      });
    } catch (err: any) {
      logger.warn(
        `[Kafka] Could not publish BOOKING_PAYMENT_ESCROW_HELD: ${err?.message}`,
      );
    }

    // 8. In-App Notifications
    // To Customer
    await NotificationServices.createNotification({
      receiver: booking.customer,
      title: 'Payment Secured in Escrow 🛡️',
      message: `Your payment of $${Number(booking.totalAmount).toFixed(2)} for Booking #${booking.bookingNumber} is securely held in Escrow. The artisan has been notified to start work.`,
      refId: booking._id,
      path: `/account/bookings/${booking._id}`,
      seen: false,
    });

    // To Artisan
    await NotificationServices.createNotification({
      receiver: booking.artisan,
      title: 'Escrow Payment Secured! 💰',
      message: `The customer has funded Booking #${booking.bookingNumber} ($${Number(booking.totalAmount).toFixed(2)}). You can now begin work safely!`,
      refId: booking._id,
      path: `/pro/jobs/${booking._id}`,
      seen: false,
    });

    // To Admins
    await NotificationServices.sendNotificationToAdmins({
      title: 'New Escrow Payment Received',
      message: `${customer?.name || 'Customer'} paid $${Number(booking.totalAmount).toFixed(2)} for Booking #${booking.bookingNumber}.`,
      refId: booking._id,
      path: `/admin/bookings/${booking._id}`,
    });

    // 9. Send Emails
    if (customer && customer.email) {
      const customerEmailData = emailTemplate.bookingEscrowPaymentCustomerEmail(
        {
          customerName: customer.name,
          customerEmail: customer.email,
          artisanName: artisan?.name || 'Artisan',
          jobTitle,
          bookingNumber: booking.bookingNumber,
          bookingId: String(booking._id),
          amount: booking.totalAmount,
          transactionId: paymentTxnId,
        },
      );
      await emailHelper.sendEmail(customerEmailData);
    }

    if (artisan && artisan.email) {
      const artisanEmailData = emailTemplate.bookingEscrowPaymentArtisanEmail({
        artisanName: artisan.name,
        artisanEmail: artisan.email,
        customerName: customer?.name || 'Customer',
        jobTitle,
        bookingNumber: booking.bookingNumber,
        bookingId: String(booking._id),
        totalAmount: booking.totalAmount,
        artisanPayoutAmount: booking.artisanPayoutAmount,
      });
      await emailHelper.sendEmail(artisanEmailData);
    }
  } catch (error: any) {
    if (useTransaction && session && session.inTransaction()) {
      await session.abortTransaction();
    }
    if (session) {
      session.endSession();
    }
    logger.error(`[BookingPayment Error]: ${error?.message || error}`);
    throw error;
  }
};

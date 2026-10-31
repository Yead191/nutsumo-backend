import mongoose, { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Quotation } from './quotation.model';
import { IQuotation } from './quotation.interface';
import { QUOTATION_STATUSES } from './quotation.constants';
import { Job } from '../job/job.model';
import { JOB_STATUSES } from '../job/job.constants';
import { Booking } from '../booking/booking.model';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import QueryBuilder from '../../builder/QueryBuilder';
import { NotificationServices } from '../notification/notification.service';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import { kafkaProducer } from '../../../tools/kafka/kafka-producers/kafka.producer';
import { logger } from '../../../shared/logger';

// Helper to generate human-readable unique booking number
const generateBookingNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BK-${timestamp}-${random}`;
};

/**
 * SUBMIT QUOTATION (ARTISAN)
 */
const submitQuotation = async (
  artisanId: string,
  payload: {
    job: string;
    proposedAmount: number;
    rateType: 'HOURLY' | 'DAILY' | 'FIXED';
    message: string;
    estimatedDuration?: string;
  },
) => {
  const artisan = await User.findById(artisanId);
  if (
    !artisan ||
    artisan.status !== 'active' ||
    artisan.identityStatus !== 'verified'
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Your artisan account is not active or your identity is not verified',
    );
  }

  if (artisan.role !== USER_ROLES.ARTISAN) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only verified artisans can submit quotations',
    );
  }

  const job = await Job.findById(payload.job);
  if (!job) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Job not found');
  }

  if (job.status !== JOB_STATUSES.OPEN) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot submit quotation. This job is currently ${job.status}`,
    );
  }

  if (job.customer.toString() === artisanId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You cannot submit a quotation for your own job',
    );
  }

  // Check previous quotation by this artisan for this job
  const existingQuote = await Quotation.findOne({
    job: payload.job,
    artisan: artisanId,
  });

  let quotationDoc;

  if (existingQuote) {
    if (existingQuote.status === QUOTATION_STATUSES.PENDING) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You already have a pending quotation for this job. You can edit it instead.',
      );
    }

    if (existingQuote.status === QUOTATION_STATUSES.ACCEPTED) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Your quotation for this job has already been accepted.',
      );
    }

    if (existingQuote.status === QUOTATION_STATUSES.REJECTED) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You cannot submit another quotation because your previous proposal was declined.',
      );
    }

    if (existingQuote.status === QUOTATION_STATUSES.WITHDRAWN) {
      // Reactivate withdrawn quotation with new details
      existingQuote.proposedAmount = payload.proposedAmount;
      existingQuote.rateType = payload.rateType;
      existingQuote.message = payload.message;
      existingQuote.estimatedDuration = payload.estimatedDuration || '';
      existingQuote.status = QUOTATION_STATUSES.PENDING;
      existingQuote.withdrawnAt = null;
      existingQuote.rejectReason = '';
      await existingQuote.save();
      quotationDoc = existingQuote;
    } else {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cannot submit quotation for this job',
      );
    }
  } else {
    // Create new quotation
    quotationDoc = await Quotation.create({
      job: new Types.ObjectId(payload.job),
      customer: job.customer,
      artisan: new Types.ObjectId(artisanId),
      proposedAmount: payload.proposedAmount,
      rateType: payload.rateType,
      message: payload.message,
      estimatedDuration: payload.estimatedDuration || '',
      status: QUOTATION_STATUSES.PENDING,
    });
  }

  if (!quotationDoc) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to create or update quotation',
    );
  }

  // Publish Kafka event
  try {
    await kafkaProducer.sendMessage('notification', {
      type: 'QUOTATION_CREATED',
      data: {
        quotationId: String(quotationDoc._id),
        jobId: String(job._id),
        customerId: String(job.customer),
        artisanId: String(artisanId),
        artisanName: artisan.name,
        jobTitle: job.title,
        proposedAmount: payload.proposedAmount,
        rateType: payload.rateType,
      },
    });
  } catch (err: any) {
    logger.warn(
      `[Kafka] Could not publish QUOTATION_CREATED event: ${err?.message}`,
    );
  }

  // Send In-App Notification to Customer
  await NotificationServices.createNotification({
    receiver: job.customer,
    title: 'New Quotation Received',
    message: `${artisan.name} submitted an offer of $${payload.proposedAmount} (${payload.rateType}) for "${job.title}".`,
    refId: quotationDoc._id as Types.ObjectId,
    path: `/jobs/${job._id}`,
    seen: false,
  });

  // Send Email Notification to Customer
  const customer = await User.findById(job.customer).select('name email');
  if (customer && customer.email) {
    const emailData = emailTemplate.quotationReceivedCustomerEmail({
      customerName: customer.name,
      customerEmail: customer.email,
      artisanName: artisan.name,
      jobTitle: job.title,
      jobId: String(job._id),
      proposedAmount: payload.proposedAmount,
      rateType: payload.rateType,
      estimatedDuration: payload.estimatedDuration,
      message: payload.message,
    });
    await emailHelper.sendEmail(emailData);
  }

  return Quotation.findById(quotationDoc._id)
    .populate('job', 'title location budget status category service')
    .populate('artisan', 'name image phone');
};

/**
 * GET MY QUOTATIONS (ARTISAN)
 */
const getMyQuotations = async (
  artisanId: string,
  query: Record<string, any>,
) => {
  const qb = new QueryBuilder(
    Quotation.find({ artisan: artisanId }).populate([
      {
        path: 'job',
        select:
          'title location budget status category service images preferredDate',
      },
      {
        path: 'customer',
        select: 'name image',
      },
    ]),
    query,
  )
    .search(['message', 'estimatedDuration'])
    .filter()
    .fields()
    .sort()
    .paginate();

  const [quotations, pagination] = await Promise.all([
    qb.modelQuery.lean().exec(),
    qb.getPaginationInfo(),
  ]);

  return { quotations, pagination };
};

/**
 * GET JOB QUOTATIONS (JOB OWNER / ADMIN)
 */
const getJobQuotations = async (
  jobId: string,
  userId: string,
  isAdmin = false,
  query: Record<string, any> = {},
) => {
  const job = await Job.findById(jobId);
  if (!job) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Job not found');
  }

  if (!isAdmin && job.customer.toString() !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to view quotations for this job',
    );
  }

  const baseFilter = {
    job: new Types.ObjectId(jobId),
  };

  const qb = new QueryBuilder(
    Quotation.find(baseFilter).populate([
      {
        path: 'artisan',
        select: 'name email phone image location verified',
        populate: {
          path: 'artisanProfileData',
          select:
            'trade rating reviewsCount experienceYears hourlyRate businessName bio location',
        },
      },
      {
        path: 'job',
        select: 'title budget location status preferredDate',
      },
    ]),
    query,
  )
    .search(['message', 'estimatedDuration'])
    .filter()
    .fields()
    .sort()
    .paginate();

  const [quotations, pagination] = await Promise.all([
    qb.modelQuery.lean().exec(),
    qb.getPaginationInfo(),
  ]);

  return { quotations, pagination, job };
};

/**
 * GET SINGLE QUOTATION (ARTISAN / JOB OWNER / ADMIN)
 */
const getSingleQuotation = async (
  quotationId: string,
  userId: string,
  isAdmin = false,
) => {
  const quotation = await Quotation.findById(quotationId)
    .populate(
      'job',
      'title description location budget status preferredDate images',
    )
    .populate({
      path: 'artisan',
      select: 'name email phone image location verified',
      populate: {
        path: 'artisanProfileData',
        select:
          'trade rating reviewsCount experienceYears hourlyRate businessName bio location',
      },
    })
    .populate('customer', 'name email phone image location')
    .lean();

  if (!quotation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quotation not found');
  }

  const isArtisan = quotation.artisan?._id?.toString() === userId;
  const isCustomer = quotation.customer?._id?.toString() === userId;

  if (!isAdmin && !isArtisan && !isCustomer) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to view this quotation',
    );
  }

  return quotation;
};

/**
 * UPDATE PENDING QUOTATION (ARTISAN)
 */
const updateQuotation = async (
  quotationId: string,
  artisanId: string,
  payload: Partial<IQuotation>,
) => {
  const quotation = await Quotation.findById(quotationId);
  if (!quotation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quotation not found');
  }

  if (quotation.artisan.toString() !== artisanId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only edit your own quotation',
    );
  }

  if (quotation.status !== QUOTATION_STATUSES.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot update quotation with status ${quotation.status}. Only pending quotations can be edited.`,
    );
  }

  const job = await Job.findById(quotation.job);
  if (!job || job.status !== JOB_STATUSES.OPEN) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This job is no longer open for proposal updates',
    );
  }

  if (payload.proposedAmount !== undefined) {
    quotation.proposedAmount = payload.proposedAmount;
  }
  if (payload.rateType !== undefined) {
    quotation.rateType = payload.rateType;
  }
  if (payload.message !== undefined) {
    quotation.message = payload.message;
  }
  if (payload.estimatedDuration !== undefined) {
    quotation.estimatedDuration = payload.estimatedDuration;
  }

  await quotation.save();

  return Quotation.findById(quotation._id)
    .populate('job', 'title location budget status')
    .populate('artisan', 'name image');
};

/**
 * WITHDRAW QUOTATION (ARTISAN)
 */
const withdrawQuotation = async (quotationId: string, artisanId: string) => {
  const quotation = await Quotation.findById(quotationId);
  if (!quotation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quotation not found');
  }

  if (quotation.artisan.toString() !== artisanId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only withdraw your own quotation',
    );
  }

  if (quotation.status !== QUOTATION_STATUSES.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot withdraw quotation with status ${quotation.status}. Only pending quotations can be withdrawn.`,
    );
  }

  quotation.status = QUOTATION_STATUSES.WITHDRAWN;
  quotation.withdrawnAt = new Date();
  await quotation.save();

  // Notify customer
  const job = await Job.findById(quotation.job).select('title customer');
  const artisan = await User.findById(artisanId).select('name');

  if (job && artisan) {
    await NotificationServices.createNotification({
      receiver: job.customer,
      title: 'Quotation Withdrawn',
      message: `${artisan.name} has withdrawn their proposal for "${job.title}".`,
      refId: quotation._id as Types.ObjectId,
      path: `/jobs/${job._id}`,
      seen: false,
    });
  }

  return quotation;
};

/**
 * ACCEPT QUOTATION (CUSTOMER - ATOMIC TRANSACTION)
 */
const acceptQuotation = async (quotationId: string, customerId: string) => {
  let session: mongoose.ClientSession | null = null;
  let useTransaction = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransaction = true;
  } catch {
    // If standalone MongoDB without replica set in local dev, proceed without session
    session = null;
    useTransaction = false;
  }

  try {
    // 1. Fetch quotation
    const quotation = session
      ? await Quotation.findById(quotationId).session(session)
      : await Quotation.findById(quotationId);

    if (!quotation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Quotation not found');
    }

    if (quotation.customer.toString() !== customerId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You are not authorized to accept this quotation',
      );
    }

    if (quotation.status !== QUOTATION_STATUSES.PENDING) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Cannot accept quotation. Current status is ${quotation.status}`,
      );
    }

    // 2. Fetch Job
    const job = session
      ? await Job.findById(quotation.job).session(session)
      : await Job.findById(quotation.job);

    if (!job) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Job not found');
    }

    if (job.status !== JOB_STATUSES.OPEN) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `This job is no longer open. Current status: ${job.status}`,
      );
    }

    // 3. Mark selected quotation as ACCEPTED
    quotation.status = QUOTATION_STATUSES.ACCEPTED;
    quotation.acceptedAt = new Date();
    await (session ? quotation.save({ session }) : quotation.save());

    // 4. Update Job status to BOOKED
    job.status = JOB_STATUSES.BOOKED;
    job.selectedQuotation = quotation._id as Types.ObjectId;
    job.selectedArtisan = quotation.artisan;
    await (session ? job.save({ session }) : job.save());

    // 5. Reject all other pending quotations for this job
    const otherPendingQuotes = session
      ? await Quotation.find({
          job: job._id,
          _id: { $ne: quotation._id },
          status: QUOTATION_STATUSES.PENDING,
        }).session(session)
      : await Quotation.find({
          job: job._id,
          _id: { $ne: quotation._id },
          status: QUOTATION_STATUSES.PENDING,
        });

    if (otherPendingQuotes.length > 0) {
      if (session) {
        await Quotation.updateMany(
          {
            job: job._id,
            _id: { $ne: quotation._id },
            status: QUOTATION_STATUSES.PENDING,
          },
          {
            $set: {
              status: QUOTATION_STATUSES.REJECTED,
              rejectedAt: new Date(),
              rejectReason: 'Another quotation was accepted by the customer',
            },
          },
          { session },
        );
      } else {
        await Quotation.updateMany(
          {
            job: job._id,
            _id: { $ne: quotation._id },
            status: QUOTATION_STATUSES.PENDING,
          },
          {
            $set: {
              status: QUOTATION_STATUSES.REJECTED,
              rejectedAt: new Date(),
              rejectReason: 'Another quotation was accepted by the customer',
            },
          },
        );
      }
    }

    // 6. Create Booking record
    const bookingNumber = generateBookingNumber();
    let bookingDoc;

    const bookingPayload = {
      bookingNumber,
      job: job._id as Types.ObjectId,
      quotation: quotation._id as Types.ObjectId,
      customer: new Types.ObjectId(customerId),
      artisan: quotation.artisan,
      totalAmount: quotation.proposedAmount,
      rateType: quotation.rateType,
      status: 'CONFIRMED' as const,
      paymentStatus: 'UNPAID' as const,
    };

    if (session) {
      const created = await Booking.create([bookingPayload], { session });
      bookingDoc = created[0];
    } else {
      bookingDoc = await Booking.create(bookingPayload);
    }

    // Commit Transaction
    if (useTransaction && session) {
      await session.commitTransaction();
      session.endSession();
    }

    // 7. Post-Transaction Notifications & Kafka Dispatch
    try {
      await kafkaProducer.sendMessage('notification', {
        type: 'QUOTATION_ACCEPTED',
        data: {
          jobId: String(job._id),
          jobTitle: job.title,
          quotationId: String(quotation._id),
          bookingId: String(bookingDoc._id),
          bookingNumber,
          customerId,
          artisanId: String(quotation.artisan),
          amount: quotation.proposedAmount,
          rateType: quotation.rateType,
        },
      });
    } catch (err: any) {
      logger.warn(
        `[Kafka] Could not publish QUOTATION_ACCEPTED event: ${err?.message}`,
      );
    }

    // Notify Accepted Artisan
    await NotificationServices.createNotification({
      receiver: quotation.artisan,
      title: 'Quotation Accepted! 🎉',
      message: `Great news! Your quotation for "${job.title}" has been accepted. Booking #${bookingNumber} is confirmed.`,
      refId: bookingDoc._id as Types.ObjectId,
      path: `/bookings/${bookingDoc._id}`,
      seen: false,
    });

    // Notify Customer
    await NotificationServices.createNotification({
      receiver: new Types.ObjectId(customerId),
      title: 'Booking Confirmed',
      message: `You have successfully booked "${job.title}". Booking #${bookingNumber} created.`,
      refId: bookingDoc._id as Types.ObjectId,
      path: `/bookings/${bookingDoc._id}`,
      seen: false,
    });

    // Notify Rejected Artisans
    for (const rejectedQuote of otherPendingQuotes) {
      await NotificationServices.createNotification({
        receiver: rejectedQuote.artisan,
        title: 'Quotation Update',
        message: `The customer has selected another proposal for "${job.title}".`,
        refId: rejectedQuote._id as Types.ObjectId,
        path: `/jobs/${job._id}`,
        seen: false,
      });
    }

    // Send Emails asynchronously
    const [customerUser, artisanUser] = await Promise.all([
      User.findById(customerId).select('name email phone'),
      User.findById(quotation.artisan).select('name email phone'),
    ]);

    if (artisanUser && artisanUser.email) {
      const artisanEmail = emailTemplate.quotationAcceptedArtisanEmail({
        artisanName: artisanUser.name,
        artisanEmail: artisanUser.email,
        customerName: customerUser?.name || 'Customer',
        customerPhone: customerUser?.phone,
        jobTitle: job.title,
        jobId: String(job._id),
        bookingNumber,
        agreedAmount: quotation.proposedAmount,
        rateType: quotation.rateType,
      });
      await emailHelper.sendEmail(artisanEmail);
    }

    if (customerUser && customerUser.email) {
      const customerEmail = emailTemplate.bookingConfirmedCustomerEmail({
        customerName: customerUser.name,
        customerEmail: customerUser.email,
        artisanName: artisanUser?.name || 'Artisan',
        artisanPhone: artisanUser?.phone,
        jobTitle: job.title,
        jobId: String(job._id),
        bookingNumber,
        agreedAmount: quotation.proposedAmount,
        rateType: quotation.rateType,
      });
      await emailHelper.sendEmail(customerEmail);
    }

    return {
      quotation,
      booking: bookingDoc,
      job,
    };
  } catch (error) {
    if (useTransaction && session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
};

/**
 * REJECT QUOTATION (CUSTOMER)
 */
const rejectQuotation = async (
  quotationId: string,
  customerId: string,
  rejectReason?: string,
) => {
  const quotation = await Quotation.findById(quotationId);
  if (!quotation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quotation not found');
  }

  if (quotation.customer.toString() !== customerId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to decline this quotation',
    );
  }

  if (quotation.status !== QUOTATION_STATUSES.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot decline quotation with status ${quotation.status}`,
    );
  }

  quotation.status = QUOTATION_STATUSES.REJECTED;
  quotation.rejectedAt = new Date();
  quotation.rejectReason = rejectReason || 'Declined by customer';
  await quotation.save();

  const job = await Job.findById(quotation.job).select('title');
  const artisan = await User.findById(quotation.artisan).select('name email');

  // Publish Kafka event
  try {
    await kafkaProducer.sendMessage('notification', {
      type: 'QUOTATION_REJECTED',
      data: {
        quotationId: String(quotation._id),
        jobId: String(quotation.job),
        customerId,
        artisanId: String(quotation.artisan),
        rejectReason: quotation.rejectReason,
      },
    });
  } catch (err: any) {
    logger.warn(
      `[Kafka] Could not publish QUOTATION_REJECTED event: ${err?.message}`,
    );
  }

  // Send In-App notification
  if (job) {
    await NotificationServices.createNotification({
      receiver: quotation.artisan,
      title: 'Quotation Declined',
      message: `Your quotation for "${job.title}" was not accepted. ${quotation.rejectReason}`,
      refId: quotation._id as Types.ObjectId,
      path: `/jobs/${job._id}`,
      seen: false,
    });

    // Send Email
    if (artisan && artisan.email) {
      const email = emailTemplate.quotationRejectedArtisanEmail({
        artisanName: artisan.name,
        artisanEmail: artisan.email,
        jobTitle: job.title,
        reason: quotation.rejectReason,
      });
      await emailHelper.sendEmail(email);
    }
  }

  return quotation;
};

export const QuotationServices = {
  submitQuotation,
  getMyQuotations,
  getJobQuotations,
  getSingleQuotation,
  updateQuotation,
  withdrawQuotation,
  acceptQuotation,
  rejectQuotation,
};

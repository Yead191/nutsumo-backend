import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Review } from './review.model';
import { Booking } from '../booking/booking.model';
import { ArtisanProfile } from '../artisanProfile/artisanProfile.model';
import { BOOKING_STATUSES } from '../booking/booking.constants';
import { REVIEW_SEARCHABLE_FIELDS, REVIEW_STATUSES } from './review.constants';
import QueryBuilder from '../../builder/QueryBuilder';
import { NotificationServices } from '../notification/notification.service';
import { kafkaProducer } from '../../../tools/kafka/kafka-producers/kafka.producer';
import { logger } from '../../../shared/logger';
import { User } from '../user/user.model';
import { Job } from '../job/job.model';
import { USER_ROLES } from '../../../enums/user';

/**
 * Helper to recalculate aggregate rating and review count for an Artisan
 */
export const recalculateArtisanRating = async (
  artisanId: Types.ObjectId | string,
) => {
  try {
    const objectId = new Types.ObjectId(artisanId);
    const aggregationResult = await Review.aggregate([
      {
        $match: {
          artisan: objectId,
          status: REVIEW_STATUSES.ACTIVE,
          isPublic: true,
        },
      },
      {
        $group: {
          _id: '$artisan',
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (aggregationResult.length > 0) {
      const avgRating = Number(aggregationResult[0].avgRating.toFixed(1));
      const totalReviews = aggregationResult[0].totalReviews;

      await ArtisanProfile.findOneAndUpdate(
        { user: objectId },
        { rating: avgRating, reviewsCount: totalReviews },
      );
    } else {
      await ArtisanProfile.findOneAndUpdate(
        { user: objectId },
        { rating: 5.0, reviewsCount: 0 },
      );
    }
  } catch (err: any) {
    logger.warn(
      `[ArtisanRating] Could not recalculate rating for artisan ${artisanId}: ${err?.message}`,
    );
  }
};

/**
 * 1. CREATE REVIEW (Customer submits review for completed booking)
 */
const createReview = async (
  customerId: string,
  payload: {
    booking: string;
    rating: number;
    comment: string;
    qualityRating?: number;
    communicationRating?: number;
    timelinessRating?: number;
  },
) => {
  const booking = await Booking.findById(payload.booking);
  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  if (booking.customer.toString() !== customerId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are only allowed to review your own bookings',
    );
  }

  if (booking.status !== BOOKING_STATUSES.COMPLETED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot review booking with status: ${booking.status}. Work must be completed first.`,
    );
  }

  // Prevent duplicate review for the same booking
  const existingReview = await Review.findOne({ booking: booking._id });
  if (existingReview) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'You have already submitted a review for this booking',
    );
  }

  const reviewDoc = await Review.create({
    booking: booking._id,
    job: booking.job,
    customer: new Types.ObjectId(customerId),
    artisan: booking.artisan,
    rating: payload.rating,
    comment: payload.comment,
    qualityRating: payload.qualityRating ?? null,
    communicationRating: payload.communicationRating ?? null,
    timelinessRating: payload.timelinessRating ?? null,
    isPublic: true,
    status: REVIEW_STATUSES.ACTIVE,
  });

  // Link review back to Booking and cache rating/feedback
  booking.review = reviewDoc._id as Types.ObjectId;
  booking.customerRating = payload.rating;
  booking.customerFeedback = payload.comment;
  await booking.save();

  // Recalculate Artisan Profile aggregate rating
  await recalculateArtisanRating(booking.artisan);

  // In-App Notification to Artisan
  const customer = await User.findById(customerId).select('name');
  const job = await Job.findById(booking.job).select('title');

  await NotificationServices.createNotification({
    receiver: booking.artisan,
    title: 'New Review Received ⭐',
    message: `${customer?.name || 'A customer'} left you a ${payload.rating}-star review for "${job?.title || 'Job Service'}".`,
    refId: reviewDoc._id as Types.ObjectId,
    path: `/pro/jobs/${booking._id}`,
    seen: false,
  });

  // Kafka Event
  try {
    await kafkaProducer.sendMessage('notification', {
      type: 'REVIEW_CREATED',
      data: {
        reviewId: String(reviewDoc._id),
        bookingId: String(booking._id),
        artisanId: String(booking.artisan),
        customerId: String(customerId),
        rating: payload.rating,
      },
    });
  } catch (err: any) {
    logger.warn(`[Kafka] Could not publish REVIEW_CREATED: ${err?.message}`);
  }

  return reviewDoc;
};

/**
 * 2. GET ARTISAN REVIEWS (Public / Profile Page)
 * Returns paginated reviews, customer details, job info, and rating summary breakdown
 */
const getArtisanReviews = async (
  artisanId: string,
  query: Record<string, any>,
) => {
  const artisanObjectId = new Types.ObjectId(artisanId);

  // 1. Calculate Rating Distribution Summary
  const distributionAgg = await Review.aggregate([
    {
      $match: {
        artisan: artisanObjectId,
        status: REVIEW_STATUSES.ACTIVE,
        isPublic: true,
      },
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
  ]);

  const distribution: Record<number, number> = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  let totalCount = 0;
  let totalRatingSum = 0;

  distributionAgg.forEach(item => {
    const star = Math.round(item._id);
    if (distribution[star] !== undefined) {
      distribution[star] = item.count;
    }
    totalCount += item.count;
    totalRatingSum += item._id * item.count;
  });

  const averageRating =
    totalCount > 0 ? Number((totalRatingSum / totalCount).toFixed(1)) : 5.0;

  // 2. QueryBuilder for paginated reviews
  const qb = new QueryBuilder(
    Review.find({
      artisan: artisanObjectId,
      status: REVIEW_STATUSES.ACTIVE,
      isPublic: true,
    }).populate([
      {
        path: 'artisan',
        select: 'name image location',
      },
      {
        path: 'customer',
        select: 'name image location',
      },
      {
        path: 'job',
        select: 'title category service completionDate',
      },
    ]),
    query,
  )
    .search(REVIEW_SEARCHABLE_FIELDS)
    .filter(['rating'])
    .sort()
    .paginate();

  const [reviews, pagination] = await Promise.all([
    qb.modelQuery.lean().exec(),
    qb.getPaginationInfo(),
  ]);

  return {
    summary: {
      averageRating,
      totalReviews: totalCount,
      ratingDistribution: distribution,
    },
    reviews,
    pagination,
  };
};

/**
 * 3. GET SINGLE BOOKING REVIEW
 */
const getBookingReview = async (bookingId: string) => {
  const review = await Review.findOne({ booking: bookingId })
    .populate([
      {
        path: 'customer',
        select: 'name image location',
      },
      {
        path: 'artisan',
        select: 'name image location',
      },
      {
        path: 'job',
        select: 'title category service',
      },
    ])
    .lean();

  return review;
};

/**
 * 4. ARTISAN REPLY TO REVIEW
 */
const replyToReview = async (
  reviewId: string,
  artisanId: string,
  comment: string,
) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  if (review.artisan.toString() !== artisanId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only the reviewed artisan can reply to this review',
    );
  }

  review.reply = {
    comment,
    repliedAt: new Date(),
  };

  await review.save();

  // In-App Notification to Customer
  const artisan = await User.findById(artisanId).select('name');
  await NotificationServices.createNotification({
    receiver: review.customer as Types.ObjectId,
    title: 'Artisan Replied to Your Review 💬',
    message: `${artisan?.name || 'Artisan'} has replied to your review.`,
    refId: review._id as Types.ObjectId,
    path: `/account/bookings/${review.booking}`,
    seen: false,
  });

  return review;
};

/**
 * 5. GET MY REVIEWS (Customer or Artisan)
 */
const getMyReviews = async (
  userId: string,
  role: string,
  query: Record<string, any>,
) => {
  const isArtisan = role === USER_ROLES.ARTISAN;
  const filterKey = isArtisan ? 'artisan' : 'customer';

  const qb = new QueryBuilder(
    Review.find({ [filterKey]: new Types.ObjectId(userId) }).populate([
      {
        path: 'artisan',
        select: 'name image location verified',
      },
      {
        path: 'customer',
        select: 'name image location verified',
      },
      {
        path: 'job',
        select: 'title category service',
      },
      {
        path: 'booking',
        select: 'bookingNumber totalAmount completionDate',
      },
    ]),
    query,
  )
    .search(REVIEW_SEARCHABLE_FIELDS)
    .filter(['rating', 'status'])
    .sort()
    .paginate();

  const [reviews, pagination] = await Promise.all([
    qb.modelQuery.lean().exec(),
    qb.getPaginationInfo(),
  ]);

  return { reviews, pagination };
};

/**
 * 6. UPDATE REVIEW (Customer edits their review)
 */
const updateReview = async (
  reviewId: string,
  customerId: string,
  payload: {
    rating?: number;
    comment?: string;
    qualityRating?: number;
    communicationRating?: number;
    timelinessRating?: number;
  },
) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  if (review.customer.toString() !== customerId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are only allowed to update your own review',
    );
  }

  if (payload.rating !== undefined) {
    review.rating = payload.rating;
  }
  if (payload.comment !== undefined) {
    review.comment = payload.comment;
  }
  if (payload.qualityRating !== undefined) {
    review.qualityRating = payload.qualityRating;
  }
  if (payload.communicationRating !== undefined) {
    review.communicationRating = payload.communicationRating;
  }
  if (payload.timelinessRating !== undefined) {
    review.timelinessRating = payload.timelinessRating;
  }

  await review.save();

  // If rating updated, sync Booking cache and recalculate Artisan rating
  if (payload.rating !== undefined || payload.comment !== undefined) {
    await Booking.findByIdAndUpdate(review.booking, {
      ...(payload.rating !== undefined && { customerRating: payload.rating }),
      ...(payload.comment !== undefined && {
        customerFeedback: payload.comment,
      }),
    });

    if (payload.rating !== undefined) {
      const artisanId =
        (review.artisan as any)?._id || (review.artisan as Types.ObjectId);
      await recalculateArtisanRating(artisanId);
    }
  }

  return review;
};

const getAllReviewsAdmin = async (query: Record<string, any>) => {
  const qb = new QueryBuilder(
    Review.find().populate([
      { path: 'customer', select: 'name email image' },
      { path: 'artisan', select: 'name email image' },
      { path: 'job', select: 'title' },
    ]),
    query,
  )
    .search(['comment'])
    .filter()
    .sort()
    .paginate();

  const [reviews, pagination] = await Promise.all([
    qb.modelQuery.lean().exec(),
    qb.getPaginationInfo(),
  ]);

  return { reviews, pagination };
};

export const ReviewServices = {
  createReview,
  getArtisanReviews,
  getBookingReview,
  replyToReview,
  getMyReviews,
  updateReview,
  getAllReviewsAdmin,
  recalculateArtisanRating,
};

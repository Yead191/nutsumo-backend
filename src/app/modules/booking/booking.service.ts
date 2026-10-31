import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Booking } from './booking.model';
import { USER_ROLES } from '../../../enums/user';
import QueryBuilder from '../../builder/QueryBuilder';

/**
 * GET MY BOOKINGS (Customer or Artisan)
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
        select: 'title location budget status category service images preferredDate',
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
    .search(['bookingNumber', 'notes'])
    .filter()
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
 * GET SINGLE BOOKING
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
        select: 'title description location budget status preferredDate images postCode',
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
  getMyBookings,
  getSingleBooking,
};

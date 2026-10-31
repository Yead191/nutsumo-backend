import { Request, Response } from 'express';
import { BookingServices } from './booking.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { USER_ROLES } from '../../../enums/user';

const getMyBookings = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role as USER_ROLES;

  const result = await BookingServices.getMyBookings(
    userId,
    userRole,
    req.query,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Bookings fetched successfully',
    data: result.bookings,
    pagination: result.pagination,
  });
});

const getSingleBooking = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const userId = req.user?.id;
  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(
    req.user?.role as USER_ROLES,
  );

  const result = await BookingServices.getSingleBooking(
    bookingId,
    userId,
    isAdmin,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Booking retrieved successfully',
    data: result,
  });
});

export const BookingController = {
  getMyBookings,
  getSingleBooking,
};

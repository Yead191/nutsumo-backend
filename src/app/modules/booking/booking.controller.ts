import { Request, Response } from 'express';
import { BookingServices } from './booking.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { USER_ROLES } from '../../../enums/user';
import { getMultipleFilesPath } from '../../../shared/getFilePath';

// 1. Create Checkout Session for Escrow Payment
const createBookingCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const bookingId = req.params.id;
    const customerId = req.user?.id;

    const result = await BookingServices.createBookingCheckoutSession(
      bookingId,
      customerId,
    );

    return sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Booking checkout session created successfully',
      data: result,
    });
  },
);

// 2. Verify Booking Payment (Frontend redirect callback)
const verifyBookingPayment = catchAsync(async (req: Request, res: Response) => {
  const sessionId = req.query.session_id as string;
  const userId = req.user?.id;

  const result = await BookingServices.verifyBookingPayment(sessionId, userId);

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Booking payment verified successfully',
    data: result,
  });
});

// 3. Start Work (Artisan)
const startWork = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const artisanId = req.user?.id;

  const result = await BookingServices.startWork(bookingId, artisanId);

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Work on booking started successfully',
    data: result,
  });
});

// 4. Deliver Work (Artisan)
const deliverBooking = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const artisanId = req.user?.id;

  const files = req.files as any;
  const uploadedProof =
    getMultipleFilesPath(files, 'deliveryProof') ||
    getMultipleFilesPath(files, 'images') ||
    getMultipleFilesPath(files, 'image');

  const payload = {
    ...req.body,
    deliveryProof: uploadedProof?.length
      ? uploadedProof
      : req.body.deliveryProof || req.body.workImages || [],
  };

  const result = await BookingServices.deliverBooking(
    bookingId,
    artisanId,
    payload,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Work delivered successfully. Customer notified for review.',
    data: result,
  });
});

// 5. Request Revision (Customer)
const requestRevision = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const customerId = req.user?.id;

  const result = await BookingServices.requestRevision(
    bookingId,
    customerId,
    req.body,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Revision requested successfully. Artisan has been notified.',
    data: result,
  });
});

// 6. Dispute Booking (Customer / Artisan)
const disputeBooking = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const userId = req.user?.id;

  const result = await BookingServices.disputeBooking(
    bookingId,
    userId,
    req.body,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message:
      'Booking dispute submitted. Admin has been notified for investigation.',
    data: result,
  });
});

// 7. Confirm Completion (Customer)
const confirmBookingCompletion = catchAsync(
  async (req: Request, res: Response) => {
    const bookingId = req.params.id;
    const customerId = req.user?.id;

    const result = await BookingServices.confirmBookingCompletion(
      bookingId,
      customerId,
      req.body,
    );

    return sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message:
        'Booking completion confirmed successfully. Payout sent for admin approval.',
      data: result,
    });
  },
);

// 6. Approve Payout (Admin)
const approveBookingPayout = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const adminId = req.user?.id;

  const result = await BookingServices.approveBookingPayout(
    bookingId,
    adminId,
    req.body,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Booking payout approved successfully',
    data: result,
  });
});

// 7. Release Payout (Admin)
const releaseBookingPayout = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const adminId = req.user?.id;

  const result = await BookingServices.releaseBookingPayout(
    bookingId,
    adminId,
    req.body,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Booking payout released successfully',
    data: result,
  });
});

// 8. Get My Bookings (Customer / Artisan)
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

// 9. Get All Bookings (Admin)
const getAllBookingsAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await BookingServices.getAllBookingsAdmin(req.query);

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'All bookings fetched successfully',
    data: result.bookings,
    pagination: result.pagination,
  });
});

// 10. Get Single Booking
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
  createBookingCheckoutSession,
  verifyBookingPayment,
  startWork,
  deliverBooking,
  requestRevision,
  disputeBooking,
  confirmBookingCompletion,
  approveBookingPayout,
  releaseBookingPayout,
  getMyBookings,
  getAllBookingsAdmin,
  getSingleBooking,
};

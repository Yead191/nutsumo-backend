import { Request, Response } from 'express';
import { ReviewServices } from './review.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

// 1. Create Review (Customer)
const createReview = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  const result = await ReviewServices.createReview(customerId, req.body);

  return sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Review submitted successfully',
    data: result,
  });
});

// 2. Get Artisan Reviews (Public / Profile)
const getArtisanReviews = catchAsync(async (req: Request, res: Response) => {
  const artisanId = req.params.artisanId;
  const result = await ReviewServices.getArtisanReviews(artisanId, req.query);

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Artisan reviews retrieved successfully',
    data: {
      summary: result.summary,
      reviews: result.reviews,
    },
    pagination: result.pagination,
  });
});

// 3. Get Single Booking Review
const getBookingReview = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId;
  const result = await ReviewServices.getBookingReview(bookingId);

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Booking review retrieved successfully',
    data: result,
  });
});

// 4. Artisan Reply to Review
const replyToReview = catchAsync(async (req: Request, res: Response) => {
  const reviewId = req.params.id;
  const artisanId = req.user?.id;
  const { comment } = req.body;

  const result = await ReviewServices.replyToReview(
    reviewId,
    artisanId,
    comment,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Reply submitted successfully',
    data: result,
  });
});

// 5. Get My Reviews (Customer or Artisan)
const getMyReviews = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  const result = await ReviewServices.getMyReviews(userId, role, req.query);

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    data: result.reviews,
    pagination: result.pagination,
  });
});

// 6. Update Review (Customer)
const updateReview = catchAsync(async (req: Request, res: Response) => {
  const reviewId = req.params.id;
  const customerId = req.user?.id;
  const result = await ReviewServices.updateReview(
    reviewId,
    customerId,
    req.body,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Review updated successfully',
    data: result,
  });
});

const getAllReviewsAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewServices.getAllReviewsAdmin(req.query);

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    data: result.reviews,
    pagination: result.pagination,
  });
});

export const ReviewController = {
  createReview,
  getArtisanReviews,
  getBookingReview,
  replyToReview,
  getMyReviews,
  updateReview,
  getAllReviewsAdmin,
};

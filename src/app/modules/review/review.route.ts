import express from 'express';
import { ReviewController } from './review.controller';
import { ReviewValidation } from './review.validation';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';

const router = express.Router();

router
  .route('/admin/all')
  .get(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    ReviewController.getAllReviewsAdmin,
  );

// 1. Submit a Review (Customer only)
router
  .route('/')
  .post(
    auth(USER_ROLES.USER),
    validateRequest(ReviewValidation.createReviewValidationSchema),
    ReviewController.createReview,
  );

// 2. My Reviews (Customer reviews given, Artisan reviews received)
router
  .route('/my-reviews')
  .get(
    auth(USER_ROLES.USER, USER_ROLES.ARTISAN),
    ReviewController.getMyReviews,
  );

// 3. Get Reviews for an Artisan (Public / Profile Page)
router.route('/artisan/:artisanId').get(ReviewController.getArtisanReviews);

// 4. Get Review for a Specific Booking
router
  .route('/booking/:bookingId')
  .get(
    auth(
      USER_ROLES.USER,
      USER_ROLES.ARTISAN,
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.ADMIN,
    ),
    ReviewController.getBookingReview,
  );

// 5. Reply to a Review (Artisan only)
router
  .route('/:id/reply')
  .patch(
    auth(USER_ROLES.ARTISAN),
    validateRequest(ReviewValidation.replyReviewValidationSchema),
    ReviewController.replyToReview,
  );

// 6. Update a Review (Customer only)
router
  .route('/:id')
  .patch(
    auth(USER_ROLES.USER),
    validateRequest(ReviewValidation.updateReviewValidationSchema),
    ReviewController.updateReview,
  );

export const ReviewRoutes = router;

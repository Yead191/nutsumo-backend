import express from 'express';
import { BookingController } from './booking.controller';
import { BookingValidation } from './booking.validation';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { USER_ROLES } from '../../../enums/user';

const router = express.Router();

const parseFormData = (req: any, res: any, next: any) => {
  if (req.body?.data) {
    try {
      const parsed = JSON.parse(req.body.data);
      req.body = { ...parsed, ...req.body };
      delete req.body.data;
    } catch {
      // ignore JSON parse errors and allow request to proceed to validation
    }
  }
  next();
};

const deliveryFileUpload = fileUploadHandler([
  { name: 'deliveryProof', maxCount: 10 },
  { name: 'images', maxCount: 10 },
  { name: 'image', maxCount: 10 },
]);

// 1. My Bookings (Customer / Artisan)
router
  .route('/my-bookings')
  .get(
    auth(USER_ROLES.USER, USER_ROLES.ARTISAN),
    BookingController.getMyBookings,
  );

// 2. Admin All Bookings
router
  .route('/admin/all')
  .get(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    BookingController.getAllBookingsAdmin,
  );

// 3. Verify Payment Callback (Customer redirect from Stripe)
router
  .route('/verify-payment')
  .get(
    auth(
      USER_ROLES.USER,
      USER_ROLES.ARTISAN,
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.ADMIN,
    ),
    BookingController.verifyBookingPayment,
  );

// 4. Create Stripe Checkout Session (Customer)
router
  .route('/:id/checkout-session')
  .post(auth(USER_ROLES.USER), BookingController.createBookingCheckoutSession);

// 5. Start Work (Artisan)
router
  .route('/:id/start-work')
  .patch(auth(USER_ROLES.ARTISAN), BookingController.startWork);

// 6. Deliver Work (Artisan - Multipart Form-data or JSON)
router
  .route('/:id/deliver')
  .patch(
    auth(USER_ROLES.ARTISAN),
    deliveryFileUpload,
    parseFormData,
    validateRequest(BookingValidation.deliverBookingValidationSchema),
    BookingController.deliverBooking,
  );

// 7. Request Revision (Customer)
router
  .route('/:id/request-revision')
  .patch(
    auth(USER_ROLES.USER),
    validateRequest(BookingValidation.requestRevisionValidationSchema),
    BookingController.requestRevision,
  );

// 8. Dispute Booking (Customer / Artisan)
router
  .route('/:id/dispute')
  .patch(
    auth(USER_ROLES.USER, USER_ROLES.ARTISAN),
    validateRequest(BookingValidation.disputeBookingValidationSchema),
    BookingController.disputeBooking,
  );

// 9. Confirm Completion (Customer)
router
  .route('/:id/confirm-completion')
  .patch(
    auth(USER_ROLES.USER),
    validateRequest(BookingValidation.confirmCompletionValidationSchema),
    BookingController.confirmBookingCompletion,
  );

// 10. Approve Payout (Admin)
router
  .route('/:id/approve-payout')
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(BookingValidation.approvePayoutValidationSchema),
    BookingController.approveBookingPayout,
  );

// 11. Release Payout (Admin)
router
  .route('/:id/release-payout')
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(BookingValidation.releasePayoutValidationSchema),
    BookingController.releaseBookingPayout,
  );

// 12. Single Booking Details
router
  .route('/:id')
  .get(
    auth(
      USER_ROLES.USER,
      USER_ROLES.ARTISAN,
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.ADMIN,
    ),
    BookingController.getSingleBooking,
  );

export const BookingRoutes = router;

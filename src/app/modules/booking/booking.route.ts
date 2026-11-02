import express from 'express';
import { BookingController } from './booking.controller';
import { BookingValidation } from './booking.validation';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';

const router = express.Router();

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

// 6. Deliver Work (Artisan)
router
  .route('/:id/deliver')
  .patch(
    auth(USER_ROLES.ARTISAN),
    validateRequest(BookingValidation.deliverBookingValidationSchema),
    BookingController.deliverBooking,
  );

// 7. Confirm Completion (Customer)
router
  .route('/:id/confirm-completion')
  .patch(
    auth(USER_ROLES.USER),
    validateRequest(BookingValidation.confirmCompletionValidationSchema),
    BookingController.confirmBookingCompletion,
  );

// 8. Approve Payout (Admin)
router
  .route('/:id/approve-payout')
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(BookingValidation.approvePayoutValidationSchema),
    BookingController.approveBookingPayout,
  );

// 9. Release Payout (Admin)
router
  .route('/:id/release-payout')
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(BookingValidation.releasePayoutValidationSchema),
    BookingController.releaseBookingPayout,
  );

// 10. Single Booking Details
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

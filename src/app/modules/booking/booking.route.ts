import express from 'express';
import { BookingController } from './booking.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';

const router = express.Router();

router
  .route('/my-bookings')
  .get(
    auth(USER_ROLES.USER, USER_ROLES.ARTISAN),
    BookingController.getMyBookings,
  );

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

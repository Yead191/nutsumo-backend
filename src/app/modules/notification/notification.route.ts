import express from 'express';
import { NotificationController } from './notification.controller';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';

const router = express.Router();

router.route('/')
    .get(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.ARTISAN),
        NotificationController.getAllNotifications
    )
    .post(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
        NotificationController.createNotification
    )
    .patch(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.ARTISAN),
        NotificationController.readAllNotifications
    );

router.delete(
  '/clear-all',
  auth(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
    USER_ROLES.USER,
    USER_ROLES.ARTISAN,
  ),
  NotificationController.clearAllNotifications,
);

router.route('/:id')

    .get(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.ARTISAN),
        NotificationController.getSingleNotification
    )
    .patch(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.ARTISAN),
        NotificationController.readSingleNotification
    )
    .delete(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.ARTISAN),
        NotificationController.deleteNotification
    );

export const NotificationRoutes = router;

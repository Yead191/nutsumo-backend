import express from 'express';
import { LikeController } from './like.controller';
import auth from '../../../middlewares/auth';
import { USER_ROLES } from '../../../../enums/user';

const router = express.Router();

router
  .route('/my')
  .get(
    auth(
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.USER,
      USER_ROLES.VENDOR,
    ),
    LikeController.getMyLike,
  );

router
  .route('/:id')
  .post(
    auth(
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.USER,
      USER_ROLES.VENDOR,
    ),
    LikeController.toggleLikeToDB,
  )
  .get(LikeController.getAllLike);

export const LikeRoutes = router;

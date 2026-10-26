import express from 'express';
import { CommunityLikeController } from './communityLike.controller';
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
    CommunityLikeController.getMyLikes,
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
    CommunityLikeController.toggleLike,
  )
  .get(CommunityLikeController.getAllLikes);

export const CommunityLikeRoutes = router;

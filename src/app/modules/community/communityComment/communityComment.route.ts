import express from 'express';
import auth from '../../../middlewares/auth';
import optionalAuth from '../../../middlewares/optionalAuth';
import validateRequest from '../../../middlewares/validateRequest';
import { USER_ROLES } from '../../../../enums/user';
import { CommunityCommentValidations } from './communityComment.validation';
import { CommunityCommentController } from './communityComment.controller';

const router = express.Router();

const allAuthenticatedRoles = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
  USER_ROLES.USER,
];

router
  .route('/my-comments')
  .get(
    auth(...allAuthenticatedRoles),
    CommunityCommentController.getMyComments,
  );

// Reply to a comment
router.post(
  '/:id/reply',
  auth(...allAuthenticatedRoles),
  validateRequest(CommunityCommentValidations.replyCommentZodSchema),
  CommunityCommentController.replyToComment,
);

// Toggle like on a comment
router.post(
  '/:id/like',
  auth(...allAuthenticatedRoles),
  CommunityCommentController.toggleCommentLike,
);

// Get replies for a specific comment
router.get(
  '/:id/replies',
  optionalAuth,
  CommunityCommentController.getCommentReplies,
);

// Top-level post comments & comment modification
router
  .route('/:id')
  .post(
    auth(...allAuthenticatedRoles),
    validateRequest(CommunityCommentValidations.createCommentZodSchema),
    CommunityCommentController.createComment,
  )
  .patch(
    auth(...allAuthenticatedRoles),
    validateRequest(CommunityCommentValidations.updateCommentZodSchema),
    CommunityCommentController.updateComment,
  )
  .delete(
    auth(...allAuthenticatedRoles),
    CommunityCommentController.deleteComment,
  )
  .get(optionalAuth, CommunityCommentController.getPostComments);

export const CommunityCommentRoutes = router;

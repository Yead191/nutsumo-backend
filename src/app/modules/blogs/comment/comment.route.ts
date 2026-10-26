import express from 'express';
import auth from '../../../middlewares/auth';
import validateRequest from '../../../middlewares/validateRequest';
import { CommentValidations } from './comment.validation';
import { CommentController } from './comment.controller';
import { USER_ROLES } from '../../../../enums/user';

const router = express.Router();

router
  .route('/my-comments')
  .get(
    auth(
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.USER,
      USER_ROLES.ARTISAN,
    ),
    CommentController.getMyComments,
  );

router
  .route('/:id')
  .post(
    auth(
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.USER,
      USER_ROLES.ARTISAN,
    ),
    validateRequest(CommentValidations.createCommentZodSchema),
    CommentController.createCommentToDB,
  )
  .patch(
    auth(
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.USER,
      USER_ROLES.ARTISAN,
    ),
    validateRequest(CommentValidations.updateCommentZodSchema),
    CommentController.updateComment,
  )
  .delete(
    auth(
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.USER,
      USER_ROLES.ARTISAN,
    ),
    CommentController.deleteComment,
  )
  .get(CommentController.getAllCommentsByPost);

export const CommentRoutes = router;

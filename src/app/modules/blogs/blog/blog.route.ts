import express from 'express';
import { BlogController } from './blog.controller';
import auth from '../../../middlewares/auth';
import { USER_ROLES } from '../../../../enums/user';
import fileUploadHandler from '../../../middlewares/fileUploadHandler';
import tempAuth from '../../../middlewares/tempAuth';
import validateRequest from '../../../middlewares/validateRequest';
import { BlogValidations } from './blog.validation';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    validateRequest(BlogValidations.createBlogZod),
    BlogController.createBlog,
  )
  .get(tempAuth(), BlogController.getAllBlogs);

router.get(
  '/stats',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  BlogController.getBlogStats,
);

router.patch(
  '/status/:id',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  validateRequest(BlogValidations.updateBlogStatusZod),
  BlogController.updateBlogStatus,
);

router.patch(
  '/featured/:id',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  BlogController.toggleBlogFeatured,
);

router
  .route('/:id')
  .get(tempAuth(), BlogController.getSingleBlogFromDB)
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    validateRequest(BlogValidations.updateBlogZod),
    BlogController.updateBlog,
  )
  .delete(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    BlogController.deleteBlog,
  );

export const BlogRoutes = router;

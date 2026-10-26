import express from 'express';
import { BlogCategoryController } from './blogcategory.controller';
import auth from '../../../middlewares/auth';
import { USER_ROLES } from '../../../../enums/user';
import validateRequest from '../../../middlewares/validateRequest';
import { BlogCategoryValidations } from './blogcategory.validation';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(BlogCategoryValidations.createBlogCategoryZod),
    BlogCategoryController.createCategory,
  )
  .get(BlogCategoryController.getAllCategories);

router
  .route('/:id')
  .get(BlogCategoryController.getSingleCategory)
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(BlogCategoryValidations.updateBlogCategoryZod),
    BlogCategoryController.updateCategory,
  )
  .delete(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    BlogCategoryController.deleteCategory,
  );

export const BlogCategoryRoutes = router;

// Also export alias BlogcategoryRoutes
export const BlogcategoryRoutes = BlogCategoryRoutes;

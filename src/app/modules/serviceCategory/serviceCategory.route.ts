import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';
import { ServiceCategoryController } from './serviceCategory.controller';
import { ServiceCategoryValidation } from './serviceCategory.validation';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    validateRequest(ServiceCategoryValidation.createCategoryZodSchema),
    ServiceCategoryController.createCategory,
  )
  .get(ServiceCategoryController.getAllCategories);

router
  .route('/:id')
  .get(ServiceCategoryController.getSingleCategory)
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    validateRequest(ServiceCategoryValidation.updateCategoryZodSchema),
    ServiceCategoryController.updateCategory,
  )
  .delete(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    ServiceCategoryController.deleteCategory,
  );

export const ServiceCategoryRoutes = router;

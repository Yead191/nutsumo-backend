import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';
import { CategoryController } from './category.controller';
import { CategoryValidation } from './category.validation';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import tempAuth from '../../middlewares/tempAuth';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (req.body?.data) {
        try {
          const parsed = JSON.parse(req.body.data);
          req.body = { ...parsed, ...req.body };
          delete req.body.data;
        } catch (e) {
          // ignore
        }
      }
      next();
    },
    validateRequest(CategoryValidation.createCategoryZodSchema),
    CategoryController.createCategory,
  )
  .get(tempAuth(), CategoryController.getAllCategories);

router
  .route('/:id')
  .get(tempAuth(), CategoryController.getSingleCategory)
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (req.body?.data) {
        try {
          const parsed = JSON.parse(req.body.data);
          req.body = { ...parsed, ...req.body };
          delete req.body.data;
        } catch (e) {
          // ignore
        }
      }
      next();
    },
    validateRequest(CategoryValidation.updateCategoryZodSchema),
    CategoryController.updateCategory,
  )
  .delete(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    CategoryController.deleteCategory,
  );

export const CategoryRoutes = router;

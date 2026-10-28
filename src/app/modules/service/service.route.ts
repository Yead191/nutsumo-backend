import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';
import { ServiceController } from './service.controller';
import { ServiceValidation } from './service.validation';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import tempAuth from '../../middlewares/tempAuth';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
    validateRequest(ServiceValidation.createServiceZodSchema),
    ServiceController.createService,
  )
  .get(tempAuth(), ServiceController.getAllServices);

router
  .route('/:id')
  .get(tempAuth(), ServiceController.getSingleService)
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
    validateRequest(ServiceValidation.updateServiceZodSchema),
    ServiceController.updateService,
  )
  .delete(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    ServiceController.deleteService,
  );

export const ServiceRoutes = router;

import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';
import { JobAlertController } from './jobAlert.controller';
import { JobAlertValidation } from './jobAlert.validation';

const router = express.Router();

router
  .route('/')
  .get(auth(USER_ROLES.ARTISAN), JobAlertController.listMine)
  .post(
    auth(USER_ROLES.ARTISAN),
    validateRequest(JobAlertValidation.saveJobAlertZodSchema),
    JobAlertController.saveAlert,
  );

router
  .route('/:id')
  .delete(auth(USER_ROLES.ARTISAN), JobAlertController.removeAlert);

export const JobAlertRoutes = router;

import express from 'express';
import { DisclaimerController } from './disclaimer.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { DisclaimerValidations } from './disclaimer.validation';

const router = express.Router();

router
  .route('/')
  .get(DisclaimerController.getDisclaimer)
  .post(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(DisclaimerValidations.createDisclaimerZod),
    DisclaimerController.createDisclaimer,
  );

export const DisclaimerRoutes = router;

import express from 'express';
import { FaqController } from './faq.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { FaqValidations } from './faq.validation';
import tempAuth from '../../middlewares/tempAuth';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(FaqValidations.createFaq),
    FaqController.createFaq,
  )
  .get(tempAuth(), FaqController.getAllFaqs);

router
  .route('/:id')
  .get(tempAuth(), FaqController.getSingleFaq)
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(FaqValidations.updateFaq),
    FaqController.updateFaq,
  )
  .delete(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    FaqController.deleteFaq,
  );

export const FaqRoutes = router;

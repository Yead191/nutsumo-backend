import express from 'express';
import { InquiryController } from './inquiry.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { InquiryValidations } from './inquiry.validation';

const router = express.Router();

router
  .route('/')
  .post(InquiryController.createInquiry)
  .get(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    InquiryController.getInquiries,
  );

router
  .route('/:id')
  .get(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    InquiryController.getSingleInquiry,
  )
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(InquiryValidations.updateInquiryZod),
    InquiryController.updateInquiry,
  )
  .delete(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    InquiryController.deleteInquiry,
  );

export const InquiryRoutes = router;

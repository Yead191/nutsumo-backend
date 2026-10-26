import express from 'express';
import { TestimonialController } from './testimonial.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { TestimonialValidations } from './testimonial.validation';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    validateRequest(TestimonialValidations.createTestimonialZod),
    TestimonialController.createTestimonial,
  )
  .get(TestimonialController.getAllTestimonial);

router
  .route('/:id')
  .get(TestimonialController.getSingleTestimonial)
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    validateRequest(TestimonialValidations.updateTestimonialZod),
    TestimonialController.updateTestimonial,
  )
  .delete(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    TestimonialController.deleteTestimonial,
  );

export const TestimonialRoutes = router;

import express, { NextFunction, Request, Response } from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validation';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
const router = express.Router();

router.post(
  '/login',
  validateRequest(AuthValidation.createLoginZodSchema),
  AuthController.loginUser,
);

router.post(
  '/google-login',
  validateRequest(AuthValidation.googleLoginZodSchema),
  AuthController.loginWithGoogle,
);

router.post(
  '/forget-password',
  validateRequest(AuthValidation.createForgetPasswordZodSchema),
  AuthController.forgetPassword,
);

router.post(
  '/verify-email',
  validateRequest(AuthValidation.createVerifyEmailZodSchema),
  AuthController.verifyEmail,
);

router.post(
  '/reset-password',
  validateRequest(AuthValidation.createResetPasswordZodSchema),
  AuthController.resetPassword,
);

router.post(
  '/change-password',
  auth(),
  validateRequest(AuthValidation.createChangePasswordZodSchema),
  AuthController.changePassword,
);
// router.post('/register', validateRequest(AuthValidation.createRegisterZodSchema), AuthController.registerUser)
router.post(
  '/register',
  validateRequest(AuthValidation.createRegisterUserZodSchema),
  AuthController.registerUser,
);
router.post(
  '/register/vendor',
  fileUploadHandler(),
  validateRequest(AuthValidation.createRegisterVendorZodSchema),
  AuthController.registerVendor,
);

export const AuthRoutes = router;

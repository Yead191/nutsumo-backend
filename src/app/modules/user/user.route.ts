import express, { NextFunction, Request, Response } from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import validateRequest from '../../middlewares/validateRequest';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
const router = express.Router();

router
  .route('/profile')
  .get(auth(), UserController.getUserProfile)
  .patch(
    auth(),
    fileUploadHandler(),
    (req: Request, res: Response, next: NextFunction) => {
      if (req.body.data) {
        req.body = UserValidation.updateUserZodSchema.parse(
          JSON.parse(req.body.data),
        );
      }
      return UserController.updateProfile(req, res, next);
    },
  );

router
  .route('/')
  .post(
    validateRequest(UserValidation.createUserZodSchema),
    UserController.createUser,
  )
  .get(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    UserController.getAllUsers,
  );

router.get(
  '/stats',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  UserController.getUserStats,
);

router.delete(
  '/delete-multiple',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  validateRequest(UserValidation.deleteMultipleUsersSchema),
  UserController.deleteMultipleUsers,
);

router
  .route('/change-status/:id')
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(UserValidation.changeStatusZodSchema),
    UserController.changeStatusOfUser,
  );

router
  .route('/:id')
  .get(auth(), UserController.getSingleUser)
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(UserValidation.updateUserByAdminZodSchema),
    UserController.updateUserByAdmin,
  )
  .delete(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    UserController.deleteUser,
  );

router
  .route('/upload-file')
  .post(fileUploadHandler(), UserController.uploadFile);
export const UserRoutes = router;


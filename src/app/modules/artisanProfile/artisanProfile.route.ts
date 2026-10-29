import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ArtisanProfileController } from './artisanProfile.controller';
import { ArtisanProfileValidation } from './artisanProfile.validation';

const router = express.Router();

router
  .route('/my-profile')
  .get(
    auth(USER_ROLES.ARTISAN, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    ArtisanProfileController.getMyArtisanProfile,
  )
  .patch(
    auth(USER_ROLES.ARTISAN, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(ArtisanProfileValidation.updateArtisanProfileZodSchema),
    ArtisanProfileController.upsertMyArtisanProfile,
  );

router
  .route('/user/:userId')
  .get(ArtisanProfileController.getArtisanProfileByUserId);

router
  .route('/')
  .get(ArtisanProfileController.getAllArtisanProfiles)
  .post(
    auth(USER_ROLES.ARTISAN, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(ArtisanProfileValidation.createArtisanProfileZodSchema),
    ArtisanProfileController.upsertMyArtisanProfile,
  );

router
  .route('/:id')
  .get(ArtisanProfileController.getArtisanProfileById)
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(ArtisanProfileValidation.updateArtisanProfileZodSchema),
    ArtisanProfileController.updateArtisanProfileByAdmin,
  )
  .delete(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    ArtisanProfileController.deleteArtisanProfile,
  );

export const ArtisanProfileRoutes = router;

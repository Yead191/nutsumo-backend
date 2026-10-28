import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';
import { ArtisanServiceController } from './artisanService.controller';
import { ArtisanServiceValidation } from './artisanService.validation';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.ARTISAN),
    validateRequest(ArtisanServiceValidation.createArtisanServiceZodSchema),
    ArtisanServiceController.createArtisanService,
  )
  .get(ArtisanServiceController.getAllArtisanServices);

router
  .route('/my-services')
  .get(
    auth(USER_ROLES.ARTISAN, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    ArtisanServiceController.getMyServices,
  );

router
  .route('/artisan/:artisanId')
  .get(ArtisanServiceController.getArtisanServices);

router
  .route('/:id')
  .get(ArtisanServiceController.getSingleArtisanService)
  .patch(
    auth(USER_ROLES.ARTISAN, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(ArtisanServiceValidation.updateArtisanServiceZodSchema),
    ArtisanServiceController.updateArtisanService,
  )
  .delete(
    auth(USER_ROLES.ARTISAN, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    ArtisanServiceController.deleteArtisanService,
  );

export const ArtisanServiceRoutes = router;

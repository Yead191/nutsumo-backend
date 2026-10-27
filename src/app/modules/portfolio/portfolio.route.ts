import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';
import { PortfolioController } from './portfolio.controller';
import { PortfolioValidation } from './portfolio.validation';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.ARTISAN, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(PortfolioValidation.createPortfolioZodSchema),
    PortfolioController.createPortfolioItem,
  );

router
  .route('/my-portfolio')
  .get(
    auth(USER_ROLES.ARTISAN, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    PortfolioController.getMyPortfolio,
  );

router.route('/artisan/:artisanId').get(PortfolioController.getArtisanPortfolio);

router
  .route('/:id')
  .get(PortfolioController.getSinglePortfolioItem)
  .patch(
    auth(USER_ROLES.ARTISAN, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(PortfolioValidation.updatePortfolioZodSchema),
    PortfolioController.updatePortfolioItem,
  )
  .delete(
    auth(USER_ROLES.ARTISAN, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    PortfolioController.deletePortfolioItem,
  );

export const PortfolioRoutes = router;

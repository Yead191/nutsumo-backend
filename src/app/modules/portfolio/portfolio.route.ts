import express, { NextFunction, Request, Response } from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import validateRequest from '../../middlewares/validateRequest';
import { PortfolioController } from './portfolio.controller';
import { PortfolioValidation } from './portfolio.validation';

const router = express.Router();

const portfolioUploadFields = [
  { name: 'image', maxCount: 10 },
  { name: 'images', maxCount: 10 },
  { name: 'beforeImage', maxCount: 5 },
  { name: 'beforeImages', maxCount: 5 },
  { name: 'afterImage', maxCount: 5 },
  { name: 'afterImages', maxCount: 5 },
  { name: 'workImage', maxCount: 10 },
  { name: 'workImages', maxCount: 10 },
];

const parseFormData = (req: Request, res: Response, next: NextFunction) => {
  if (req.body?.data) {
    try {
      const parsed = JSON.parse(req.body.data);
      req.body = { ...parsed, ...req.body };
      delete req.body.data;
    } catch {
      // ignore
    }
  }
  next();
};

router
  .route('/')
  .post(
    auth(USER_ROLES.ARTISAN, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(portfolioUploadFields),
    parseFormData,
    validateRequest(PortfolioValidation.createPortfolioZodSchema),
    PortfolioController.createPortfolioItem,
  );

router
  .route('/my-portfolio')
  .get(
    auth(USER_ROLES.ARTISAN, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    PortfolioController.getMyPortfolio,
  );

router
  .route('/artisan/:artisanId')
  .get(PortfolioController.getArtisanPortfolio);

router
  .route('/:id')
  .get(PortfolioController.getSinglePortfolioItem)
  .patch(
    auth(USER_ROLES.ARTISAN, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(portfolioUploadFields),
    parseFormData,
    validateRequest(PortfolioValidation.updatePortfolioZodSchema),
    PortfolioController.updatePortfolioItem,
  )
  .delete(
    auth(USER_ROLES.ARTISAN, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    PortfolioController.deletePortfolioItem,
  );

export const PortfolioRoutes = router;

import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';
import { WalletController } from './wallet.controller';
import { WalletValidation } from './wallet.validation';

const router = express.Router();

router
  .route('/dashboard')
  .get(auth(USER_ROLES.ARTISAN), WalletController.getDashboard);

router
  .route('/withdrawals')
  .get(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    WalletController.listWithdrawals,
  );

router
  .route('/withdrawals/:id/settle')
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    validateRequest(WalletValidation.settleWithdrawalZodSchema),
    WalletController.settleWithdrawal,
  );

router
  .route('/stripe/connect')
  .post(auth(USER_ROLES.ARTISAN), WalletController.openStripe);

router
  .route('/stripe/sync')
  .post(auth(USER_ROLES.ARTISAN), WalletController.syncStripe);

router
  .route('/destination')
  .put(
    auth(USER_ROLES.ARTISAN),
    validateRequest(WalletValidation.saveDestinationZodSchema),
    WalletController.saveDestination,
  );

router
  .route('/withdraw')
  .post(
    auth(USER_ROLES.ARTISAN),
    validateRequest(WalletValidation.withdrawZodSchema),
    WalletController.withdraw,
  );

router.route('/').get(auth(USER_ROLES.ARTISAN), WalletController.getMine);

export const WalletRoutes = router;

import express from 'express';
import { TransactionController } from './transaction.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { TransactionValidations } from './transaction.validation';

const router = express.Router();

router.route('/').get(auth(), TransactionController.getTransactions);

router.get(
  '/stats',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  TransactionController.getTransactionStats,
);

router.delete(
  '/delete-multiple',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  validateRequest(TransactionValidations.deleteMultipleTransactionsSchema),
  TransactionController.deleteMultipleTransactions,
);

router
  .route('/:id')
  .get(auth(), TransactionController.getSingleTransaction)
  .delete(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    TransactionController.deleteTransaction,
  );

export const TransactionRoutes = router;

import express from 'express';
import { QuotationController } from './quotation.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { QuotationValidations } from './quotation.validation';

const router = express.Router();

// 1. Submit quotation (Artisan only)
router
  .route('/')
  .post(
    auth(USER_ROLES.ARTISAN),
    validateRequest(QuotationValidations.createQuotationValidationSchema),
    QuotationController.submitQuotation,
  );

// 2. Get artisan's own quotations
router
  .route('/my-quotations')
  .get(
    auth(USER_ROLES.ARTISAN),
    validateRequest(QuotationValidations.getQuotationsQuerySchema),
    QuotationController.getMyQuotations,
  );

// 3. Get all quotations for a specific job (Job owner or Admin)
router
  .route('/job/:jobId')
  .get(
    auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(QuotationValidations.jobIdParamValidationSchema),
    QuotationController.getJobQuotations,
  );

// 4. Accept quotation (Job owner only)
router
  .route('/:id/accept')
  .patch(
    auth(USER_ROLES.USER),
    validateRequest(QuotationValidations.quotationIdValidationSchema),
    QuotationController.acceptQuotation,
  );

// 5. Reject quotation (Job owner only)
router
  .route('/:id/reject')
  .patch(
    auth(USER_ROLES.USER),
    validateRequest(QuotationValidations.quotationIdValidationSchema),
    validateRequest(QuotationValidations.rejectQuotationValidationSchema),
    QuotationController.rejectQuotation,
  );

// 6. Withdraw quotation (Artisan only)
router
  .route('/:id/withdraw')
  .patch(
    auth(USER_ROLES.ARTISAN),
    validateRequest(QuotationValidations.quotationIdValidationSchema),
    QuotationController.withdrawQuotation,
  );

// 7. Get single quotation & update pending quotation
router
  .route('/:id')
  .get(
    auth(
      USER_ROLES.USER,
      USER_ROLES.ARTISAN,
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.ADMIN,
    ),
    validateRequest(QuotationValidations.quotationIdValidationSchema),
    QuotationController.getSingleQuotation,
  )
  .patch(
    auth(USER_ROLES.ARTISAN),
    validateRequest(QuotationValidations.quotationIdValidationSchema),
    validateRequest(QuotationValidations.updateQuotationValidationSchema),
    QuotationController.updateQuotation,
  );

export const QuotationRoutes = router;

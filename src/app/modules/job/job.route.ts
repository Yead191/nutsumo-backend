import express from 'express';
import { JobController } from './job.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import validateRequest from '../../middlewares/validateRequest';
import { JobValidations } from './job.validation';
import tempAuth from '../../middlewares/tempAuth';

const router = express.Router();

// Helper middleware to unpack multipart JSON payload under `data`
const parseFormData = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (req.body?.data) {
    try {
      const parsed = JSON.parse(req.body.data);
      req.body = { ...parsed, ...req.body };
      delete req.body.data;
    } catch {
      // ignore JSON parse errors and allow request to proceed to validation
    }
  }
  next();
};

const jobFileUpload = fileUploadHandler([
  { name: 'image', maxCount: 10 },
  { name: 'images', maxCount: 10 },
]);

router
  .route('/')
  .post(
    auth(USER_ROLES.USER),
    jobFileUpload,
    parseFormData,
    validateRequest(JobValidations.createJobValidationSchema),
    JobController.createJob,
  )
  .get(tempAuth(), JobController.getAllJobs);

router.route('/my-jobs').get(auth(USER_ROLES.USER), JobController.getMyJobs);

// Cancel routes (supporting both /:id/cancel and /cancel/:id)
router
  .route('/:id/cancel')
  .patch(
    auth(USER_ROLES.USER),
    validateRequest(JobValidations.jobIdValidationSchema),
    JobController.cancelJob,
  );

router
  .route('/cancel/:id')
  .patch(
    auth(USER_ROLES.USER),
    validateRequest(JobValidations.jobIdValidationSchema),
    JobController.cancelJob,
  );

router
  .route('/:id')
  .get(
    tempAuth(),
    validateRequest(JobValidations.jobIdValidationSchema),
    JobController.getSingleJob,
  )
  .patch(
    auth(USER_ROLES.USER),
    jobFileUpload,
    parseFormData,
    validateRequest(JobValidations.updateJobValidationSchema),
    JobController.updateJob,
  );

export const JobRoutes = router;

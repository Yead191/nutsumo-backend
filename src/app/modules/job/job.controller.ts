import { Request, Response } from 'express';
import { JobServices } from './job.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { getMultipleFilesPath } from '../../../shared/getFilePath';
import { USER_ROLES } from '../../../enums/user';

// Create a new job
const createJob = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  let data = req.body;
  const images = getMultipleFilesPath(req.files, 'images');

  if (images && images.length > 0) {
    data.images = images;
  }

  const result = await JobServices.createJob(customerId, data);

  return sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Job created successfully',
    data: result,
  });
});

// Get all jobs created by the authenticated customer
const getMyJobs = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  const data = await JobServices.getMyJobs(customerId, req.query);

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Jobs fetched successfully',
    data: data.jobs,
    pagination: data.pagination,
  });
});

// Get all jobs (supports search, category, status, pagination)
const getAllJobs = catchAsync(async (req: Request, res: Response) => {
  const data = await JobServices.getAllJobs(req.user!, req.query);

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Jobs fetched successfully',
    data: data.jobs,
    pagination: data.pagination,
  });
});

// Get a single job by ID
const getSingleJob = catchAsync(async (req: Request, res: Response) => {
  const jobId = (req.params.id || req.params.jobId) as string;
  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(
    req.user?.role as USER_ROLES,
  );

  const result = await JobServices.getSingleJob(jobId, req.user?.id, isAdmin);

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Job retrieved successfully',
    data: result,
  });
});

// Update an open job
const updateJob = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  const jobId = (req.params.id || req.params.jobId) as string;
  let data = req.body;

  if (req.body?.data && typeof req.body.data === 'string') {
    try {
      data = JSON.parse(req.body.data);
    } catch {
      // fallback to req.body
    }
  }

  const images =
    getMultipleFilesPath(req.files, 'image') ||
    getMultipleFilesPath(req.files, 'images');

  if (images && images.length > 0) {
    data.images = images;
  }

  const result = await JobServices.updateJob(jobId, customerId, data);

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Job updated successfully',
    data: result,
  });
});

// Cancel an open job
const cancelJob = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  const jobId = (req.params.id || req.params.jobId) as string;

  const result = await JobServices.cancelJob(jobId, customerId);

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Job cancelled successfully',
    data: result,
  });
});

export const JobController = {
  createJob,
  getMyJobs,
  getAllJobs,
  getSingleJob,
  updateJob,
  cancelJob,
};

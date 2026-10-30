import { FilterQuery, Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';

import ApiError from '../../../errors/ApiError';

import { Job } from './job.model';
import { IJob, JobStatus } from './job.interface';
import {
  getActiveCustomer,
  JOB_STATUSES,
  validateCatalogSelection,
  validateObjectId,
} from './job.constants';
import QueryBuilder from '../../builder/QueryBuilder';
import unlinkFile from '../../../shared/unlinkFile';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import { publishJobCreatedEvent } from '../job-matching/jobMatching.producer';

interface IJobFilters {
  status?: JobStatus;
  category?: string;
  service?: string;
  searchTerm?: string;
}

interface IPagination {
  page?: number;
  limit?: number;
}

// CREATE JOB
const createJob = async (customerId: string, payload: Partial<IJob>) => {
  try {
    await getActiveCustomer(customerId);
    console.log(payload);

    if (payload.preferredDate) {
      const preferredDate = new Date(payload.preferredDate);

      if (Number.isNaN(preferredDate.getTime())) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid preferred date');
      }

      if (preferredDate.getTime() < Date.now()) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Preferred date cannot be in the past',
        );
      }
    }

    const catalog = await validateCatalogSelection(
      payload.category?.toString(),
      payload.service?.toString(),
    );

    const jobData = {
      customer: new Types.ObjectId(customerId),
      title: payload.title,
      description: payload.description,
      location: payload.location,
      category: catalog.category,
      service: catalog.service,
      customServiceName: payload.customServiceName?.trim() || '',
      budget: Number(payload.budget) ?? null,
      preferredDate: payload.preferredDate ?? null,
      status: JOB_STATUSES.OPEN,
      images: payload.images ?? [],
      postCode: payload.postCode ?? '',
    };

    const job = await Job.create(jobData);

    // Asynchronously publish job created event to Kafka (Non-blocking)
    await publishJobCreatedEvent({
      jobId: String(job._id),
      jobTitle: job.title,
    });

    return job;

  } catch (error) {
    if (payload.images && payload.images.length > 0) {
      for (const img of payload.images) {
        if (img && !img.startsWith('http')) {
          try {
            unlinkFile(img);
          } catch {
            // ignore unlink error
          }
        }
      }
    }
    throw error;
  }
};

// GET MY JOBS
const getMyJobs = async (customerId: string, query: Record<string, any>) => {
  await getActiveCustomer(customerId);
  const qb = new QueryBuilder(
    Job.find({ customer: customerId }).populate([
      {
        path: 'category',
        select: 'name',
      },
      {
        path: 'service',
        select: 'name slug category',
      },
      {
        path: 'customer',
        select: 'name image',
      },
    ]),
    query,
  )
    .search(['title'])
    .filter()
    .fields()
    .sort()
    .paginate();

  const [jobs, pagination] = await Promise.all([
    qb.modelQuery.lean().exec(),
    qb.getPaginationInfo(),
  ]);

  return { jobs, pagination };
};

// GET ALL PUBLIC JOBS
const getAllJobs = async (user: JwtPayload, query: Record<string, any>) => {
  const initQuery = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(
    user.role,
  )
    ? {}
    : {
      status: JOB_STATUSES.OPEN,
    };

  const qb = new QueryBuilder(
    Job.find(initQuery).populate([
      {
        path: 'category',
        select: 'name',
      },
      {
        path: 'service',
        select: 'name slug category',
      },
      {
        path: 'customer',
        select: 'name image',
      },
    ]),
    query,
  )
    .search(['title'])
    .filter()
    .fields()
    .sort()
    .paginate();

  const [jobs, pagination] = await Promise.all([
    qb.modelQuery.lean().exec(),
    qb.getPaginationInfo(),
  ]);

  return { jobs, pagination };
};

// GET SINGLE JOB
const getSingleJob = async (
  jobId: string,
  requesterId?: string,
  isAdmin = false,
) => {
  validateObjectId(jobId, 'job ID');

  const job = await Job.findById(jobId)
    .populate('category', 'name slug')
    .populate('service', 'name slug category')
    .populate('customer', 'name image')
    .lean();

  if (!job) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Job not found');
  }

  const isOwner =
    requesterId && job.customer._id.toString() === requesterId.toString();

  // Hide non-open jobs from unrelated public visitors.
  if (job.status !== JOB_STATUSES.OPEN && !isOwner && !isAdmin) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Job not found');
  }

  return job;
};

// UPDATE JOB
const updateJob = async (
  jobId: string,
  customerId: string,
  payload: Partial<IJob>,
) => {
  validateObjectId(jobId, 'job ID');
  await getActiveCustomer(customerId);

  const job = await Job.findById(jobId);

  if (!job) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Job not found');
  }

  if (job.customer.toString() !== customerId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You cannot update another customer’s job',
    );
  }

  if (job.status !== JOB_STATUSES.OPEN) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only open jobs can be updated',
    );
  }

  try {
    if (payload.preferredDate) {
      const preferredDate = new Date(payload.preferredDate);

      if (Number.isNaN(preferredDate.getTime())) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid preferred date');
      }

      if (preferredDate.getTime() < Date.now()) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Preferred date cannot be in the past',
        );
      }
    }

    const categoryChanged = payload.category !== undefined;
    const serviceChanged = payload.service !== undefined;

    let catalog: {
      category: string | null;
      service: string | null;
    } = {
      category: job.category ? job.category.toString() : null,
      service: job.service ? job.service.toString() : null,
    };

    if (categoryChanged || serviceChanged) {
      const categoryId = categoryChanged
        ? (payload.category as string | null)?.toString() || null
        : job.category?.toString() || null;

      const serviceId = serviceChanged
        ? (payload.service as string | null)?.toString() || null
        : job.service?.toString() || null;

      catalog = await validateCatalogSelection(categoryId, serviceId);
    }

    const updateData: Record<string, any> = {};

    if (payload.title !== undefined) updateData.title = payload.title.trim();
    if (payload.description !== undefined)
      updateData.description = payload.description.trim();
    if (payload.location !== undefined)
      updateData.location = payload.location.trim();
    if (payload.postCode !== undefined)
      updateData.postCode = payload.postCode.trim();
    if (categoryChanged || serviceChanged) {
      updateData.category = catalog.category;
      updateData.service = catalog.service;
    }
    if (payload.customServiceName !== undefined) {
      updateData.customServiceName = payload.customServiceName.trim();
    }
    if (payload.budget !== undefined) {
      updateData.budget =
        payload.budget !== null ? Number(payload.budget) : null;
    }
    if (payload.preferredDate !== undefined) {
      updateData.preferredDate = payload.preferredDate ?? null;
    }
    if (payload.images && payload.images.length > 0) {
      updateData.images = payload.images;

      // Clean up old replaced images
      if (job.images && job.images.length > 0) {
        for (const oldImg of job.images) {
          if (
            oldImg &&
            !payload.images.includes(oldImg) &&
            !oldImg.startsWith('http')
          ) {
            try {
              unlinkFile(oldImg);
            } catch {
              // ignore unlink error
            }
          }
        }
      }
    }

    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate('category', 'name slug')
      .populate('service', 'name slug category')
      .populate('customer', 'name image');

    return updatedJob;
  } catch (error) {
    if (payload.images && payload.images.length > 0) {
      for (const img of payload.images) {
        if (img && !img.startsWith('http')) {
          try {
            unlinkFile(img);
          } catch {
            // ignore unlink error
          }
        }
      }
    }
    throw error;
  }
};

// CANCEL JOB
const cancelJob = async (jobId: string, customerId: string) => {
  validateObjectId(jobId, 'job ID');
  await getActiveCustomer(customerId);

  const job = await Job.findById(jobId);

  if (!job) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Job not found');
  }

  if (job.customer.toString() !== customerId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You cannot cancel another customer’s job',
    );
  }

  if (job.status !== JOB_STATUSES.OPEN) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only open jobs can be cancelled at this stage',
    );
  }

  job.status = JOB_STATUSES.CANCELLED;
  await job.save();

  return job;
};

export const JobServices = {
  createJob,
  getMyJobs,
  getAllJobs,
  getSingleJob,
  updateJob,
  cancelJob,
};

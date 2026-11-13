import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Job } from '../job/job.model';
import { Category } from '../category/category.model';
import { JOB_STATUSES } from '../job/job.constants';
import { Service } from '../service/service.model';
import { ArtisanService } from '../artisanService/artisanService.model';
import { ArtisanProfile } from '../artisanProfile/artisanProfile.model';
import { IJobMatch, IJobMatchingJobData } from './jobmatching.interface';
import { NotificationServices } from '../notification/notification.service';
import { logger } from '../../../shared/logger';
import {
  nameMatchScore,
  NAME_MATCH_THRESHOLD,
  tokenRegex,
} from '../artisanService/serviceMatch';

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? '';

const getJobMatches = async (jobId: string): Promise<IJobMatch[]> => {
  if (!Types.ObjectId.isValid(jobId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid job ID');
  }

  const job = await Job.findById(jobId)
    .populate('service', 'name category isActive')
    .lean();

  if (!job) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Job not found');
  }

  if (job.status !== JOB_STATUSES.OPEN) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Matching is only available for open jobs',
    );
  }

  const rawService = job.service as
    | Types.ObjectId
    | { _id: Types.ObjectId; name?: string; category?: Types.ObjectId }
    | null;
  const populatedService =
    rawService && typeof rawService === 'object' && 'name' in rawService
      ? rawService
      : null;
  const catalogServiceId =
    populatedService?._id ||
    (!populatedService && rawService ? (rawService as Types.ObjectId) : null);
  const categoryId =
    (job.category as Types.ObjectId | null) || populatedService?.category || null;
  const specificText =
    job.customServiceName?.trim() || populatedService?.name?.trim() || '';
  const nameQueryText = specificText || job.title?.trim() || '';
  const broadCategoryMatch = !specificText && Boolean(categoryId);
  const categoryDoc = categoryId
    ? await Category.findById(categoryId).select('name').lean()
    : null;
  const categoryLabel = categoryDoc?.name || '';

  if (!catalogServiceId && !categoryId && !tokenRegex(nameQueryText)) {
    return [];
  }

  const offeringFilter: Record<string, unknown> = {
    isActive: true,
    reviewStatus: { $ne: 'REJECTED' },
  };

  if (broadCategoryMatch && categoryId) {
    const categoryServices = await Service.find({
      category: categoryId,
      isActive: true,
    })
      .select('_id')
      .lean();
    const nameRegex = tokenRegex(nameQueryText);
    offeringFilter.$or = [
      { category: categoryId },
      ...(categoryServices.length
        ? [{ service: { $in: categoryServices.map(item => item._id) } }]
        : []),
      ...(nameRegex
        ? [
            { source: 'CUSTOM', category: null, customName: nameRegex },
            { source: 'CUSTOM', category: null, proposedCategory: nameRegex },
          ]
        : []),
    ];
  } else {
    const or: Record<string, unknown>[] = [];
    if (catalogServiceId && !job.customServiceName?.trim()) {
      or.push({ service: catalogServiceId });
    }
    const regex = tokenRegex(nameQueryText);
    if (regex) {
      or.push({ source: 'CUSTOM', customName: regex });
      or.push({ source: 'CUSTOM', proposedCategory: regex });
      if (categoryId) {
        const namedServices = await Service.find({
          category: categoryId,
          isActive: true,
          name: regex,
        })
          .select('_id')
          .limit(50)
          .lean();
        if (namedServices.length) {
          or.push({ service: { $in: namedServices.map(item => item._id) } });
        }
      }
    }
    if (!or.length) return [];
    offeringFilter.$or = or;
  }

  const artisanServices = await ArtisanService.find(offeringFilter)
    .select(
      '_id artisan service category customName proposedCategory source rateAmount rateType',
    )
    .populate('service', 'name')
    .limit(400)
    .lean();

  if (!artisanServices.length) {
    return [];
  }

  const artisanIds = [
    ...new Set(artisanServices.map(item => String(item.artisan))),
  ];

  // Profile uses "user" as the artisan reference.
  const profiles = await ArtisanProfile.find({
    user: {
      $in: artisanIds.map(id => new Types.ObjectId(id)),
    },
    availabilityStatus: 'Available',
    isProfilePublic: true,
  })
    .select('user postCode location')
    .lean();

  const profileMap = new Map(
    profiles.map(profile => [String(profile.user), profile]),
  );

  const jobPostCode = normalize(job.postCode);
  const jobLocation = normalize(job.location);

  const hasLocationConstraint = Boolean(jobPostCode || jobLocation);

  const matches = artisanServices.flatMap(item => {
    const profile = profileMap.get(String(item.artisan));

    if (!profile) {
      return [];
    }

    const artisanPostCode = normalize(profile.postCode);
    const artisanLocation = normalize(profile.location);

    const postcodeMatches =
      Boolean(jobPostCode) &&
      Boolean(artisanPostCode) &&
      jobPostCode === artisanPostCode;

    const locationMatches =
      Boolean(jobLocation) &&
      Boolean(artisanLocation) &&
      jobLocation === artisanLocation;

    // When location data exists, require at least one exact match.
    if (hasLocationConstraint && !postcodeMatches && !locationMatches) {
      return [];
    }

    const serviceRef = item.service as
      | Types.ObjectId
      | { _id: Types.ObjectId; name?: string }
      | null;
    const serviceId =
      serviceRef && typeof serviceRef === 'object' && '_id' in serviceRef
        ? serviceRef._id
        : (serviceRef as Types.ObjectId | null);
    const offeringName =
      item.customName ||
      (serviceRef && typeof serviceRef === 'object' && 'name' in serviceRef
        ? serviceRef.name
        : '');

    const exactCatalogMatch =
      Boolean(catalogServiceId) &&
      Boolean(serviceId) &&
      String(serviceId) === String(catalogServiceId) &&
      !job.customServiceName?.trim();

    const matchReason: string[] = [];
    let matchScore = 0;

    const uncategorized = item.source === 'CUSTOM' && !item.category;

    if (exactCatalogMatch) {
      matchScore = 80;
      matchReason.push('SERVICE_MATCH');
    } else if (broadCategoryMatch && !uncategorized) {
      matchScore = 40;
      matchReason.push('CATEGORY_MATCH');
    } else {
      const similarity = Math.max(
        nameMatchScore(nameQueryText, offeringName),
        nameMatchScore(nameQueryText, item.proposedCategory),
        nameMatchScore(categoryLabel, item.proposedCategory),
      );
      if (similarity < NAME_MATCH_THRESHOLD) {
        return [];
      }
      matchScore = Math.round(40 + similarity * 40);
      matchReason.push(
        item.source === 'CUSTOM' ? 'CUSTOM_SERVICE_MATCH' : 'SERVICE_NAME_MATCH',
      );
    }

    if (postcodeMatches) {
      matchScore += 50;
      matchReason.push('POSTCODE_MATCH');
    }

    if (locationMatches) {
      matchScore += 25;
      matchReason.push('LOCATION_MATCH');
    }

    return [
      {
        artisan: item.artisan as Types.ObjectId,
        artisanService: item._id as Types.ObjectId,
        service: serviceId,
        rateAmount: item.rateAmount,
        rateType: item.rateType,
        matchScore,
        matchReason,
      },
    ];
  });

  // Keep the highest-scoring service match for each artisan.
  const uniqueMatches = new Map<string, IJobMatch>();

  for (const match of matches) {
    const artisanId = String(match.artisan);
    const existing = uniqueMatches.get(artisanId);

    if (!existing || match.matchScore > existing.matchScore) {
      uniqueMatches.set(artisanId, match);
    }
  }

  return [...uniqueMatches.values()].sort(
    (a, b) => b.matchScore - a.matchScore,
  );
};

/**
 * Executes matching for a given job and sends batch notifications + socket events.
 */
const executeJobMatchingAndNotification = async (data: IJobMatchingJobData) => {
  const { jobId, jobTitle } = data;
  const startTime = Date.now();

  logger.info(`[JobMatching] Finding matches for Job: ${jobId}`);

  const matches = await getJobMatches(jobId);

  if (!matches || matches.length === 0) {
    logger.info(`[JobMatching] No matching artisans found for Job: ${jobId}`);
    return { jobId, matchedCount: 0, notificationsSent: 0 };
  }

  logger.info(
    `[JobMatching] Found ${matches.length} matching artisans for Job: ${jobId}`,
  );

  const notifications = matches.map(match => ({
    receiver: match.artisan,
    title: 'New job available',
    message: `A customer posted "${jobTitle || 'a new job'}" and it matches a service you offer.`,
    refId: new Types.ObjectId(jobId),
    path: `/pro/jobs/${jobId}`,
    seen: false,
  }));

  const createdNotifications =
    await NotificationServices.createBulkNotifications(notifications);

  const durationMs = Date.now() - startTime;
  logger.info(
    `[JobMatching] Delivered ${createdNotifications.length} notifications for Job: ${jobId} in ${durationMs}ms`,
  );

  return {
    jobId,
    matchedCount: matches.length,
    notificationsSent: createdNotifications.length,
    durationMs,
  };
};

export const JobMatchingServices = {
  getJobMatches,
  executeJobMatchingAndNotification,
};

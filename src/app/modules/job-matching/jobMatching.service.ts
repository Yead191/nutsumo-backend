import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Job } from '../job/job.model';
import { JOB_STATUSES } from '../job/job.constants';
import { Service } from '../service/service.model';
import { ArtisanService } from '../artisanService/artisanService.model';
import { ArtisanProfile } from '../artisanProfile/artisanProfile.model';

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? '';

const getJobMatches = async (jobId: string) => {
  if (!Types.ObjectId.isValid(jobId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid job ID');
  }

  const job = await Job.findById(jobId).lean();

  if (!job) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Job not found');
  }

  if (job.status !== JOB_STATUSES.OPEN) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Matching is only available for open jobs',
    );
  }

  // Find active services that match the job.
  let serviceIds: Types.ObjectId[] = [];

  if (job.service) {
    const service = await Service.findOne({
      _id: job.service,
      isActive: true,
    }).select('_id');

    if (service) {
      serviceIds = [service._id];
    }
  } else if (job.category) {
    const services = await Service.find({
      category: job.category,
      isActive: true,
    }).select('_id');

    serviceIds = services.map(service => service._id);
  }

  // Custom jobs without a catalog service/category have no
  // catalog-based match in this version.
  if (!serviceIds.length) {
    return [];
  }

  // Find active artisan service selections.
  const artisanServices = await ArtisanService.find({
    service: { $in: serviceIds },
    isActive: true,
  })
    .select('_id artisan service rateAmount rateType')
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

    const matchReason: string[] = ['SERVICE_MATCH'];
    let matchScore = 50;

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
        artisan: item.artisan,
        artisanService: item._id,
        service: item.service,
        rateAmount: item.rateAmount,
        rateType: item.rateType,
        matchScore,
        matchReason,
      },
    ];
  });

  // Keep the highest-scoring service match for each artisan.
  const uniqueMatches = new Map<string, (typeof matches)[number]>();

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

export const JobMatchingServices = {
  getJobMatches,
};

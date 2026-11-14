import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { redisClient } from '../../../config/redis';
import { logger } from '../../../shared/logger';
import { distanceKm, isCoord } from '../../../shared/geo';
import { nameMatchScore, NAME_MATCH_THRESHOLD } from '../artisanService/serviceMatch';
import { ArtisanProfile } from '../artisanProfile/artisanProfile.model';
import { Job } from '../job/job.model';
import { Category } from '../category/category.model';
import { NotificationServices } from '../notification/notification.service';
import { JobAlert } from './jobAlert.model';

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? '';

const claimSend = async (jobId: string, artisanId: string) => {
  if (redisClient.status !== 'ready') return true;
  try {
    const result = await redisClient.set(
      `job-alert:${jobId}:${artisanId}`,
      '1',
      'EX',
      60 * 60 * 24 * 14,
      'NX',
    );
    return result === 'OK';
  } catch (error: any) {
    logger.warn(`[JobAlert] Redis dedupe skipped: ${error?.message || error}`);
    return true;
  }
};

const saveAlert = async (
  artisanId: string,
  payload: { keywords: string; category?: string; service?: string },
) => {
  const keywords = payload.keywords.trim();
  const normalizedKeywords = normalize(keywords);
  if (normalizedKeywords.length < 2) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Enter a short search to watch');
  }

  const alert = await JobAlert.findOneAndUpdate(
    { artisan: artisanId, normalizedKeywords },
    {
      $set: {
        keywords,
        normalizedKeywords,
        category:
          payload.category && Types.ObjectId.isValid(payload.category)
            ? payload.category
            : null,
        service:
          payload.service && Types.ObjectId.isValid(payload.service)
            ? payload.service
            : null,
        active: true,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return alert;
};

const listMine = async (artisanId: string) => {
  return JobAlert.find({ artisan: artisanId }).sort({ createdAt: -1 }).lean();
};

const removeAlert = async (artisanId: string, alertId: string) => {
  if (!Types.ObjectId.isValid(alertId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid alert');
  }
  const removed = await JobAlert.findOneAndDelete({
    _id: alertId,
    artisan: artisanId,
  });
  if (!removed) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Alert not found');
  }
  return removed;
};

const notifyForJob = async (jobId: string, alreadyNotified: string[] = []) => {
  const job = await Job.findById(jobId).select(
    'title customServiceName category service location postCode latitude longitude status',
  );
  if (!job || job.status !== 'OPEN') return 0;

  const alerts = await JobAlert.find({ active: true }).limit(500).lean();
  if (!alerts.length) return 0;

  const categoryName = job.category
    ? (await Category.findById(job.category).select('name').lean())?.name || ''
    : '';
  const haystack = [job.title, job.customServiceName, categoryName]
    .filter(Boolean)
    .join(' ');
  const skip = new Set(alreadyNotified.map(String));
  const artisanIds = [...new Set(alerts.map(item => String(item.artisan)))].filter(
    id => !skip.has(id),
  );
  if (!artisanIds.length) return 0;

  const profiles = await ArtisanProfile.find({
    user: { $in: artisanIds },
    availabilityStatus: 'Available',
    isProfilePublic: true,
  })
    .select(
      'user postCode location serviceLatitude serviceLongitude serviceRadiusKm baseLocation',
    )
    .lean();
  const profileMap = new Map(profiles.map(profile => [String(profile.user), profile]));

  const notifications = [];
  for (const alert of alerts) {
    const artisanId = String(alert.artisan);
    if (skip.has(artisanId)) continue;
    const profile = profileMap.get(artisanId);
    if (!profile) continue;

    const categoryHit =
      alert.category && job.category && String(alert.category) === String(job.category);
    const serviceHit =
      alert.service && job.service && String(alert.service) === String(job.service);
    const textHit =
      nameMatchScore(alert.keywords, haystack) >= NAME_MATCH_THRESHOLD;
    if (!categoryHit && !serviceHit && !textHit) continue;

    const artisanLat = profile.serviceLatitude ?? profile.baseLocation?.coordinates?.[1];
    const artisanLng = profile.serviceLongitude ?? profile.baseLocation?.coordinates?.[0];
    if (
      isCoord(job.latitude) &&
      isCoord(job.longitude) &&
      isCoord(artisanLat) &&
      isCoord(artisanLng)
    ) {
      const radius = profile.serviceRadiusKm || 25;
      if (distanceKm(job.latitude, job.longitude, artisanLat, artisanLng) > radius) {
        continue;
      }
    }

    if (!(await claimSend(jobId, artisanId))) continue;
    skip.add(artisanId);
    notifications.push({
      receiver: new Types.ObjectId(artisanId),
      title: 'Saved search match',
      message: `"${job.title}" matches the job alert you saved.`,
      refId: new Types.ObjectId(jobId),
      path: `/pro/jobs/${jobId}`,
      seen: false,
    });
    if (notifications.length >= 30) break;
  }

  if (!notifications.length) return 0;
  await NotificationServices.createBulkNotifications(notifications);
  return notifications.length;
};

export const JobAlertServices = {
  saveAlert,
  listMine,
  removeAlert,
  notifyForJob,
};

import { Worker, Job } from 'bullmq';
import { Types } from 'mongoose';
import { redisConnectionOptions } from '../../../config/redis';
import { logger, errorLogger } from '../../../shared/logger';
import { JOB_MATCHING_EVENTS, JOB_MATCHING_QUEUE_NAME } from './jobMatching.constants';
import { IJobMatchingJobData } from './jobmatching.interface';
import { JobMatchingServices } from './jobMatching.service';
import { NotificationServices } from '../notification/notification.service';

/**
 * Core business logic:
 * Matches artisans for a given job and sends bulk notifications + real-time socket events.
 */
export const executeJobMatchingAndNotification = async (
  data: IJobMatchingJobData,
) => {
  const { jobId, jobTitle } = data;
  const startTime = Date.now();

  logger.info(`[JobMatchingWorker] Finding matches for Job: ${jobId}`);

  // 1. Calculate matches using matching algorithm
  const matches = await JobMatchingServices.getJobMatches(jobId);

  if (!matches || matches.length === 0) {
    logger.info(`[JobMatchingWorker] No matching artisans found for Job: ${jobId}`);
    return { jobId, matchedCount: 0, notificationsSent: 0 };
  }

  logger.info(
    `[JobMatchingWorker] Found ${matches.length} matching artisans for Job: ${jobId}`,
  );

  // 2. Prepare notifications for atomic bulk insertion
  const notifications = matches.map(match => ({
    receiver: match.artisan,
    title: 'New job available',
    message: `A new job "${jobTitle || 'New job'}" matches your service.`,
    refId: new Types.ObjectId(jobId),
    path: `/jobs/${jobId}`,
    seen: false,
  }));

  // 3. Insert all notifications in a single batch query and emit socket events
  const createdNotifications =
    await NotificationServices.createBulkNotifications(notifications);

  const durationMs = Date.now() - startTime;
  logger.info(
    `[JobMatchingWorker] Successfully delivered ${createdNotifications.length} notifications for Job: ${jobId} in ${durationMs}ms`,
  );

  return {
    jobId,
    matchedCount: matches.length,
    notificationsSent: createdNotifications.length,
    durationMs,
  };
};

/**
 * Worker instance singleton
 */
let jobMatchingWorker: Worker<IJobMatchingJobData> | null = null;

export const initJobMatchingWorker = (): Worker<IJobMatchingJobData> => {
  if (jobMatchingWorker) {
    return jobMatchingWorker;
  }

  jobMatchingWorker = new Worker<IJobMatchingJobData>(
    JOB_MATCHING_QUEUE_NAME,
    async (job: Job<IJobMatchingJobData>) => {
      switch (job.name) {
        case JOB_MATCHING_EVENTS.MATCH_AND_NOTIFY:
          return await executeJobMatchingAndNotification(job.data);
        default:
          logger.warn(`[JobMatchingWorker] Unhandled job name: ${job.name}`);
          return null;
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: 5,
    },
  );

  jobMatchingWorker.on('completed', (job: Job) => {
    logger.info(`[JobMatchingWorker] Job completed successfully: ${job.id}`);
  });

  jobMatchingWorker.on('failed', (job: Job | undefined, err: Error) => {
    errorLogger.error(
      `[JobMatchingWorker] Job failed: ${job?.id} with error: ${err.message}`,
      err,
    );
  });

  jobMatchingWorker.on('error', (err: Error) => {
    logger.warn(`[JobMatchingWorker] Redis worker connection warning: ${err.message}`);
  });

  return jobMatchingWorker;
};


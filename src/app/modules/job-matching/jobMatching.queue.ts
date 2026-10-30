import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../../../config/redis';
import { logger, errorLogger } from '../../../shared/logger';
import { JOB_MATCHING_EVENTS, JOB_MATCHING_QUEUE_NAME } from './jobMatching.constants';
import { IJobMatchingJobData } from './jobmatching.interface';
import { executeJobMatchingAndNotification } from './jobMatching.worker';

// Initialize BullMQ Queue
export const jobMatchingQueue = new Queue<IJobMatchingJobData>(
  JOB_MATCHING_QUEUE_NAME,
  {
    connection: redisConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // keep completed jobs for 1 hour
        count: 500, // keep max 500 completed jobs
      },
      removeOnFail: {
        age: 86400, // keep failed jobs for 24 hours
        count: 1000,
      },
    },
  },
);

// Prevent process crashes on Redis disconnects
jobMatchingQueue.on('error', (err: Error) => {
  logger.warn(`[JobMatchingQueue] Redis queue connection warning: ${err.message}`);
});

/**
 * Dispatch job matching and notification task.
 * 
 * Production behavior:
 * - Enqueues task into BullMQ Redis queue for distributed background processing.
 * 
 * Resilient fallback:
 * - If Redis is temporarily unavailable or offline (e.g. in dev), falls back
 *   to non-blocking background microtask so job creation never fails.
 */
export const dispatchJobMatchingTask = async (
  payload: IJobMatchingJobData,
): Promise<void> => {
  try {
    await jobMatchingQueue.add(JOB_MATCHING_EVENTS.MATCH_AND_NOTIFY, payload);
    logger.info(
      `[JobMatchingQueue] Enqueued job matching task for Job: ${payload.jobId}`,
    );
  } catch (error: any) {
    logger.warn(
      `[JobMatchingQueue] Redis unavailable (${error?.message || error}). Executing non-blocking fallback task.`,
    );

    // Non-blocking background fallback execution
    setImmediate(async () => {
      try {
        await executeJobMatchingAndNotification(payload);
      } catch (fallbackErr: any) {
        errorLogger.error(
          `[JobMatchingQueue] Fallback processing failed for Job: ${payload.jobId}`,
          fallbackErr,
        );
      }
    });
  }
};


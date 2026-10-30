import { Producer } from 'kafkajs';
import kafka from '../../../config/kafka';
import { logger, errorLogger } from '../../../shared/logger';
import { KAFKA_TOPICS, JOB_EVENT_TYPES } from './jobMatching.constants';
import { IJobMatchingJobData } from './jobmatching.interface';
import { JobMatchingServices } from './jobMatching.service';

let producer: Producer | null = null;
let isConnecting = false;

/**
 * Returns a connected Kafka producer singleton.
 */
const getKafkaProducer = async (): Promise<Producer> => {
  if (producer) {
    return producer;
  }

  if (!isConnecting) {
    isConnecting = true;
    try {
      const newProducer = kafka.producer();
      await newProducer.connect();
      producer = newProducer;
      logger.info('[Kafka Producer] Connected to Kafka broker successfully');
    } catch (err: any) {
      isConnecting = false;
      throw err;
    }
    isConnecting = false;
  }

  return producer!;
};

/**
 * Publish a JOB_CREATED event to Kafka topic.
 * 
 * Resilient Architecture:
 * - In Production with Kafka running: Dispatches event to distributed Kafka topic.
 * - In Development (or if Kafka broker is temporarily offline): Seamlessly falls back
 *   to a non-blocking background task so the job creation API never hangs or fails.
 */
export const publishJobCreatedEvent = async (
  payload: IJobMatchingJobData,
): Promise<void> => {
  try {
    const kafkaProd = await getKafkaProducer();
    await kafkaProd.send({
      topic: KAFKA_TOPICS.JOB_EVENTS,
      messages: [
        {
          key: payload.jobId,
          value: JSON.stringify({
            event: JOB_EVENT_TYPES.JOB_CREATED,
            data: payload,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.info(
      `[Kafka Producer] Published "${JOB_EVENT_TYPES.JOB_CREATED}" event for Job: ${payload.jobId}`,
    );
  } catch (error: any) {
    logger.warn(
      `[Kafka Producer] Broker unavailable (${error?.message || error}). Falling back to non-blocking background execution.`,
    );

    // Non-blocking background fallback execution
    setImmediate(async () => {
      try {
        await JobMatchingServices.executeJobMatchingAndNotification(payload);
      } catch (fallbackErr: any) {
        errorLogger.error(
          `[Kafka Producer] Fallback execution failed for Job: ${payload.jobId}`,
          fallbackErr,
        );
      }
    });
  }
};


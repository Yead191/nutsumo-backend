import { Consumer } from 'kafkajs';
import kafka from '../../../config/kafka';
import { logger, errorLogger } from '../../../shared/logger';

import { IJobMatchingJobData } from './jobmatching.interface';
import { kafkaConsumer } from '../../../tools/kafka/kafka-producers/kafka.consumer';
import { JobMatchingServices } from './jobMatching.service';
import { NotificationServices } from '../notification/notification.service';

let consumer: Consumer | null = null;

/**
 * Initializes the Kafka consumer for Job Matching & Notifications.
 */
// export const initJobMatchingConsumer = async (): Promise<void> => {
//   try {
//     consumer = kafka.consumer({ groupId: KAFKA_GROUP_IDS.JOB_MATCHING });
//     await consumer.connect();
//     await consumer.subscribe({
//       topic: KAFKA_TOPICS.JOB_EVENTS,
//       fromBeginning: false,
//     });

//     logger.info(
//       `[Kafka Consumer] Subscribed to topic "${KAFKA_TOPICS.JOB_EVENTS}" with group "${KAFKA_GROUP_IDS.JOB_MATCHING}"`,
//     );

//     await consumer.run({
//       eachMessage: async ({ topic, partition, message }) => {
//         try {
//           if (!message.value) return;

//           const parsed = JSON.parse(message.value.toString());
//           logger.info(
//             `[Kafka Consumer] Received "${parsed.event}" event on topic ${topic} (partition: ${partition})`,
//           );

//           if (parsed.event === JOB_EVENT_TYPES.JOB_CREATED) {
//             const payload: IJobMatchingJobData = parsed.data;
//             await JobMatchingServices.executeJobMatchingAndNotification(payload);
//           }
//         } catch (msgErr: any) {
//           errorLogger.error(
//             `[Kafka Consumer] Error processing message on topic ${topic}: ${msgErr.message}`,
//             msgErr,
//           );
//         }
//       },
//     });
//   } catch (error: any) {
//     logger.warn(
//       `[Kafka Consumer] Could not connect to Kafka broker (${error?.message || error}). Will proceed without active Kafka consumer.`,
//     );
//   }
// };

export const initJobMatchingConsumer = async (): Promise<void> => {
  try {
    await kafkaConsumer({
      topic: 'notification',
      groupId: 'nutsumo-notification',
      cb: async ({ type, data }: { type: string; data: any }) => {
        switch (type) {
          case 'JOB_CREATED':
            await JobMatchingServices.executeJobMatchingAndNotification(data);
            break;

          case 'QUOTATION_CREATED':
            logger.info(
              `[Kafka Consumer] Received QUOTATION_CREATED for Job: ${data.jobId} by Artisan: ${data.artisanName}`,
            );
            break;

          case 'QUOTATION_ACCEPTED':
            logger.info(
              `[Kafka Consumer] Received QUOTATION_ACCEPTED for Booking: ${data.bookingNumber} (Job: ${data.jobId})`,
            );
            break;

          case 'QUOTATION_REJECTED':
            logger.info(
              `[Kafka Consumer] Received QUOTATION_REJECTED for Job: ${data.jobId}`,
            );
            break;

          default:
            break;
        }
      },
    });
  } catch (error) {
    console.error(error);
  }
};

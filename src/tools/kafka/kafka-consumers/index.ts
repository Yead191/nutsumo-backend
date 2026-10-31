import { userConsumer } from './user.consumer';
import { initJobMatchingConsumer } from '../../../app/modules/job-matching/jobMatching.consumer';

export async function loadConsumer() {
  await Promise.all([initJobMatchingConsumer()]);
  console.log('Kafka consumers initialized');
}

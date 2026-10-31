import { userConsumer } from './user.consumer';
import { initJobMatchingConsumer } from '../../../app/modules/job-matching/jobMatching.consumer';
import { utilsConsumer } from './utils.consumer';

export async function loadConsumer() {
  await Promise.all([initJobMatchingConsumer(), utilsConsumer()]);
  console.log('Kafka consumers initialized');
}

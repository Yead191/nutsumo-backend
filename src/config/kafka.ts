import { Kafka } from 'kafkajs';
import config from '.';

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: [config.kafka.url!],
  logLevel: 2,
});

export default kafka;

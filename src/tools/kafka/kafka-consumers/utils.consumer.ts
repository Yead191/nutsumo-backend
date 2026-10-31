import { NotificationServices } from '../../../app/modules/notification/notification.service';
import { emailHelper } from '../../../helpers/emailHelper';
import { kafkaConsumer } from '../kafka-producers/kafka.consumer';

export const utilsConsumer = async () => {
  try {
    await kafkaConsumer({
      topic: 'utils',
      groupId: 'utils',
      cb: async ({ type, data }: { type: string; data: any }) => {
        switch (type) {
          case 'SEND_NOTIFICATION':
            await NotificationServices.saveNotification(data);
            break;
          case 'SEND_EMAIL':
            await emailHelper.setEmailINQueue(data);
            console.log('Email sent successfully');
            break;
        }
      },
    });
  } catch (error) {
    console.log(error);
  }
};

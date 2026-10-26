import { Notification } from './notification.model';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { Types } from 'mongoose';

export const sendNotificationToAllUsers = async ({
  title,
  message,
  path,
  refId,
  type = 'blog',
}: {
  title: string;
  message: string;
  path: string;
  refId?: Types.ObjectId | string;
  type?: string;
}) => {
  const io = (global as any).socketServer;

  // Get all active users
  const users = await User.find({
    status: 'active',
    role: {
      $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
    },
    verified: true,
  })
    .select('_id')
    .lean()
    .exec();

  if (!users || users.length === 0) {
    return [];
  }

  const notifications = users.map(({ _id }) => ({
    receiver: _id,
    sender: null,
    title,
    message,
    refId: refId
      ? typeof refId === 'string'
        ? new Types.ObjectId(refId)
        : refId
      : _id,
    path,
    seen: false,
    type,
  }));

  const result = await Notification.insertMany(notifications);
  result.forEach(notif => {
    io?.emit(`getNotification::${notif.receiver}`, notif);
  });

  return result;
};

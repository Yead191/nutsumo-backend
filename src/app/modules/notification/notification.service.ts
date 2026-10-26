import { Notification } from './notification.model';
import QueryBuilder from '../../builder/QueryBuilder';
import { INotification } from './notification.interface';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { JwtPayload } from 'jsonwebtoken';

const createNotification = async (data: INotification) => {
  const io = global.socketServer;
  const result = await Notification.create(data);
  io?.emit(`getNotification::${data.receiver}`, result);
  return result;
};

const sendNotificationToAdmins = async (payload: {
  title: string;
  message: string;
  refId: any;
  path: string;
}) => {
  const admins = await User.find({
    $or: [{ role: USER_ROLES.ADMIN }, { role: USER_ROLES.SUPER_ADMIN }],
  });
  const io = global.socketServer;
  await Promise.all(
    admins.map(async admin => {
      const notification = await Notification.create({
        receiver: admin._id,
        title: payload.title,
        message: payload.message,
        refId: payload.refId,
        path: payload.path,
        seen: false,
      });
      io?.emit(`getNotification::${admin._id}`, notification);
    }),
  );
};

const getAllNotifications = async (
  user: JwtPayload,
  query: Record<string, any>,
) => {
  const notificationsQuery = new QueryBuilder(
    Notification.find({ receiver: user.id })
      .populate('sender', 'name email image _id')
      .populate('receiver', '_id'),
    query,
  )
    .search(['title', 'message'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const unreadCount = await Notification.countDocuments({
    receiver: user.id,
    seen: false,
  });

  const [notifications, pagination] = await Promise.all([
    notificationsQuery.modelQuery.lean(),
    notificationsQuery.getPaginationInfo(),
  ]);

  return {
    data: { unreadCount, data: notifications },
    pagination,
  };
};

const getSingleNotification = async (id: string) => {
  const isExist = await Notification.findById(id).populate('sender receiver');
  if (!isExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Notification not found');
  }
  return isExist;
};

const updateNotification = async (
  id: string,
  payload: Partial<INotification>,
) => {
  const isExist = await Notification.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Notification not found');
  }

  const result = await Notification.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true },
  );
  return result;
};

const deleteNotification = async (id: string) => {
  const isExist = await Notification.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Notification not found');
  }
  const result = await Notification.deleteOne({ _id: id });
  return result;
};

const readSingleNotification = async (id: string) => {
  const isExist = await Notification.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Notification not found');
  }

  const result = await Notification.findOneAndUpdate(
    { _id: id },
    { $set: { seen: true } },
    { new: true },
  );
  return result;
};

const readAllNotifications = async (user: JwtPayload) => {
  const result = await Notification.updateMany(
    { receiver: user.id, seen: false },
    { $set: { seen: true } },
  );
  return result;
};

const clearAllNotifications = async (user: JwtPayload) => {
  const result = await Notification.deleteMany({ receiver: user.id });
  return result;
};

export const NotificationServices = {
  createNotification,
  sendNotificationToAdmins,
  getAllNotifications,
  getSingleNotification,
  updateNotification,
  deleteNotification,
  readSingleNotification,
  readAllNotifications,
  clearAllNotifications,
};

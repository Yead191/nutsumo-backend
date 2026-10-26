import { Model, Types } from "mongoose";

export interface INotification {
  receiver: Types.ObjectId;
  sender?: Types.ObjectId | null;
  title: string;
  message?: string;
  refId: Types.ObjectId;
  path: string;
  deleteReferenceId?: Types.ObjectId;
  seen?: boolean;
  type?: string
}

export type INotificationModel = Model<INotification>;
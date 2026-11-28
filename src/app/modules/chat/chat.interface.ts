import { Model, Types } from 'mongoose';

export interface IConversation {
  participants: Types.ObjectId[];
  /** Optional job the conversation started from (shown as context in the UI). */
  job?: Types.ObjectId | null;
  lastMessage?: string;
  lastMessageAt?: Date | null;
  lastSender?: Types.ObjectId | null;
  /** Unread message count per participant id. */
  unread: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  text: string;
  images: string[];
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationModel = Model<IConversation>;
export type MessageModel = Model<IMessage>;

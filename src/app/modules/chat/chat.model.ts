import { Schema, model } from 'mongoose';
import {
  ConversationModel,
  IConversation,
  IMessage,
  MessageModel,
} from './chat.interface';

const conversationSchema = new Schema<IConversation, ConversationModel>(
  {
    participants: [
      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ],
    job: { type: Schema.Types.ObjectId, ref: 'Job', default: null },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: null },
    lastSender: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    unread: { type: Map, of: Number, default: {} },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

const messageSchema = new Schema<IMessage, MessageModel>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '', trim: true, maxlength: 4000 },
    images: { type: [String], default: [] },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export const Conversation = model<IConversation, ConversationModel>(
  'Conversation',
  conversationSchema,
);
export const Message = model<IMessage, MessageModel>('Message', messageSchema);

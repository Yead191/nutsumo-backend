import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { USER_ROLES } from '../../../enums/user';
import { User } from '../user/user.model';
import { Job } from '../job/job.model';
import { Quotation } from '../quotation/quotation.model';
import { Booking } from '../booking/booking.model';
import { Conversation, Message } from './chat.model';
import { CHAT_EVENTS, userRoom } from './chat.constants';

const PARTICIPANT_FIELDS = 'name image role';

const emitToUsers = (userIds: string[], event: string, payload: unknown) => {
  const io = global.socketServer;
  if (!io) return;
  for (const id of userIds) io.to(userRoom(id)).emit(event, payload);
};

const assertParticipant = async (conversationId: string, userId: string) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Conversation not found');
  }
  if (!conversation.participants.some(p => p.toString() === userId)) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not part of this conversation',
    );
  }
  return conversation;
};

/**
 * Customers may message any artisan. Artisans may only open a chat with a
 * customer they already have a quotation or booking with (prevents cold spam).
 */
const assertCanStart = async (
  starter: { _id: Types.ObjectId; role: string },
  other: { _id: Types.ObjectId; role: string },
) => {
  const roles = [starter.role, other.role].sort().join(':');
  if (roles !== [USER_ROLES.ARTISAN, USER_ROLES.USER].sort().join(':')) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Chats are only available between customers and professionals',
    );
  }
  if (starter.role === USER_ROLES.ARTISAN) {
    const link = { artisan: starter._id, customer: other._id };
    const [quotation, booking] = await Promise.all([
      Quotation.exists(link),
      Booking.exists(link),
    ]);
    if (!quotation && !booking) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You can message a customer after you send them a quotation',
      );
    }
  }
};

const startConversation = async (
  userId: string,
  participantId: string,
  jobId?: string,
) => {
  if (userId === participantId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You cannot message yourself');
  }

  const [me, other] = await Promise.all([
    User.findById(userId).select('role status'),
    User.findById(participantId).select('role status'),
  ]);
  if (!me || !other) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  if (other.status === 'blocked') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'This user is unavailable');
  }

  // One conversation per pair; reuse it (and refresh its job context).
  let conversation = await Conversation.findOne({
    participants: { $all: [me._id, other._id], $size: 2 },
  });

  if (!conversation) {
    await assertCanStart(me, other);
    conversation = await Conversation.create({
      participants: [me._id, other._id],
      unread: {},
    });
  }

  if (jobId && Types.ObjectId.isValid(jobId)) {
    const job = await Job.findById(jobId).select('_id');
    if (job && conversation.job?.toString() !== jobId) {
      conversation.job = job._id;
      await conversation.save();
    }
  }

  return Conversation.findById(conversation._id)
    .populate('participants', PARTICIPANT_FIELDS)
    .populate('job', 'title status budget');
};

const getMyConversations = async (userId: string) => {
  const conversations = await Conversation.find({ participants: userId })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .populate('participants', PARTICIPANT_FIELDS)
    .populate('job', 'title status budget')
    .lean();

  return conversations.map(c => ({
    ...c,
    unreadCount: Number((c.unread as unknown as Record<string, number>)?.[userId] || 0),
  }));
};

const getMessages = async (
  conversationId: string,
  userId: string,
  query: Record<string, unknown>,
) => {
  await assertParticipant(conversationId, userId);

  const limit = Math.min(Number(query.limit) || 30, 100);
  const filter: Record<string, unknown> = { conversation: conversationId };
  // Cursor pagination: load messages older than `before` (ISO date).
  if (query.before) filter.createdAt = { $lt: new Date(String(query.before)) };

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = messages.length > limit;
  return {
    messages: messages.slice(0, limit).reverse(),
    hasMore,
  };
};

const sendMessage = async (
  conversationId: string,
  userId: string,
  text: string,
  images: string[],
) => {
  const conversation = await assertParticipant(conversationId, userId);
  const body = (text || '').trim();
  if (!body && images.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Message cannot be empty');
  }

  const message = await Message.create({
    conversation: conversation._id,
    sender: userId,
    text: body,
    images,
    readBy: [userId],
  });

  const participantIds = conversation.participants.map(p => p.toString());
  for (const id of participantIds) {
    if (id !== userId) {
      conversation.unread.set(id, (conversation.unread.get(id) || 0) + 1);
    }
  }
  conversation.lastMessage = body || '📷 Photo';
  conversation.lastMessageAt = message.createdAt;
  conversation.lastSender = new Types.ObjectId(userId);
  await conversation.save();

  const payload = message.toObject();
  emitToUsers(participantIds, CHAT_EVENTS.MESSAGE, payload);
  emitToUsers(participantIds, CHAT_EVENTS.CONVERSATION_UPDATED, {
    _id: conversation._id,
    lastMessage: conversation.lastMessage,
    lastMessageAt: conversation.lastMessageAt,
    lastSender: conversation.lastSender,
    unread: Object.fromEntries(conversation.unread),
  });

  return payload;
};

const markAsRead = async (conversationId: string, userId: string) => {
  const conversation = await assertParticipant(conversationId, userId);

  await Message.updateMany(
    { conversation: conversation._id, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } },
  );
  conversation.unread.set(userId, 0);
  await conversation.save();

  const participantIds = conversation.participants.map(p => p.toString());
  emitToUsers(participantIds, CHAT_EVENTS.READ, {
    conversationId,
    readerId: userId,
    readAt: new Date(),
  });
  return { conversationId, unreadCount: 0 };
};

const getUnreadTotal = async (userId: string) => {
  const conversations = await Conversation.find({ participants: userId })
    .select('unread')
    .lean();
  const total = conversations.reduce(
    (sum, c) =>
      sum + Number((c.unread as unknown as Record<string, number>)?.[userId] || 0),
    0,
  );
  return { total };
};

export const ChatServices = {
  startConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadTotal,
  assertParticipant,
};

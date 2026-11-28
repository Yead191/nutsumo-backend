import colors from 'colors';
import { Secret } from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import config from '../config';
import { logger } from '../shared/logger';
import { jwtHelper } from './jwtHelper';
import { Conversation } from '../app/modules/chat/chat.model';
import { CHAT_EVENTS, userRoom } from '../app/modules/chat/chat.constants';

/**
 * Reads the JWT from the handshake (auth.token or Authorization header).
 * Anonymous sockets are still allowed: public broadcasts (notifications,
 * community feeds) don't need a user. Authenticated sockets also join their
 * private `user:<id>` room, which chat events are delivered to.
 */
const identify = (socket: Socket): string | null => {
  const raw =
    (socket.handshake.auth?.token as string | undefined) ||
    socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!raw) return null;
  try {
    const payload = jwtHelper.verifyToken(raw, config.jwt.jwt_secret as Secret);
    return payload?.id ? String(payload.id) : null;
  } catch {
    return null;
  }
};

const socket = (io: Server) => {
  io.on('connection', socket => {
    const userId = identify(socket);
    socket.data.userId = userId;
    if (userId) socket.join(userRoom(userId));
    logger.info(
      colors.blue(`A user connected${userId ? ` (user ${userId})` : ''}`),
    );

    // Typing indicator: relayed only between participants of the conversation.
    socket.on(
      CHAT_EVENTS.TYPING,
      async (payload: { conversationId?: string; isTyping?: boolean }) => {
        if (!userId || !payload?.conversationId) return;
        try {
          const conversation = await Conversation.findOne({
            _id: payload.conversationId,
            participants: userId,
          })
            .select('participants')
            .lean();
          if (!conversation) return;
          for (const participant of conversation.participants) {
            const id = participant.toString();
            if (id === userId) continue;
            io.to(userRoom(id)).emit(CHAT_EVENTS.TYPING, {
              conversationId: payload.conversationId,
              userId,
              isTyping: Boolean(payload.isTyping),
            });
          }
        } catch {
          // Ignore malformed ids.
        }
      },
    );

    //disconnect
    socket.on('disconnect', () => {
      logger.info(colors.red('A user disconnect'));
    });
  });
};

export const socketHelper = { socket };

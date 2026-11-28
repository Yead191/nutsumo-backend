/** Socket.IO event names shared with the frontend chat client. */
export const CHAT_EVENTS = {
  MESSAGE: 'chat:message',
  CONVERSATION_UPDATED: 'chat:conversation',
  READ: 'chat:read',
  TYPING: 'chat:typing',
} as const;

/** Every authenticated socket joins its own user room. */
export const userRoom = (userId: string) => `user:${userId}`;

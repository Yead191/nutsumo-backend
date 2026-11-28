import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { USER_ROLES } from '../../../enums/user';
import { ChatController } from './chat.controller';
import { ChatValidations } from './chat.validation';

const router = express.Router();
const chatUsers = auth(USER_ROLES.USER, USER_ROLES.ARTISAN);

const chatImageUpload = fileUploadHandler([
  { name: 'image', maxCount: 5 },
  { name: 'images', maxCount: 5 },
]);

router
  .route('/conversations')
  .get(chatUsers, ChatController.getMyConversations)
  .post(
    chatUsers,
    validateRequest(ChatValidations.startConversationValidationSchema),
    ChatController.startConversation,
  );

router.get('/unread-count', chatUsers, ChatController.getUnreadTotal);

router
  .route('/conversations/:id/messages')
  .get(
    chatUsers,
    validateRequest(ChatValidations.conversationIdValidationSchema),
    ChatController.getMessages,
  )
  .post(
    chatUsers,
    chatImageUpload,
    validateRequest(ChatValidations.sendMessageValidationSchema),
    ChatController.sendMessage,
  );

router.patch(
  '/conversations/:id/read',
  chatUsers,
  validateRequest(ChatValidations.conversationIdValidationSchema),
  ChatController.markAsRead,
);

export const ChatRoutes = router;

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { getMultipleFilesPath } from '../../../shared/getFilePath';
import { ChatServices } from './chat.service';

const startConversation = catchAsync(async (req: Request, res: Response) => {
  const result = await ChatServices.startConversation(
    req.user.id,
    req.body.participantId,
    req.body.jobId,
  );
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Conversation ready',
    data: result,
  });
});

const getMyConversations = catchAsync(async (req: Request, res: Response) => {
  const result = await ChatServices.getMyConversations(req.user.id);
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Conversations retrieved successfully',
    data: result,
  });
});

const getUnreadTotal = catchAsync(async (req: Request, res: Response) => {
  const result = await ChatServices.getUnreadTotal(req.user.id);
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Unread count retrieved successfully',
    data: result,
  });
});

const getMessages = catchAsync(async (req: Request, res: Response) => {
  const result = await ChatServices.getMessages(
    req.params.id,
    req.user.id,
    req.query,
  );
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Messages retrieved successfully',
    data: result,
  });
});

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const images = [
    ...(getMultipleFilesPath(req.files, 'image') || []),
    ...(getMultipleFilesPath(req.files, 'images') || []),
  ];
  const result = await ChatServices.sendMessage(
    req.params.id,
    req.user.id,
    req.body.text || '',
    images,
  );
  return sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Message sent',
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await ChatServices.markAsRead(req.params.id, req.user.id);
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Conversation marked as read',
    data: result,
  });
});

export const ChatController = {
  startConversation,
  getMyConversations,
  getUnreadTotal,
  getMessages,
  sendMessage,
  markAsRead,
};

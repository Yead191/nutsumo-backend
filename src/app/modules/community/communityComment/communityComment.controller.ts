import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../../shared/catchAsync';
import sendResponse from '../../../../shared/sendResponse';
import { CommunityCommentServices } from './communityComment.service';

const createComment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user as JwtPayload;
  const result = await CommunityCommentServices.createCommentToDB(
    user,
    id,
    req.body,
  );

  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Comment posted successfully',
    data: result,
  });
});

const replyToComment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user as JwtPayload;
  const result = await CommunityCommentServices.replyToCommentToDB(
    user,
    id,
    req.body,
  );

  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Reply posted successfully',
    data: result,
  });
});

const toggleCommentLike = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user as JwtPayload;
  const result = await CommunityCommentServices.toggleCommentLikeToDB(
    user,
    id,
  );

  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.liked
      ? 'Comment liked successfully'
      : 'Comment unliked successfully',
    data: result,
  });
});

const getPostComments = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user as JwtPayload | undefined;
  const result = await CommunityCommentServices.getPostCommentsFromDB(
    id,
    req.query,
    user,
  );

  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Comments fetched successfully',
    data: result.comments,
    pagination: result.meta,
  });
});

const getCommentReplies = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user as JwtPayload | undefined;
  const result = await CommunityCommentServices.getCommentRepliesFromDB(
    id,
    req.query,
    user,
  );

  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Replies fetched successfully',
    data: result.replies,
    pagination: result.meta,
  });
});

const updateComment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user as JwtPayload;
  const result = await CommunityCommentServices.updateComment(
    id,
    user,
    req.body,
  );

  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Comment updated successfully',
    data: result,
  });
});

const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user as JwtPayload;
  const result = await CommunityCommentServices.deleteComment(id, user);

  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Comment deleted successfully',
    data: result,
  });
});

const getMyComments = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await CommunityCommentServices.getMyComments(
    user,
    req.query,
  );

  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'My comments fetched successfully',
    data: result.comments,
    pagination: result.pagination,
  });
});

export const CommunityCommentController = {
  createComment,
  replyToComment,
  toggleCommentLike,
  getPostComments,
  getCommentReplies,
  updateComment,
  deleteComment,
  getMyComments,
};

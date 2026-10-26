import { Request, Response } from 'express';
import { CommentServices } from './comment.service';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../../shared/catchAsync';
import sendResponse from '../../../../shared/sendResponse';

const createCommentToDB = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CommentServices.createCommentToDB(
    req.user,
    id,
    req.body,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Comment added successfully.',
    data: result,
  });
});

const updateComment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CommentServices.updateComment(id, req.user, req.body);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Comment updated successfully.',
    data: result,
  });
});

const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CommentServices.deleteComment(id, req.user);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Comment deleted successfully.',
    data: result,
  });
});

const getAllCommentsByPost = catchAsync(async (req: Request, res: Response) => {
  const result = await CommentServices.getPostCommentsFromDB(
    req.params.id,
    req.query,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Comments fetched successfully.',
    data: result.comments,
    pagination: result.meta,
  });
});

const getMyComments = catchAsync(async (req: Request, res: Response) => {
  const result = await CommentServices.myCommentedPostsFromDB(
    req.user,
    req.query,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Comments fetched successfully.',
    data: result.posts,
    pagination: result.pagination,
  });
});

export const CommentController = {
  createCommentToDB,
  deleteComment,
  getAllCommentsByPost,
  updateComment,
  getMyComments,
};

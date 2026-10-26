import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../../shared/catchAsync';
import sendResponse from '../../../../shared/sendResponse';
import { CommunityLikeServices } from './communityLike.service';

const toggleLike = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user as JwtPayload;
  const result = await CommunityLikeServices.toggleLikeToDB(user, id);

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.liked
      ? 'Post liked successfully'
      : 'Post unliked successfully',
    data: result,
  });
});

const getAllLikes = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityLikeServices.getAllLikesFromDB(
    req.query,
    req.params.id,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Post likes fetched successfully',
    pagination: result.meta,
    data: result.result,
  });
});

const getMyLikes = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await CommunityLikeServices.getMyLikesFromDB(
    user,
    req.query,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'My liked forum posts fetched successfully',
    pagination: result.meta,
    data: result.result,
  });
});

export const CommunityLikeController = {
  toggleLike,
  getAllLikes,
  getMyLikes,
};

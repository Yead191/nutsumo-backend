import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../../shared/catchAsync';
import { getMultipleFilesPath } from '../../../../shared/getFilePath';
import sendResponse from '../../../../shared/sendResponse';
import { CommunityServices } from './community.service';

const parseCommunityPayload = (body: any) => {
  let data = { ...body };
  if (data.data && typeof data.data === 'string') {
    try {
      const parsed = JSON.parse(data.data);
      data = { ...data, ...parsed };
      delete data.data;
    } catch {
      // Keep original body if not valid JSON
    }
  }

  if (typeof data.isPinned === 'string') {
    data.isPinned = data.isPinned === 'true';
  }
  if (typeof data.isLocked === 'string') {
    data.isLocked = data.isLocked === 'true';
  }

  return data;
};

const createPost = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  let data = parseCommunityPayload(req.body);

  const images = getMultipleFilesPath(req.files, 'images');
  if (images && images.length > 0) {
    data.images = images;
  }

  const result = await CommunityServices.createPostToDB(user, data);
  return sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Forum post published successfully',
    data: result,
  });
});

const getAllPosts = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await CommunityServices.getAllPostsFromDB(user, req.query);
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Forum posts fetched successfully',
    data: result?.posts,
    pagination: result?.pagination,
  });
});

const getSinglePost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  const result = await CommunityServices.getSinglePostFromDB(id, user);
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Forum post fetched successfully',
    data: result,
  });
});

const updatePost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  let data = parseCommunityPayload(req.body);

  const images = getMultipleFilesPath(req.files, 'images');
  if (images && images.length > 0) {
    data.images = images;
  }

  const result = await CommunityServices.updatePostToDB(user, data, id);
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Forum post updated successfully',
    data: result,
  });
});

const deletePost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  const result = await CommunityServices.deletePostFromDB(user, id);
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Forum post deleted successfully',
    data: result,
  });
});

const getMyPosts = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await CommunityServices.getMyPosts(user, req.query);
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'My forum posts fetched successfully',
    data: result?.myPosts,
    pagination: result?.pagination,
  });
});

export const CommunityController = {
  createPost,
  getAllPosts,
  getSinglePost,
  updatePost,
  deletePost,
  getMyPosts,
};

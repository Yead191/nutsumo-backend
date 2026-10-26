import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import { getSingleFilePath } from '../../../shared/getFilePath';
import sendResponse from '../../../shared/sendResponse';
import { UserService } from './user.service';

const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { ...userData } = req.body;
    const result = await UserService.createUserToDB(userData, res);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'User created successfully',
      data: result,
    });
  },
);

const getUserProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await UserService.getUserProfileFromDB(user);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Profile data retrieved successfully',
    data: result,
  });
});

//update profile
const updateProfile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const data = {
      ...req.body,
    };
    let image = getSingleFilePath(req.files, 'image');

    if (image) {
      data.image = image;
    }
    if (req?.body?.vendorProfile) {
      data.vendorProfile = JSON.parse(req.body.vendorProfile);
    }
    console.log(data);
    const result = await UserService.updateProfileToDB(user, data);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Profile updated successfully',
      data: result,
    });
  },
);

const uploadFile = catchAsync(async (req: Request, res: Response) => {
  const file = getSingleFilePath(req.files, 'image');
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'File uploaded successfully',
    data: file,
  });
});

// get all user
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getAllUsersFromDB(req.query);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All users retrieved successfully',
    data: result.users,
    pagination: result.pagination,
  });
});

// get single user
const getSingleUser = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { id } = req.params;
  // console.log(req.params)
  const result = await UserService.getUserService(user, id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User retrieved successfully',
    data: result,
  });
});
// change status
const changeStatusOfUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body || {};
  const result = await UserService.changeStatusOfUser(
    id,
    status,
    rejectionReason,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `User status changed to ${result?.status}`,
    data: result,
  });
});

// get user stats
const getUserStats = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getUserStatsFromDB();
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User statistics retrieved successfully',
    data: result,
  });
});

// update user by admin
const updateUserByAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.updateUserByAdmin(id, req.body);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User updated successfully',
    data: result,
  });
});

// delete user
const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.deleteUserService(id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User deleted successfully',
    data: result,
  });
});

// delete multiple users
const deleteMultipleUsers = catchAsync(async (req: Request, res: Response) => {
  const { ids } = req.body;
  const result = await UserService.deleteMultipleUsersService(ids);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${result.deletedCount} user(s) deleted successfully`,
    data: result,
  });
});

export const UserController = {
  createUser,
  getUserProfile,
  updateProfile,
  uploadFile,
  getAllUsers,
  getUserStats,
  getSingleUser,
  changeStatusOfUser,
  updateUserByAdmin,
  deleteUser,
  deleteMultipleUsers,
};


import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AuthService } from './auth.service';
import { getSingleFilePath } from '../../../shared/getFilePath';

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { ...verifyData } = req.body;
  const result = await AuthService.verifyEmailToDB(verifyData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.message,
    data: result.data,
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const { ...loginData } = req.body;
  const result = await AuthService.loginUserFromDB(loginData, res);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User logged in successfully.',
    data: result,
  });
});

const forgetPassword = catchAsync(async (req: Request, res: Response) => {
  const email = req.body.email;
  const result = await AuthService.forgetPasswordToDB(email);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message:
      'Please check your email. We have sent you a one-time passcode (OTP).',
    data: result,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const token = req.headers.authorization;
  const { ...resetData } = req.body;
  const result = await AuthService.resetPasswordToDB(token!, resetData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Your password has been successfully reset.',
    data: result,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { ...passwordData } = req.body;
  await AuthService.changePasswordToDB(user, passwordData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Your password has been successfully changed',
  });
});

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const { ...userData } = req.body;
  const result = await AuthService.registerUserToDB(userData, res);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User registered successfully.',
    data: result,
  });
});


const registerVendor = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  let image = getSingleFilePath(req.files, 'image')
  const data = { ...req.body }
  if (image) {
    data.image = image;
  }
  if (req?.body?.vendorProfile) {
    data.vendorProfile = JSON.parse(req.body.vendorProfile);
  }
  const result = await AuthService.registerVendorToDB(data, res)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Your registration was successful. Please check your email for the verification OTP.',
    data: result,
  });
});

const loginWithGoogle = catchAsync(async (req: Request, res: Response) => {
  const { idToken } = req.body;
  const result = await AuthService.loginWithGoogleToDB(idToken);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User logged in successfully with Google.',
    data: result,
  });
});

const verifyIdentity = catchAsync(async (req: Request, res: Response) => {
  const idCardFront = getSingleFilePath(req.files, 'nidFront');
  const idCardBack = getSingleFilePath(req.files, 'nidBack');
  const selfie = getSingleFilePath(req.files, 'selfie');

  const userId = (req as any).user?.id || (req as any).user?._id;
  const email = req.body?.email || (req as any).user?.email;

  const result = await AuthService.verifyIdentityToDB({
    userId,
    email,
    idCardFront,
    idCardBack,
    selfie,
  });

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message:
      'Identity verification documents submitted successfully! Your application is under review.',
    data: result,
  });
});

const getIdentityStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  const email = (req.query?.email as string) || (req as any).user?.email;

  const result = await AuthService.getIdentityStatusFromDB({
    userId,
    email,
  });

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Identity status fetched successfully.',
    data: result,
  });
});

export const AuthController = {
  verifyEmail,
  loginUser,
  loginWithGoogle,
  forgetPassword,
  resetPassword,
  changePassword,
  registerUser,
  registerVendor,
  verifyIdentity,
  getIdentityStatus,
};


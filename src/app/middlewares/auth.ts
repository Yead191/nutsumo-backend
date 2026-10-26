import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import { jwtHelper } from '../../helpers/jwtHelper';
import { User } from '../modules/user/user.model';

const auth =
  (...roles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Extract token from Authorization header or cookies
      let token = '';
      const tokenWithBearer = req.headers.authorization;
      if (tokenWithBearer && tokenWithBearer.startsWith('Bearer')) {
        token = tokenWithBearer.split(' ')[1];
      } else if ((req as any).cookies?.token) {
        token = (req as any).cookies.token;
      } else if ((req as any).cookies?.accessToken) {
        token = (req as any).cookies.accessToken;
      }

      if (!token) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized.');
      }

      // 2. Verify token signature and expiration
      const verifyUser = jwtHelper.verifyToken(
        token,
        config.jwt.jwt_secret as Secret,
      );

      // 3. Check live user status in database (prevents blocked/deleted users with valid JWTs)
      const isExistUser = await User.findById(verifyUser.id).select(
        'status role verified rejectionReason',
      );

      if (!isExistUser) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          'User account no longer exists.',
        );
      }

      if (isExistUser.status === 'blocked') {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          isExistUser.rejectionReason
            ? `Your account has been blocked. Reason: ${isExistUser.rejectionReason}`
            : 'Your account has been blocked. Please contact support for further assistance.',
        );
      }

      if (isExistUser.status === 'rejected') {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          `Your account has been rejected. Reason: ${isExistUser.rejectionReason || 'Contact support'}`,
        );
      }

      // 4. Attach verified user with latest live role to request
      req.user = {
        ...verifyUser,
        role: isExistUser.role,
      };

      // 5. Guard user role against route permissions
      if (roles.length && !roles.includes(isExistUser.role)) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You don't have permission to access this api",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export default auth;


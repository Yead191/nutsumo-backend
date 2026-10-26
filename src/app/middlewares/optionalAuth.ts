import { NextFunction, Request, Response } from 'express';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import { jwtHelper } from '../../helpers/jwtHelper';
import { User } from '../modules/user/user.model';

const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token = '';
    const tokenWithBearer = req.headers.authorization;
    if (tokenWithBearer && tokenWithBearer.startsWith('Bearer')) {
      token = tokenWithBearer.split(' ')[1];
    } else if ((req as any).cookies?.token) {
      token = (req as any).cookies.token;
    } else if ((req as any).cookies?.accessToken) {
      token = (req as any).cookies.accessToken;
    }

    if (token) {
      const verifyUser = jwtHelper.verifyToken(
        token,
        config.jwt.jwt_secret as Secret,
      );
      if (verifyUser?.id) {
        const isExistUser = await User.findById(verifyUser.id).select(
          'status role verified',
        );
        if (isExistUser && isExistUser.status !== 'blocked') {
          req.user = {
            ...verifyUser,
            role: isExistUser.role,
          };
        }
      }
    }
  } catch {
    // Ignore invalid or expired token for optional auth
  }
  next();
};

export default optionalAuth;

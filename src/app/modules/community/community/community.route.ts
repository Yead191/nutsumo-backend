import express, { NextFunction, Request, Response } from 'express';
import { CommunityController } from './community.controller';
import auth from '../../../middlewares/auth';
import { USER_ROLES } from '../../../../enums/user';
import fileUploadHandler from '../../../middlewares/fileUploadHandler';
import { CommunityValidations } from './community.validation';
import validateRequest from '../../../middlewares/validateRequest';
import { jwtHelper } from '../../../../helpers/jwtHelper';
import config from '../../../../config';
import { Secret } from 'jsonwebtoken';
import { User } from '../../user/user.model';

const router = express.Router();

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
    // Ignore invalid token for optional auth
  }
  next();
};

const communityUploadFields = [
  {
    name: 'images',
    maxCount: 5,
  },
];

router
  .route('/')
  .get(optionalAuth, CommunityController.getAllPosts)
  .post(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(communityUploadFields),
    (req: Request, res: Response, next: NextFunction) => {
      if (req.body.data) {
        try {
          const parsed = JSON.parse(req.body.data);
          CommunityValidations.createCommunity.parse({ body: parsed });
          req.body = { ...req.body, ...parsed };
        } catch (e) {
          return next(e);
        }
      } else {
        CommunityValidations.createCommunity.parse({ body: req.body });
      }
      return CommunityController.createPost(req, res, next);
    },
  );

router
  .route('/my-posts')
  .get(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    CommunityController.getMyPosts,
  );

router
  .route('/:id')
  .get(optionalAuth, CommunityController.getSinglePost)
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(communityUploadFields),
    (req: Request, res: Response, next: NextFunction) => {
      if (req.body.data) {
        try {
          const parsed = JSON.parse(req.body.data);
          CommunityValidations.updateCommunity.parse({ body: parsed });
          req.body = { ...req.body, ...parsed };
        } catch (e) {
          return next(e);
        }
      } else {
        CommunityValidations.updateCommunity.parse({ body: req.body });
      }
      return CommunityController.updatePost(req, res, next);
    },
  )
  .delete(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    CommunityController.deletePost,
  );

export const CommunityRoutes = router;

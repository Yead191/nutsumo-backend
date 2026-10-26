import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import unlinkFile from '../../../shared/unlinkFile';
import generateOTP from '../../../util/generateOTP';
import { IUser } from './user.interface';
import { User } from './user.model';
import { AuthHelper } from '../auth/auth.helper';
import { Response } from 'express';
import mongoose from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';

const createUserToDB = async (payload: Partial<IUser>, res: Response) => {
  const isExist = await User.findOne({ email: payload.email });
  if (isExist) {
    if (isExist.status === 'blocked')
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You don’t have permission to access this content.It looks like your account has been deactivated.',
      );
    if (!isExist.verified) {
      return await AuthHelper.unverifiedAccountHandle(payload.email!, res);
    }
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already exist!');
  }
  const createUser = await User.create(payload);
  if (!createUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user');
  }

  //send email
  const otp = generateOTP();
  const values = {
    name: createUser.name,
    otp: otp,
    email: createUser.email!,
  };
  const createAccountTemplate = emailTemplate.createAccount(values);
  emailHelper.sendEmail(createAccountTemplate);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };
  await User.findOneAndUpdate(
    { _id: createUser._id },
    { $set: { authentication } },
  );

  return createUser;
};

const getUserProfileFromDB = async (
  user: JwtPayload,
): Promise<Partial<IUser>> => {
  const { id } = user;
  const isExistUser = await User.findOne({ _id: id }).populate(
    'subscription',
    // 'name start_date end_date status is_trial plan',
  );
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  return isExistUser;
};

const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser>,
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const isExistUser = await User.findById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const updateData: Record<string, any> = {};

  // Root fields
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.image !== undefined) updateData.image = payload.image;
  if (payload.company !== undefined) updateData.company = payload.company;
  if (payload.interest !== undefined) updateData.interest = payload.interest;
  if (payload.phone !== undefined) updateData.phone = payload.phone;

  //unlink file here
  if (payload.image && isExistUser.image !== payload.image) {
    unlinkFile(isExistUser.image!);
  }

  const updateDoc = await User.findOneAndUpdate(
    { _id: id },
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    },
  );

  return updateDoc;
};

const getAllUsersFromDB = async (query: Record<string, any>) => {
  // const userQuery = new QueryBuilder(User.find({ role: { $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] }, verified: true }), query).paginate().sort().search(['name', 'email']).filter().fields()
  const filter: Record<string, any> = {
    role: USER_ROLES.USER,
    verified: true,
  };

  if (query.hasSubscription === 'true') {
    filter.subscription = { $exists: true, $ne: null };
  }

  if (query.hasSubscription === 'false') {
    filter.subscription = { $in: [null, undefined] };
  }

  delete query.hasSubscription;
  const userQuery = new QueryBuilder(
    User.find(filter).select('-password -authentication').populate({
      path: 'subscription',
    }),
    query,
  )
    .search(['name', 'email'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [users, pagination] = await Promise.all([
    userQuery.modelQuery.lean(),
    userQuery.getPaginationInfo(),
  ]);

  return { users, pagination };
};

const getUserStatsFromDB = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    activeUsers,
    blockedUsers,
    pendingUsers,
    verifiedUsers,
    unverifiedUsers,
    roleCounts,
    newThisMonth,
  ] = await Promise.all([
    User.countDocuments({
      role: { $nin: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN] },
    }),
    User.countDocuments({
      status: 'active',
      role: { $nin: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN] },
    }),
    User.countDocuments({
      status: 'blocked',
      role: { $ne: USER_ROLES.SUPER_ADMIN },
    }),
    User.countDocuments({
      status: 'pending',
      role: { $ne: USER_ROLES.SUPER_ADMIN },
    }),
    User.countDocuments({
      verified: true,
      role: { $ne: USER_ROLES.SUPER_ADMIN },
    }),
    User.countDocuments({
      verified: false,
      role: { $ne: USER_ROLES.SUPER_ADMIN },
    }),
    User.aggregate([
      { $match: { role: { $ne: USER_ROLES.SUPER_ADMIN } } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    User.countDocuments({
      createdAt: { $gte: startOfMonth },
      role: { $ne: USER_ROLES.SUPER_ADMIN },
    }),
  ]);

  const roles: Record<string, number> = {
    USER: 0,
    VENDOR: 0,
    ADMIN: 0,
  };
  roleCounts.forEach((r: { _id: string; count: number }) => {
    if (r._id) {
      roles[r._id] = r.count;
    }
  });

  return {
    totalUsers,
    activeUsers,
    blockedUsers,
    pendingUsers,
    verifiedUsers,
    unverifiedUsers,
    regularUsers: roles.USER || 0,
    vendors: roles.VENDOR || 0,
    admins: roles.ADMIN || 0,
    newThisMonth,
  };
};

const getUserService = async (user: JwtPayload, id: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user id');
  }

  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(
    user.role,
  );

  let result;
  if (isAdmin) {
    result = await User.findById(id)
      .select('-password -authentication')
      .populate('subscription');
  } else {
    result = await User.findById(id).select(
      'name email role company interest verified status image createdAt',
    );
  }

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  return result;
};

// change status of user (toggle or explicit status)
const changeStatusOfUser = async (
  id: string,
  status?: string,
  rejectionReason?: string,
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user id');
  }

  const isExistUser = await User.findById(id);

  if (!isExistUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  let updateStatus = status;
  if (!updateStatus) {
    updateStatus = isExistUser.status === 'active' ? 'blocked' : 'active';
  }

  const updateData: Record<string, any> = {
    status: updateStatus,
  };

  // Rejection reason is only allowed for blocked/rejected users
  if (updateStatus === 'blocked' || updateStatus === 'rejected') {
    if (rejectionReason !== undefined) {
      updateData.rejectionReason = rejectionReason;
    }
  } else {
    updateData.rejectionReason = '';
  }

  const result = await User.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true },
  ).select('-password -authentication');

  return result;
};

// update user by admin
const updateUserByAdmin = async (id: string, payload: Partial<IUser>) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user id');
  }

  const isExistUser = await User.findById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  const allowedFields = [
    'name',
    'email',
    'role',
    'status',
    'verified',
    'company',
    'interest',
    'rejectionReason',
  ];
  const updateData: Record<string, any> = {};

  for (const field of allowedFields) {
    if ((payload as any)[field] !== undefined) {
      updateData[field] = (payload as any)[field];
    }
  }
  if (payload.status !== 'blocked' && payload.status !== 'rejected') {
    updateData.rejectionReason = '';
  }

  const result = await User.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true },
  ).select('-password -authentication');

  return result;
};

const deleteUserService = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user id');
  }

  const isExistUser = await User.findById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  if (isExistUser.image) {
    unlinkFile(isExistUser.image);
  }
  const result = await User.deleteOne({ _id: id });
  return result;
};

const deleteMultipleUsersService = async (ids: string[]) => {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please provide an array of user IDs to delete',
    );
  }

  const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No valid user IDs provided');
  }

  const users = await User.find({ _id: { $in: validIds } });
  for (const user of users) {
    if (user.image && !user.image.startsWith('http')) {
      unlinkFile(user.image);
    }
  }

  const result = await User.deleteMany({ _id: { $in: validIds } });
  return {
    deletedCount: result.deletedCount,
  };
};

export const UserService = {
  createUserToDB,
  getUserProfileFromDB,
  updateProfileToDB,
  getAllUsersFromDB,
  getUserStatsFromDB,
  getUserService,
  changeStatusOfUser,
  updateUserByAdmin,
  deleteUserService,
  deleteMultipleUsersService,
};

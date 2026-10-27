import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload, Secret } from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { emailHelper } from '../../../helpers/emailHelper';
import { jwtHelper } from '../../../helpers/jwtHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import {
  IAuthResetPassword,
  IChangePassword,
  ILoginData,
  IRegisterData,
  IRegisterVendor,
  IVerifyEmail,
} from '../../../types/auth';
import cryptoToken from '../../../util/cryptoToken';
import generateOTP from '../../../util/generateOTP';
import { ResetToken } from '../resetToken/resetToken.model';
import { User } from '../user/user.model';
import { IUser } from '../user/user.interface';
import { Response } from 'express';
import { AuthHelper } from './auth.helper';
import { USER_ROLES } from '../../../enums/user';
import unlinkFile from '../../../shared/unlinkFile';
import { NotificationServices } from '../notification/notification.service';

const googleClient = new OAuth2Client(config.google?.client_id);

//login
const loginUserFromDB = async (payload: ILoginData, res: Response) => {
  const { email, password } = payload;
  const isExistUser = await User.findOne({ email }).select(
    '+password +status +rejectionReason',
  );
  // console.log(isExistUser)
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }
  // 1. Check verified status first (applies to all users/vendors)
  if (!isExistUser.verified) {
    return await AuthHelper.unverifiedAccountHandle(email, res);
  }

  // 2. Check user status (blocked/pending)
  if (isExistUser.status === 'blocked') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Your account has been blocked. Please contact support/administrator for further assistance. ${isExistUser.rejectionReason && `Reason: ${isExistUser.rejectionReason}`}`,
    );
  }

  // if (isExistUser.status === 'pending') {
  //   throw new ApiError(
  //     StatusCodes.BAD_REQUEST,
  //     'Your application has been submitted successfully. We will review your application and notify you via email once it has been approved.',
  //   );
  // }
  if (isExistUser.status === 'rejected') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Your application is rejected. Reason: ${isExistUser.rejectionReason}`,
    );
  }

  if (!password) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is required!');
  }

  if (!isExistUser.password) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This account was registered using Google. Please sign in with Google or use forgot password to set a password.',
    );
  }

  //check match password
  if (
    password &&
    !(await User.isMatchPassword(password, isExistUser.password))
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect!');
  }

  //create token
  const createToken = jwtHelper.createToken(
    {
      id: isExistUser._id,
      role: isExistUser.role,
      email: isExistUser.email,
      name: isExistUser.name,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  return {
    createToken,
    role: isExistUser.role,
    identityStatus: isExistUser.identityStatus || 'not_submitted',
    email: isExistUser.email,
    name: isExistUser.name,
    verified: isExistUser.verified,
  };
};

//forget password
const forgetPasswordToDB = async (email: string) => {
  const isExistUser = await User.isExistUserByEmail(email);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //send mail
  const otp = generateOTP();
  const value = {
    otp,
    email: isExistUser.email,
  };
  const forgetPassword = emailTemplate.resetPassword(value);
  emailHelper.sendEmail(forgetPassword);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };
  await User.findOneAndUpdate({ email }, { $set: { authentication } });
};

//verify email
const verifyEmailToDB = async (payload: IVerifyEmail) => {
  const { email, oneTimeCode } = payload;
  const isExistUser = await User.findOne({ email }).select('+authentication');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (!oneTimeCode) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please give the otp, check your email we send a code',
    );
  }

  if (isExistUser.authentication?.oneTimeCode !== oneTimeCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You provided wrong otp');
  }

  const date = new Date();
  if (date > isExistUser.authentication?.expireAt) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Otp already expired, Please try again',
    );
  }

  let message;
  let data;

  if (!isExistUser.verified) {
    await User.findOneAndUpdate(
      { _id: isExistUser._id },
      { verified: true, authentication: { oneTimeCode: null, expireAt: null } },
    );
    message = 'Email verified successfully';

    // Generate token so verified user can proceed directly
    const createToken = jwtHelper.createToken(
      {
        id: isExistUser._id,
        role: isExistUser.role,
        email: isExistUser.email,
        name: isExistUser.name,
      },
      config.jwt.jwt_secret as Secret,
      config.jwt.jwt_expire_in as string,
    );

    data = {
      createToken,
      role: isExistUser.role,
      identityStatus: isExistUser.identityStatus || 'not_submitted',
      status: isExistUser.status,
    };

    // Send Welcome Email
    const welcomeEmailData = emailTemplate.welcomeAccount({
      email: isExistUser.email,
      name: isExistUser.name || 'User',
    });
    await emailHelper.sendEmail(welcomeEmailData);
  } else {
    await User.findOneAndUpdate(
      { _id: isExistUser._id },
      {
        authentication: {
          isResetPassword: true,
          oneTimeCode: null,
          expireAt: null,
        },
      },
    );

    //create token ;
    const createToken = cryptoToken();
    await ResetToken.create({
      user: isExistUser._id,
      token: createToken,
      expireAt: new Date(Date.now() + 5 * 60000),
    });
    message =
      'Verification Successful: Please securely store and utilize this code for reset password';
    data = createToken;
  }
  return { data, message };
};

//forget password
const resetPasswordToDB = async (
  token: string,
  payload: IAuthResetPassword,
) => {
  const { newPassword, confirmPassword } = payload;
  //isExist token
  const isExistToken = await ResetToken.isExistToken(token);
  if (!isExistToken) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
  }

  //user permission check
  const isExistUser = await User.findById(isExistToken.user).select(
    '+authentication',
  );
  if (!isExistUser?.authentication?.isResetPassword) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "You don't have permission to change the password. Please click again to 'Forgot Password'",
    );
  }

  //validity check
  const isValid = await ResetToken.isExpireToken(token);
  if (!isValid) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Token expired, Please click again to the forget password',
    );
  }

  //check password
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "New password and Confirm password doesn't match!",
    );
  }

  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const updateData = {
    password: hashPassword,
    authentication: {
      isResetPassword: false,
    },
  };

  await User.findOneAndUpdate({ _id: isExistToken.user }, updateData, {
    new: true,
  });
};

const changePasswordToDB = async (
  user: JwtPayload,
  payload: IChangePassword,
) => {
  const { currentPassword, newPassword, confirmPassword } = payload;
  const isExistUser = await User.findById(user.id).select('+password');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (!isExistUser.password) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This account was registered using Google and does not have a password set. Please use forgot password to create a password.',
    );
  }

  //current password match
  if (
    currentPassword &&
    !(await User.isMatchPassword(currentPassword, isExistUser.password))
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
  }

  //newPassword and current password
  if (currentPassword === newPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please give different password from current password',
    );
  }
  //new password and confirm password check
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Password and Confirm password doesn't matched",
    );
  }

  //hash password
  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const updateData = {
    password: hashPassword,
  };
  await User.findOneAndUpdate({ _id: user.id }, updateData, { new: true });
};

const registerUserToDB = async (payload: IRegisterData, res: Response) => {
  const { name, email, password, company, interest, role, phone, trade } =
    payload;
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

  const isArtisan = role === USER_ROLES.ARTISAN;

  const data: Partial<IUser> = {
    name,
    email,
    password,
    role: isArtisan ? USER_ROLES.ARTISAN : USER_ROLES.USER,
    phone: phone || '',
    trade: trade || '',
    verified: false,
    status: isArtisan ? 'pending' : 'active',
    identityStatus: isArtisan ? 'not_submitted' : undefined,
  };
  const createUser = await User.create(data);
  if (!createUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user');
  }
  NotificationServices.sendNotificationToAdmins({
    title: isArtisan ? 'New Artisan Registration' : 'New User Registration',
    message: `${createUser.name} has registered as a new ${isArtisan ? 'Artisan' : 'user'}`,
    refId: createUser._id,
    path: `/user/${createUser._id}`,
  });
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

const registerVendorToDB = async (payload: any, res: Response) => {
  // console.log(payload);

  const payloadData = payload.body || payload;
  const email = payloadData.email;
  const image = payload.image || payloadData.image;

  try {
    const isExist = await User.isExistUserByEmail(email);
    if (isExist) {
      // Clean up the newly uploaded image since registration won't proceed
      if (image) {
        unlinkFile(image);
      }

      if (isExist.status === 'blocked') {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'You don’t have permission to access this content. It looks like your account has been deactivated.',
        );
      }
      if (!isExist.verified) {
        return await AuthHelper.unverifiedAccountHandle(email, res);
      }
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already exist!');
    }

    const createVendor = await User.create({
      ...payload,
      role: USER_ROLES.ARTISAN,
      status: 'pending',
    });
    if (!createVendor) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user');
    }

    NotificationServices.sendNotificationToAdmins({
      title: 'New Vendor Registration',
      message: `${createVendor.name} has registered as a new Vendor`,
      refId: createVendor._id,
      path: `/vendor/profile/${createVendor._id}`,
    });
    // Send email
    const otp = generateOTP();
    const values = {
      name: createVendor.name,
      otp: otp,
      email: createVendor.email!,
    };
    const createAccountTemplate = emailTemplate.createAccount(values);
    emailHelper.sendEmail(createAccountTemplate);

    // Save OTP to DB
    const authentication = {
      oneTimeCode: otp,
      expireAt: new Date(Date.now() + 3 * 60000),
    };
    await User.findOneAndUpdate(
      { _id: createVendor._id },
      { $set: { authentication } },
    );

    return createVendor;
  } catch (error) {
    // Clean up newly uploaded image on database or mailer failure
    if (image) {
      unlinkFile(image);
    }
    throw error;
  }
};

const loginWithGoogleToDB = async (idToken: string) => {
  if (!idToken) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Google ID token is required!');
  }

  // 1. Verify token with Google
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google?.client_id,
    });
    payload = ticket.getPayload();
  } catch (error) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid Google token!');
  }

  if (!payload || !payload.email) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Google authentication failed: Email not found!',
    );
  }

  const { email, name, picture, sub: googleId } = payload;
  const normalizedEmail = email.toLowerCase();

  // 2. Check if user exists
  let isExistUser = await User.findOne({ email: normalizedEmail });

  if (isExistUser) {
    // Check if account is blocked
    if (isExistUser.status === 'blocked') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Your account has been blocked. Please contact support/administrator for further assistance. ${isExistUser.rejectionReason && `Reason: ${isExistUser.rejectionReason}`}`,
      );
    }

    // Link googleId or update avatar / verified if needed
    let isModified = false;
    if (!isExistUser.googleId) {
      isExistUser.googleId = googleId;
      isModified = true;
    }
    if (!isExistUser.verified) {
      isExistUser.verified = true;
      isModified = true;
    }
    if (
      picture &&
      (!isExistUser.image || isExistUser.image.includes('profile.png'))
    ) {
      isExistUser.image = picture;
      isModified = true;
    }
    if (isModified) {
      await isExistUser.save();
    }
  } else {
    // 3. New User Registration via Google
    isExistUser = await User.create({
      name: name || 'Google User',
      email: normalizedEmail,
      image: picture || 'https://i.ibb.co/z5YHLV9/profile.png',
      role: USER_ROLES.USER,
      status: 'active',
      verified: true, // Google accounts are verified by Google
      authType: 'google',
      googleId,
    });

    if (!isExistUser) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to create user with Google',
      );
    }

    // Notify admins
    NotificationServices.sendNotificationToAdmins({
      title: 'New User Registration (Google)',
      message: `${isExistUser.name} has registered using Google`,
      refId: isExistUser._id,
      path: `/user/${isExistUser._id}`,
    });

    // 4. Send Welcome Email to newly registered user
    try {
      const welcomeEmailData = emailTemplate.welcomeAccount({
        email: isExistUser.email,
        name: isExistUser.name || 'User',
      });
      await emailHelper.sendEmail(welcomeEmailData);
    } catch (emailErr) {
      console.error('Failed to send welcome email to Google user:', emailErr);
    }
  }

  // 5. Generate JWT Token
  const createToken = jwtHelper.createToken(
    {
      id: isExistUser._id,
      role: isExistUser.role,
      email: isExistUser.email,
      name: isExistUser.name,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  return { createToken };
};

// Verify Identity Documents (National ID Front, Back, and Selfie)
const verifyIdentityToDB = async (payload: {
  userId?: string;
  email?: string;
  idCardFront?: string;
  idCardBack?: string;
  selfie?: string;
}) => {
  const { userId, email, idCardFront, idCardBack, selfie } = payload;
  const query = userId ? { _id: userId } : { email };
  const user = await User.findOne(query);

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  if (!idCardFront && !user.idCardFront) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'National ID card front side photo is required',
    );
  }
  if (!idCardBack && !user.idCardBack) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'National ID card back side photo is required',
    );
  }
  if (!selfie && !user.selfie) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Live selfie photo is required for identity verification',
    );
  }

  const updatedData: Record<string, any> = {
    identityStatus: 'pending',
    status: 'pending',
    identityRejectionReason: '',
  };

  if (idCardFront) updatedData.idCardFront = idCardFront;
  if (idCardBack) updatedData.idCardBack = idCardBack;
  if (selfie) updatedData.selfie = selfie;

  const result = await User.findByIdAndUpdate(
    user._id,
    { $set: updatedData },
    { new: true },
  ).select('-password -authentication');

  NotificationServices.sendNotificationToAdmins({
    title: 'New Artisan Identity Verification Submitted',
    message: `${user.name} has submitted ID cards and a live selfie for review`,
    refId: user._id,
    path: `/user/${user._id}`,
  });

  return result;
};

// Get Identity Status
const getIdentityStatusFromDB = async (payload: {
  userId?: string;
  email?: string;
}) => {
  const { userId, email } = payload;
  const query = userId ? { _id: userId } : { email };
  const user = await User.findOne(query).select(
    'name email role status identityStatus identityRejectionReason idCardFront idCardBack selfie trade',
  );

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  return user;
};

export const AuthService = {
  verifyEmailToDB,
  loginUserFromDB,
  loginWithGoogleToDB,
  forgetPasswordToDB,
  resetPasswordToDB,
  changePasswordToDB,
  registerUserToDB,
  registerVendorToDB,
  verifyIdentityToDB,
  getIdentityStatusFromDB,
};

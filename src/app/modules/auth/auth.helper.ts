import { Response } from "express";
import generateOTP from "../../../util/generateOTP";
import { User } from "../user/user.model";
import { emailTemplate } from "../../../shared/emailTemplate";
import { emailHelper } from "../../../helpers/emailHelper";

const unverifiedAccountHandle = async (email: string, response: Response) => {
  const otp = generateOTP();
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };
  const user = await User.findOne({ email });
  await User.findOneAndUpdate({ email }, { $set: { authentication } });
  const values = {
    otp: otp,
    email: email,
    name: user?.name!
  };
  const createAccountTemplate = emailTemplate.createAccount(values);
  emailHelper.sendEmail(createAccountTemplate);
  response.status(400).json({
    success: true,
    statusCode: 400,
    message: "Account is not verified. Please check your email for verification code.",
    suggestRoute: "/api/v1/auth/verify-email",
    email
  });
}

export const AuthHelper = {
  unverifiedAccountHandle
}
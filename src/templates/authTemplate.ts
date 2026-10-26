import {
  ICreateAccount,
  IResetPassword,
  IWelcomeAccount,
} from '../types/emailTamplate';
import { wrapWithEmailLayout } from './baseTemplate';

export const createAccount = (values: ICreateAccount) => {
  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.name}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Thank you for signing up for <strong>Nutsumo</strong>. Please use the verification code below to verify your email address and activate your account:
    </p>

    <!-- OTP Box -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
      <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; margin: 0 0 12px 0; font-weight: 600;">Your Verification Code</p>
      <div style="background: #0f172a; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 14px 28px; display: inline-block; border-radius: 10px; font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
        ${values.otp}
      </div>
      <p style="color: #64748b; font-size: 13px; margin: 14px 0 0 0;">This code is valid for <strong style="color: #0f172a;">3 minutes</strong>.</p>
    </div>

    <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 20px 0 0 0;">
      If you did not request this verification code, please ignore this email or contact our support team.
    </p>
  `;

  return {
    to: values.email,
    subject: 'Verify your Nutsumo account',
    html: wrapWithEmailLayout({
      headline: 'Verify Your Email Address',
      badgeText: 'Account Verification',
      badgeColor: '#0284c7',
      badgeBg: '#f0f9ff',
      bodyContent,
    }),
  };
};

export const resetPassword = (values: IResetPassword) => {
  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Hello,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      We received a request to reset the password for your <strong>Nutsumo</strong> account. Use the one-time code below to proceed:
    </p>

    <!-- OTP Box -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
      <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; margin: 0 0 12px 0; font-weight: 600;">Your Reset Code</p>
      <div style="background: #0f172a; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 14px 28px; display: inline-block; border-radius: 10px; font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
        ${values.otp}
      </div>
      <p style="color: #64748b; font-size: 13px; margin: 14px 0 0 0;">This code is valid for <strong style="color: #0f172a;">3 minutes</strong>.</p>
    </div>

    <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 20px 0 0 0;">
      If you did not request a password reset, no action is needed. Your account remains secure.
    </p>
  `;

  return {
    to: values.email,
    subject: 'Reset your Nutsumo password',
    html: wrapWithEmailLayout({
      headline: 'Password Reset Request',
      badgeText: 'Security Notice',
      badgeColor: '#b45309',
      badgeBg: '#fffbeb',
      bodyContent,
    }),
  };
};

export const welcomeAccount = (values: IWelcomeAccount) => {
  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.name}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
      Welcome to <strong>Nutsumo</strong>! Your email has been verified and your account is now fully active.
    </p>

    <!-- Highlight Box -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #059669; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #0f172a; font-weight: 600;">What you can do next:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.7;">
        <li>Browse certified and reviewed local artisans</li>
        <li>Post jobs with photos and detailed requirements</li>
        <li>Receive competitive quotes and schedule bookings securely</li>
        <li>Enjoy protected in-platform payments and verified reviews</li>
      </ul>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0;">
      Need any assistance? Our support team is always here to help you get the best experience on Nutsumo.
    </p>
  `;

  return {
    to: values.email,
    subject: 'Welcome to Nutsumo — Account Verified!',
    html: wrapWithEmailLayout({
      headline: 'Welcome to Nutsumo!',
      badgeText: 'Account Verified ✓',
      badgeColor: '#059669',
      badgeBg: '#ecfdf5',
      bodyContent,
    }),
  };
};

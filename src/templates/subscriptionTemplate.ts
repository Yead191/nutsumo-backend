import {
  IMembershipSubscriptionUserConfirmation,
  IAdminMembershipNotification,
  ISubscriptionPaymentSuccess,
  ISubscriptionPaymentFailed,
  ISubscriptionCancelled,
} from '../types/emailTamplate';
import { wrapWithEmailLayout } from './baseTemplate';

export const membershipSubscriptionUserConfirmation = (
  values: IMembershipSubscriptionUserConfirmation,
) => {
  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.name}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Thank you for subscribing to <strong>${values.membershipName}</strong> on Nutsumo. Your subscription is active!
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 12px 20px; font-weight: 600; font-size: 14px;">
        Plan Summary
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="10" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="font-weight: 600; width: 38%; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Plan:</td>
          <td style="color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${values.membershipName}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Billing:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">$${values.price} / ${values.recurring}</td>
        </tr>
        ${
          values.transactionId
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Transaction ID:</td>
          <td style="font-family: monospace; font-size: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${values.transactionId}</td>
        </tr>
        `
            : ''
        }
        ${
          values.isTrial
            ? `
        <tr>
          <td style="font-weight: 600; padding-left: 20px;">Trial Period:</td>
          <td style="color: #059669; font-weight: 600;">Active (${values.trialPeriodDays || 0} days free)</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>
  `;

  return {
    to: values.email,
    subject: `Subscription Confirmed: ${values.membershipName} | Nutsumo`,
    html: wrapWithEmailLayout({
      headline: 'Subscription Confirmed',
      badgeText: 'Active Plan ✓',
      badgeColor: '#059669',
      badgeBg: '#ecfdf5',
      bodyContent,
    }),
  };
};

export const adminMembershipNotification = (
  values: IAdminMembershipNotification,
) => {
  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Hello Administrator,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      A new user subscribed to <strong>${values.membershipName}</strong>: <strong>${values.customerName}</strong> (${values.customerEmail}).
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="10" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="font-weight: 600; width: 38%; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Subscriber:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.customerName} (${values.customerEmail})</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Plan:</td>
          <td style="font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${values.membershipName}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Amount:</td>
          <td style="font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">$${values.price} / ${values.recurring}</td>
        </tr>
        ${
          values.transactionId
            ? `
        <tr>
          <td style="font-weight: 600; padding-left: 20px;">Transaction ID:</td>
          <td style="font-family: monospace; font-size: 12px; color: #64748b;">${values.transactionId}</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>
  `;

  return {
    to: values.adminEmail,
    subject: `New Subscription: ${values.membershipName} | Nutsumo Admin`,
    html: wrapWithEmailLayout({
      headline: 'New Subscriber Joined',
      badgeText: 'Admin Notification',
      badgeColor: '#4f46e5',
      badgeBg: '#eef2ff',
      bodyContent,
    }),
  };
};

export const subscriptionPaymentSuccess = (
  values: ISubscriptionPaymentSuccess,
) => {
  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.name}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Your payment for <strong>${values.membershipName}</strong> on Nutsumo was processed successfully.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="10" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="font-weight: 600; width: 38%; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Plan:</td>
          <td style="font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${values.membershipName}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Amount Paid:</td>
          <td style="font-weight: 700; color: #059669; border-bottom: 1px solid #e2e8f0;">$${values.amountPaid.toFixed(2)}</td>
        </tr>
        ${
          values.nextBillingDate
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Next Billing Date:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.nextBillingDate}</td>
        </tr>
        `
            : ''
        }
        ${
          values.transactionId
            ? `
        <tr>
          <td style="font-weight: 600; padding-left: 20px;">Transaction ID:</td>
          <td style="font-family: monospace; font-size: 12px; color: #64748b;">${values.transactionId}</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>
  `;

  return {
    to: values.email,
    subject: `Payment Receipt: ${values.membershipName} | Nutsumo`,
    html: wrapWithEmailLayout({
      headline: 'Payment Successful',
      badgeText: 'Paid ✓',
      badgeColor: '#059669',
      badgeBg: '#ecfdf5',
      bodyContent,
    }),
  };
};

export const subscriptionPaymentFailed = (
  values: ISubscriptionPaymentFailed,
) => {
  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.name}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      We were unable to process your recurring payment for <strong>${values.membershipName}</strong> on Nutsumo.
    </p>

    <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #be123c; font-size: 14px;">Payment Issue:</p>
      <p style="margin: 0; color: #4c0519; font-size: 14px;">${values.reason || 'Card declined or insufficient funds.'}</p>
      <p style="margin: 8px 0 0 0; color: #4c0519; font-size: 14px;"><strong>Amount Due:</strong> $${values.amountDue.toFixed(2)}</p>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0;">
      Please update your payment method in your Nutsumo account settings to ensure uninterrupted service.
    </p>
  `;

  return {
    to: values.email,
    subject: `Payment Failed: ${values.membershipName} | Nutsumo Action Required`,
    html: wrapWithEmailLayout({
      headline: 'Payment Unsuccessful',
      badgeText: 'Action Required',
      badgeColor: '#dc2626',
      badgeBg: '#fef2f2',
      bodyContent,
    }),
  };
};

export const subscriptionCancelled = (values: ISubscriptionCancelled) => {
  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.name}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Your subscription to <strong>${values.membershipName}</strong> has been cancelled.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
        ${
          values.cancelType === 'end_of_period' && values.endDate
            ? `Your benefits remain active until the end of your billing cycle on <strong>${values.endDate}</strong>.`
            : `Your subscription has been terminated immediately.`
        }
      </p>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0;">
      You can re-subscribe at any time from your account settings. Thank you for using Nutsumo!
    </p>
  `;

  return {
    to: values.email,
    subject: `Subscription Cancelled: ${values.membershipName} | Nutsumo`,
    html: wrapWithEmailLayout({
      headline: 'Subscription Cancelled',
      badgeText: 'Cancelled',
      badgeColor: '#64748b',
      badgeBg: '#f1f5f9',
      bodyContent,
    }),
  };
};

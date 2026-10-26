import {
  IServiceBookingUserConfirmation,
  IServiceBookingAdminNotification,
} from '../types/emailTamplate';
import { wrapWithEmailLayout } from './baseTemplate';

export const serviceBookingUserConfirmation = (
  values: IServiceBookingUserConfirmation,
) => {
  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.name}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Your service booking for <strong>${values.serviceTitle}</strong> has been confirmed. Below are your booking and payment details:
    </p>

    <!-- Booking Details Table -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 12px 20px; font-weight: 600; font-size: 14px;">
        Booking Summary
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="10" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="font-weight: 600; width: 38%; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Service:</td>
          <td style="color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${values.serviceTitle}</td>
        </tr>
        ${
          values.originalPrice && values.originalPrice > values.price
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Standard Rate:</td>
          <td style="border-bottom: 1px solid #e2e8f0; color: #64748b; text-decoration: line-through;">$${values.originalPrice.toFixed(2)}</td>
        </tr>
        `
            : ''
        }
        ${
          values.couponCode || values.discountAmount
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Discount${values.couponCode ? ` (${values.couponCode})` : ''}:</td>
          <td style="color: #059669; font-weight: 600; border-bottom: 1px solid #e2e8f0;">-${values.discountAmount ? `$${values.discountAmount.toFixed(2)}` : 'Applied'}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Amount Paid:</td>
          <td style="font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-size: 15px;">$${values.price.toFixed(2)}</td>
        </tr>
        ${
          values.preferredDate
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Scheduled Date:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.preferredDate}</td>
        </tr>
        `
            : ''
        }
        ${
          values.preferredTime
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Scheduled Time:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.preferredTime}</td>
        </tr>
        `
            : ''
        }
        ${
          values.phone
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Contact Phone:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.phone}</td>
        </tr>
        `
            : ''
        }
        ${
          values.transactionId
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Transaction ID:</td>
          <td style="font-family: monospace; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">${values.transactionId}</td>
        </tr>
        `
            : ''
        }
        ${
          values.note
            ? `
        <tr>
          <td style="font-weight: 600; padding-left: 20px;">Customer Note:</td>
          <td style="color: #64748b;">${values.note}</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 0;">
      Your payment is held safely until the artisan marks the work completed and you approve the result.
    </p>
  `;

  return {
    to: values.email,
    subject: `Booking Confirmed: ${values.serviceTitle} | Nutsumo`,
    html: wrapWithEmailLayout({
      headline: 'Booking Confirmed!',
      badgeText: 'Payment Received ✓',
      badgeColor: '#059669',
      badgeBg: '#ecfdf5',
      bodyContent,
    }),
  };
};

export const serviceBookingAdminNotification = (
  values: IServiceBookingAdminNotification,
) => {
  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Hello Administrator,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      A new service booking has been placed on Nutsumo by <strong>${values.customerName}</strong> (${values.customerEmail}).
    </p>

    <!-- Admin Booking Details Table -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 12px 20px; font-weight: 600; font-size: 14px;">
        Booking Overview
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="10" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="font-weight: 600; width: 38%; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Customer:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.customerName} (${values.customerEmail})</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Service:</td>
          <td style="font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${values.serviceTitle}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Total Amount:</td>
          <td style="font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">$${values.price.toFixed(2)}</td>
        </tr>
        ${
          values.preferredDate
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Requested Date:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.preferredDate}</td>
        </tr>
        `
            : ''
        }
        ${
          values.preferredTime
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Requested Time:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.preferredTime}</td>
        </tr>
        `
            : ''
        }
        ${
          values.phone
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Phone:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.phone}</td>
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
    to: values.adminEmail,
    subject: `New Service Booking: ${values.serviceTitle} | Nutsumo Admin`,
    html: wrapWithEmailLayout({
      headline: 'New Booking Notification',
      badgeText: 'Admin Alert',
      badgeColor: '#4f46e5',
      badgeBg: '#eef2ff',
      bodyContent,
    }),
  };
};

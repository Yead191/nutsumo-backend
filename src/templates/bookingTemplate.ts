import config from '../config';
import {
  IBookingEscrowPaymentCustomerEmail,
  IBookingEscrowPaymentArtisanEmail,
  IBookingDeliveredCustomerEmail,
  IBookingCompletionConfirmedArtisanEmail,
  IBookingPayoutApprovedArtisanEmail,
  IBookingPayoutReleasedArtisanEmail,
} from '../types/emailTamplate';
import { wrapWithEmailLayout } from './baseTemplate';

// 1. Escrow Payment Received - Email to Customer
export const bookingEscrowPaymentCustomerEmail = (
  values: IBookingEscrowPaymentCustomerEmail,
) => {
  const bookingUrl = `${config.frontend_url}/bookings/${values.bookingId}`;

  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.customerName}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Your payment for Booking <strong>#${values.bookingNumber}</strong> has been received and is now securely held in <strong style="color: #059669;">Escrow</strong>.
    </p>

    <!-- Payment & Escrow Summary -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="background-color: #059669; color: #ffffff; padding: 12px 20px; font-weight: 600; font-size: 14px;">
        Escrow Deposit Confirmed
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="10" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="font-weight: 600; width: 40%; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Booking Number:</td>
          <td style="color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">#${values.bookingNumber}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Job Title:</td>
          <td style="border-bottom: 1px solid #e2e8f0; color: #0f172a;">${values.jobTitle}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Assigned Artisan:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.artisanName}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Amount Held in Escrow:</td>
          <td style="font-weight: 700; color: #059669; border-bottom: 1px solid #e2e8f0; font-size: 15px;">
            $${Number(values.amount).toFixed(2)}
          </td>
        </tr>
        ${
          values.transactionId
            ? `
        <tr>
          <td style="font-weight: 600; padding-left: 20px;">Transaction ID:</td>
          <td style="color: #64748b; font-size: 13px;">${values.transactionId}</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    <!-- Escrow Protection Guarantee -->
    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #065f46; line-height: 1.5;">
        🛡️ <strong>Nutsumo Escrow Protection:</strong> Your funds will remain safe with Nutsumo until the artisan completes the job and you confirm satisfaction.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0 16px 0;">
      <a href="${bookingUrl}" style="background-color: #059669; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-block;">
        View Booking Status
      </a>
    </div>
  `;

  return {
    to: values.customerEmail,
    subject: `Escrow Payment Confirmed: Booking #${values.bookingNumber} | Nutsumo`,
    html: wrapWithEmailLayout({
      headline: 'Payment Secured in Escrow!',
      badgeText: 'Escrow Protected',
      badgeColor: '#059669',
      badgeBg: '#ecfdf5',
      bodyContent,
    }),
  };
};

// 2. Escrow Funded - Email to Artisan (Safe to start work)
export const bookingEscrowPaymentArtisanEmail = (
  values: IBookingEscrowPaymentArtisanEmail,
) => {
  const bookingUrl = `${config.frontend_url}/artisan/bookings/${values.bookingId}`;

  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.artisanName}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Customer <strong>${values.customerName}</strong> has deposited the funds into <strong style="color: #059669;">Escrow</strong> for Booking <strong>#${values.bookingNumber}</strong>. You can now begin working on the job with full peace of mind!
    </p>

    <!-- Escrow Details -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 12px 20px; font-weight: 600; font-size: 14px;">
        Booking Overview
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="10" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="font-weight: 600; width: 40%; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Booking Number:</td>
          <td style="color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">#${values.bookingNumber}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Job Title:</td>
          <td style="border-bottom: 1px solid #e2e8f0; color: #0f172a;">${values.jobTitle}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Customer:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.customerName}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Total in Escrow:</td>
          <td style="font-weight: 700; color: #059669; border-bottom: 1px solid #e2e8f0;">$${Number(values.totalAmount).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; padding-left: 20px;">Your Net Payout:</td>
          <td style="font-weight: 700; color: #2563eb; font-size: 15px;">$${Number(values.artisanPayoutAmount).toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0 16px 0;">
      <a href="${bookingUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-block;">
        Start Work on Booking
      </a>
    </div>
  `;

  return {
    to: values.artisanEmail,
    subject: `Escrow Funded: You can start work on Booking #${values.bookingNumber} | Nutsumo`,
    html: wrapWithEmailLayout({
      headline: 'Payment Secured in Escrow!',
      badgeText: 'Safe to Start',
      badgeColor: '#2563eb',
      badgeBg: '#eff6ff',
      bodyContent,
    }),
  };
};

// 3. Work Delivered - Email to Customer
export const bookingDeliveredCustomerEmail = (
  values: IBookingDeliveredCustomerEmail,
) => {
  const bookingUrl = `${config.frontend_url}/bookings/${values.bookingId}`;

  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.customerName}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Artisan <strong>${values.artisanName}</strong> has marked the work for <strong>"${values.jobTitle}"</strong> (Booking <strong>#${values.bookingNumber}</strong>) as <strong style="color: #2563eb;">DELIVERED</strong>.
    </p>

    ${
      values.deliveryNotes
        ? `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 6px 0; font-weight: 600; font-size: 13px; color: #64748b; text-transform: uppercase;">Artisan Completion Notes:</p>
      <p style="margin: 0; font-size: 14px; color: #334155; font-style: italic;">"${values.deliveryNotes}"</p>
    </div>
    `
        : ''
    }

    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
      Please inspect the delivered work. Once you are satisfied, confirm the completion to release the escrow payout to the artisan.
    </p>

    <div style="text-align: center; margin: 30px 0 16px 0;">
      <a href="${bookingUrl}" style="background-color: #059669; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-block;">
        Review & Confirm Completion
      </a>
    </div>
  `;

  return {
    to: values.customerEmail,
    subject: `Work Delivered: Booking #${values.bookingNumber} | Nutsumo`,
    html: wrapWithEmailLayout({
      headline: 'Work Delivered for Your Review',
      badgeText: 'Review Required',
      badgeColor: '#2563eb',
      badgeBg: '#eff6ff',
      bodyContent,
    }),
  };
};

// 4. Completion Confirmed - Email to Artisan (Pending Admin Payout Approval)
export const bookingCompletionConfirmedArtisanEmail = (
  values: IBookingCompletionConfirmedArtisanEmail,
) => {
  const bookingUrl = `${config.frontend_url}/artisan/bookings/${values.bookingId}`;

  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.artisanName}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Great news! <strong>${values.customerName}</strong> has confirmed completion of Booking <strong>#${values.bookingNumber}</strong> for <strong>"${values.jobTitle}"</strong>.
    </p>

    ${
      values.rating
        ? `
    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 4px 0; font-weight: 600; font-size: 13px; color: #065f46;">Customer Rating: ⭐ ${values.rating} / 5</p>
      ${values.feedback ? `<p style="margin: 0; font-size: 14px; color: #047857; font-style: italic;">"${values.feedback}"</p>` : ''}
    </div>
    `
        : ''
    }

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px; color: #0f172a;">Next Step: Platform Payout Approval</p>
      <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">
        Your net payout of <strong style="color: #059669;">$${Number(values.netPayoutAmount).toFixed(2)}</strong> has been submitted to platform administration for payout approval and release.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0 16px 0;">
      <a href="${bookingUrl}" style="background-color: #0f172a; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-block;">
        View Booking
      </a>
    </div>
  `;

  return {
    to: values.artisanEmail,
    subject: `Completion Confirmed: Booking #${values.bookingNumber} | Nutsumo`,
    html: wrapWithEmailLayout({
      headline: 'Job Completed Successfully! 🎉',
      badgeText: 'Completed',
      badgeColor: '#059669',
      badgeBg: '#ecfdf5',
      bodyContent,
    }),
  };
};

// 5. Payout Approved - Email to Artisan
export const bookingPayoutApprovedArtisanEmail = (
  values: IBookingPayoutApprovedArtisanEmail,
) => {
  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.artisanName}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Your payout of <strong style="color: #059669;">$${Number(values.netPayoutAmount).toFixed(2)}</strong> for Booking <strong>#${values.bookingNumber}</strong> has been <strong style="color: #059669;">APPROVED</strong> by the platform administration.
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0;">
      The funds are queued for disbursement and will be released to your settlement account shortly.
    </p>
  `;

  return {
    to: values.artisanEmail,
    subject: `Payout Approved: Booking #${values.bookingNumber} | Nutsumo`,
    html: wrapWithEmailLayout({
      headline: 'Payout Approved!',
      badgeText: 'Payout Approved',
      badgeColor: '#059669',
      badgeBg: '#ecfdf5',
      bodyContent,
    }),
  };
};

// 6. Payout Released - Email to Artisan (Detailed breakdown)
export const bookingPayoutReleasedArtisanEmail = (
  values: IBookingPayoutReleasedArtisanEmail,
) => {
  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.artisanName}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Your payout for Booking <strong>#${values.bookingNumber}</strong> has been <strong style="color: #059669;">RELEASED</strong>!
    </p>

    <!-- Payout Breakdown Table -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 12px 20px; font-weight: 600; font-size: 14px;">
        Payout Settlement Summary
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="10" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="font-weight: 600; width: 45%; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Booking Number:</td>
          <td style="color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">#${values.bookingNumber}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Job Title:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.jobTitle}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Gross Booking Amount:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">$${Number(values.totalAmount).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Platform Commission:</td>
          <td style="color: #dc2626; border-bottom: 1px solid #e2e8f0;">-$${Number(values.platformFee).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="font-weight: 700; padding-left: 20px; font-size: 15px; color: #0f172a;">Net Released Payout:</td>
          <td style="font-weight: 700; color: #059669; font-size: 16px;">$${Number(values.netPayoutAmount).toFixed(2)}</td>
        </tr>
      </table>
    </div>

    ${
      values.payoutTransferId
        ? `
    <p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0;">
      Settlement Reference: <strong>${values.payoutTransferId}</strong> (${values.payoutMethod || 'Direct Transfer'})
    </p>
    `
        : ''
    }

    <p style="font-size: 14px; color: #475569; margin: 0;">
      Thank you for being a valued professional on Nutsumo!
    </p>
  `;

  return {
    to: values.artisanEmail,
    subject: `Payout Released: $${Number(values.netPayoutAmount).toFixed(2)} for Booking #${values.bookingNumber} | Nutsumo`,
    html: wrapWithEmailLayout({
      headline: 'Payout Released to You! 💵',
      badgeText: 'Disbursed',
      badgeColor: '#059669',
      badgeBg: '#ecfdf5',
      bodyContent,
    }),
  };
};

import config from '../config';
import {
  IQuotationReceivedEmail,
  IQuotationAcceptedEmail,
  IBookingConfirmedCustomerEmail,
  IQuotationRejectedEmail,
} from '../types/emailTamplate';
import { wrapWithEmailLayout } from './baseTemplate';

// Email to Customer when Artisan submits a quotation
export const quotationReceivedCustomerEmail = (
  values: IQuotationReceivedEmail,
) => {
  const jobUrl = `${config.frontend_url}/jobs/${values.jobId}`;

  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.customerName}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Good news! Artisan <strong>${values.artisanName}</strong> has submitted a formal proposal for your job <strong>"${values.jobTitle}"</strong>.
    </p>

    <!-- Quotation Details Table -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 12px 20px; font-weight: 600; font-size: 14px;">
        Proposal Summary
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="10" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="font-weight: 600; width: 38%; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Job Title:</td>
          <td style="color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${values.jobTitle}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Artisan:</td>
          <td style="border-bottom: 1px solid #e2e8f0; color: #0f172a;">${values.artisanName}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Offered Price:</td>
          <td style="font-weight: 700; color: #059669; border-bottom: 1px solid #e2e8f0; font-size: 15px;">
            $${Number(values.proposedAmount).toFixed(2)} (${values.rateType})
          </td>
        </tr>
        ${
          values.estimatedDuration
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Est. Duration:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.estimatedDuration}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td style="font-weight: 600; padding-left: 20px; vertical-align: top;">Artisan Message:</td>
          <td style="color: #475569; font-style: italic;">"${values.message}"</td>
        </tr>
      </table>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0 16px 0;">
      <a href="${jobUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
        Review & Accept Quotation
      </a>
    </div>

    <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 0;">
      You can compare offers, message the artisan, or accept whenever you are ready.
    </p>
  `;

  return {
    to: values.customerEmail,
    subject: `New Quotation Received: ${values.jobTitle} | Nutsumo`,
    html: wrapWithEmailLayout({
      headline: 'New Quotation Received!',
      badgeText: 'New Proposal',
      badgeColor: '#2563eb',
      badgeBg: '#eff6ff',
      bodyContent,
    }),
  };
};

// Email to Artisan when Customer accepts their quotation
export const quotationAcceptedArtisanEmail = (
  values: IQuotationAcceptedEmail,
) => {
  const jobUrl = `${config.frontend_url}/jobs/${values.jobId}`;

  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.artisanName}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Congratulations! Your proposal for <strong>"${values.jobTitle}"</strong> has been <strong style="color: #059669;">ACCEPTED</strong> by <strong>${values.customerName}</strong>.
    </p>

    <!-- Booking Confirmation Details -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="background-color: #059669; color: #ffffff; padding: 12px 20px; font-weight: 600; font-size: 14px;">
        Booking Confirmed (#${values.bookingNumber})
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="10" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="font-weight: 600; width: 38%; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Job Title:</td>
          <td style="color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${values.jobTitle}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Customer Name:</td>
          <td style="border-bottom: 1px solid #e2e8f0; color: #0f172a;">${values.customerName}</td>
        </tr>
        ${
          values.customerPhone
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Contact Phone:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.customerPhone}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td style="font-weight: 600; padding-left: 20px;">Agreed Amount:</td>
          <td style="font-weight: 700; color: #059669; font-size: 15px;">
            $${Number(values.agreedAmount).toFixed(2)} (${values.rateType})
          </td>
        </tr>
      </table>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0 16px 0;">
      <a href="${jobUrl}" style="background-color: #059669; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-block; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);">
        View Booking Details
      </a>
    </div>

    <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 0;">
      Please coordinate with the customer to schedule and begin the work promptly.
    </p>
  `;

  return {
    to: values.artisanEmail,
    subject: `Proposal Accepted! Booking Confirmed: ${values.jobTitle} | Nutsumo`,
    html: wrapWithEmailLayout({
      headline: 'Quotation Accepted!',
      badgeText: 'Offer Accepted',
      badgeColor: '#059669',
      badgeBg: '#ecfdf5',
      bodyContent,
    }),
  };
};

// Email to Customer confirming their booking after quotation acceptance
export const bookingConfirmedCustomerEmail = (
  values: IBookingConfirmedCustomerEmail,
) => {
  const jobUrl = `${config.frontend_url}/jobs/${values.jobId}`;

  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.customerName}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      You have successfully accepted the proposal from <strong>${values.artisanName}</strong> for <strong>"${values.jobTitle}"</strong>.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 12px 20px; font-weight: 600; font-size: 14px;">
        Booking Reference: ${values.bookingNumber}
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="10" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="font-weight: 600; width: 38%; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Job:</td>
          <td style="color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${values.jobTitle}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Selected Artisan:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.artisanName}</td>
        </tr>
        ${
          values.artisanPhone
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Artisan Phone:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.artisanPhone}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td style="font-weight: 600; padding-left: 20px;">Agreed Price:</td>
          <td style="font-weight: 700; color: #059669; font-size: 15px;">
            $${Number(values.agreedAmount).toFixed(2)} (${values.rateType})
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 32px 0 16px 0;">
      <a href="${jobUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-block;">
        View Job & Booking
      </a>
    </div>
  `;

  return {
    to: values.customerEmail,
    subject: `Booking Confirmed for "${values.jobTitle}" | Nutsumo`,
    html: wrapWithEmailLayout({
      headline: 'Booking Confirmed!',
      badgeText: 'Confirmed',
      badgeColor: '#059669',
      badgeBg: '#ecfdf5',
      bodyContent,
    }),
  };
};

// Email to Artisan when their quotation is declined / not selected
export const quotationRejectedArtisanEmail = (
  values: IQuotationRejectedEmail,
) => {
  const jobsUrl = `${config.frontend_url}/jobs`;

  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.artisanName}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
      Thank you for submitting your proposal for <strong>"${values.jobTitle}"</strong>.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
      ${
        values.reason
          ? `Reason: ${values.reason}`
          : 'The customer has decided to proceed with another proposal for this job at this time.'
      }
    </p>

    <div style="text-align: center; margin: 32px 0 16px 0;">
      <a href="${jobsUrl}" style="background-color: #0f172a; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-block;">
        Explore Other Jobs
      </a>
    </div>

    <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 0;">
      New jobs are posted every day on Nutsumo. Don't miss your next opportunity!
    </p>
  `;

  return {
    to: values.artisanEmail,
    subject: `Update on your quotation for "${values.jobTitle}" | Nutsumo`,
    html: wrapWithEmailLayout({
      headline: 'Proposal Update',
      badgeText: 'Closed',
      badgeColor: '#64748b',
      badgeBg: '#f1f5f9',
      bodyContent,
    }),
  };
};

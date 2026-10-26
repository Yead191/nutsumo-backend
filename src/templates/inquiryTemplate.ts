import {
  IInquiryUserConfirmation,
  IInquiryAdminNotification,
} from '../types/emailTamplate';
import { wrapWithEmailLayout } from './baseTemplate';

export const inquiryUserConfirmation = (values: IInquiryUserConfirmation) => {
  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Dear <strong>${values.name}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Thank you for reaching out to <strong>Nutsumo</strong>. We have received your inquiry and our team will get back to you shortly.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 12px 20px; font-weight: 600; font-size: 14px;">
        Inquiry Details
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="10" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="font-weight: 600; width: 35%; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Project / Need:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.projectDescription}</td>
        </tr>
        ${
          values.budget
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Estimated Budget:</td>
          <td style="border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${values.budget}</td>
        </tr>
        `
            : ''
        }
        ${
          values.phone
            ? `
        <tr>
          <td style="font-weight: 600; padding-left: 20px;">Contact Phone:</td>
          <td>${values.phone}</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 0;">
      If you have additional information to add, please reply to this thread or reach out to our team.
    </p>
  `;

  return {
    to: values.email,
    subject: 'We Received Your Inquiry | Nutsumo',
    html: wrapWithEmailLayout({
      headline: 'Inquiry Received',
      badgeText: 'Message Confirmed',
      badgeColor: '#0284c7',
      badgeBg: '#f0f9ff',
      bodyContent,
    }),
  };
};

export const inquiryAdminNotification = (values: IInquiryAdminNotification) => {
  const bodyContent = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
      Hello Administrator,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      A new user inquiry has been submitted on Nutsumo by <strong>${values.name}</strong> (${values.email}).
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 12px 20px; font-weight: 600; font-size: 14px;">
        Inquiry Submission
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="10" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="font-weight: 600; width: 35%; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Name:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.name}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Email:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.email}</td>
        </tr>
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
          values.budget
            ? `
        <tr>
          <td style="font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-left: 20px;">Budget:</td>
          <td style="border-bottom: 1px solid #e2e8f0;">${values.budget}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td style="font-weight: 600; padding-left: 20px;">Message:</td>
          <td>${values.projectDescription}</td>
        </tr>
      </table>
    </div>
  `;

  return {
    to: values.adminEmail,
    subject: `New Inquiry: ${values.name} | Nutsumo Admin`,
    html: wrapWithEmailLayout({
      headline: 'New Inquiry Received',
      badgeText: 'Admin Notification',
      badgeColor: '#4f46e5',
      badgeBg: '#eef2ff',
      bodyContent,
    }),
  };
};

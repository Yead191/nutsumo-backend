import config from '../config';
import {
  IServiceBookingUserConfirmation,
  IServiceBookingAdminNotification,
} from '../types/emailTamplate';

const getLogoUrl = () => {
  return 'https://res.cloudinary.com/dknmebeee/image/upload/v1787648884/ifundayiti-logo_pxyeoe.png';
};

export const serviceBookingUserConfirmation = (
  values: IServiceBookingUserConfirmation,
) => {
  const logoUrl = getLogoUrl();

  return {
    to: values.email,
    subject: `Service Booking Confirmed: ${values.serviceTitle}`,
    html: `
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 40px 0; color: #333333; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 30px rgba(0,51,160,0.10); margin: 30px auto;">
          <!-- Header/Logo Section -->
          <tr>
            <td align="center" style="background-color: #EDE0CB; padding: 36px 20px 28px 20px; border-bottom: 4px solid #E4002B;">
              <img src="${logoUrl}" alt="IFundAyiti Logo" style="display: block; width: 100px; height: auto; margin: 0 auto;" />
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="background-color: #d1fae5; color: #065f46; padding: 6px 16px; border-radius: 50px; font-size: 14px; font-weight: 600;">
                  Booking Confirmed ✓
                </span>
              </div>
              <h1 style="color: #0033A0; font-size: 22px; font-weight: 700; margin: 0 0 20px 0; text-align: center;">
                Thank You for Your Booking!
              </h1>
              <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin: 0 0 20px 0;">
                Dear <strong>${values.name}</strong>,
              </p>
              <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin: 0 0 24px 0;">
                We have received your payment and confirmed your booking for <strong>${values.serviceTitle}</strong>. Here are your booking details:
              </p>
              
              <!-- Booking Details Box -->
              <div style="background-color: #f8faff; border: 1px solid #dce8ff; border-left: 4px solid #0033A0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 14px; color: #4b5563;">
                  <tr>
                    <td style="font-weight: bold; width: 40%; border-bottom: 1px solid #eef1f8;">Service:</td>
                    <td style="font-weight: bold; color: #0033A0; border-bottom: 1px solid #eef1f8;">${values.serviceTitle}</td>
                  </tr>
                  ${
                    values.originalPrice && values.originalPrice > values.price
                      ? `
                  <tr>
                    <td style="font-weight: bold; border-bottom: 1px solid #eef1f8;">Original Price:</td>
                    <td style="border-bottom: 1px solid #eef1f8;">$${values.originalPrice.toFixed(2)}</td>
                  </tr>
                  `
                      : ''
                  }
                  ${
                    values.couponCode || values.discountAmount
                      ? `
                  <tr>
                    <td style="font-weight: bold; border-bottom: 1px solid #eef1f8;">Discount${values.couponCode ? ` (${values.couponCode})` : ''}:</td>
                    <td style="color: #E4002B; font-weight: bold; border-bottom: 1px solid #eef1f8;">-${values.discountAmount ? `$${values.discountAmount.toFixed(2)}` : 'Applied'}</td>
                  </tr>
                  `
                      : ''
                  }
                  <tr>
                    <td style="font-weight: bold; border-bottom: 1px solid #eef1f8;">Amount Paid:</td>
                    <td style="font-weight: bold; color: #0033A0; border-bottom: 1px solid #eef1f8;">$${values.price.toFixed(2)}</td>
                  </tr>
                  ${
                    values.phone
                      ? `
                  <tr>
                    <td style="font-weight: bold; border-bottom: 1px solid #eef1f8;">Contact Number:</td>
                    <td style="border-bottom: 1px solid #eef1f8;">${values.phone}</td>
                  </tr>
                  `
                      : ''
                  }
                  ${
                    values.preferredDate
                      ? `
                  <tr>
                    <td style="font-weight: bold; border-bottom: 1px solid #eef1f8;">Preferred Date:</td>
                    <td style="border-bottom: 1px solid #eef1f8;">${values.preferredDate}</td>
                  </tr>
                  `
                      : ''
                  }
                  ${
                    values.preferredTime
                      ? `
                  <tr>
                    <td style="font-weight: bold; border-bottom: 1px solid #eef1f8;">Preferred Time:</td>
                    <td style="border-bottom: 1px solid #eef1f8;">${values.preferredTime}</td>
                  </tr>
                  `
                      : ''
                  }
                  ${
                    values.transactionId
                      ? `
                  <tr>
                    <td style="font-weight: bold; border-bottom: 1px solid #eef1f8;">Transaction ID:</td>
                    <td style="font-family: monospace; border-bottom: 1px solid #eef1f8;">${values.transactionId}</td>
                  </tr>
                  `
                      : ''
                  }
                  ${
                    values.note
                      ? `
                  <tr>
                    <td style="font-weight: bold;">Note:</td>
                    <td>${values.note}</td>
                  </tr>
                  `
                      : ''
                  }
                </table>
              </div>

              <!-- Haitian flag accent divider -->
              <div style="height: 4px; background: linear-gradient(90deg, #0033A0 50%, #E4002B 50%); border-radius: 2px; margin: 24px 0;"></div>
              
              <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin: 0 0 0 0;">
                Best regards,<br />
                <strong style="color: #0033A0;">The IFundAyiti Team</strong><br />
                <span style="font-size: 13px; color: #6b7280; font-style: italic;">Invest. Build. Change Haiti.</span>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f8faff; padding: 28px 20px; border-top: 1px solid #dce8ff; text-align: center;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0 0 8px 0; line-height: 1.5;">
                This is an automated confirmation email. Please do not reply directly to this email.
              </p>
              <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} IFundAyiti. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
    `,
  };
};

export const serviceBookingAdminNotification = (
  values: IServiceBookingAdminNotification,
) => {
  const logoUrl = getLogoUrl();

  return {
    to: values.adminEmail,
    subject: `New Service Booking: ${values.serviceTitle}`,
    html: `
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 40px 0; color: #333333; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 30px rgba(0,51,160,0.10); margin: 30px auto;">
          <!-- Header/Logo Section -->
          <tr>
            <td align="center" style="background-color: #EDE0CB; padding: 36px 20px 28px 20px; border-bottom: 4px solid #E4002B;">
              <img src="${logoUrl}" alt="IFundAyiti Logo" style="display: block; width: 100px; height: auto; margin: 0 auto;" />
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              <h1 style="color: #0033A0; font-size: 22px; font-weight: 700; margin: 0 0 20px 0; text-align: center;">
                New Service Booking Notification
              </h1>
              <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin: 0 0 20px 0;">
                Hello Administrator,
              </p>
              <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin: 0 0 24px 0;">
                A new service booking has been placed by <strong>${values.customerName}</strong> (${values.customerEmail}). Here are the details:
              </p>
              
              <!-- Booking Details Box -->
              <div style="background-color: #f8faff; border: 1px solid #dce8ff; border-left: 4px solid #0033A0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 14px; color: #4b5563;">
                  <tr>
                    <td style="font-weight: bold; width: 40%; border-bottom: 1px solid #eef1f8;">Customer:</td>
                    <td style="border-bottom: 1px solid #eef1f8;">${values.customerName} (${values.customerEmail})</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; border-bottom: 1px solid #eef1f8;">Service:</td>
                    <td style="font-weight: bold; color: #0033A0; border-bottom: 1px solid #eef1f8;">${values.serviceTitle}</td>
                  </tr>
                  ${
                    values.originalPrice && values.originalPrice > values.price
                      ? `
                  <tr>
                    <td style="font-weight: bold; border-bottom: 1px solid #eef1f8;">Original Price:</td>
                    <td style="border-bottom: 1px solid #eef1f8;">$${values.originalPrice.toFixed(2)}</td>
                  </tr>
                  `
                      : ''
                  }
                  ${
                    values.couponCode || values.discountAmount
                      ? `
                  <tr>
                    <td style="font-weight: bold; border-bottom: 1px solid #eef1f8;">Discount${values.couponCode ? ` (${values.couponCode})` : ''}:</td>
                    <td style="color: #E4002B; font-weight: bold; border-bottom: 1px solid #eef1f8;">-${values.discountAmount ? `$${values.discountAmount.toFixed(2)}` : 'Applied'}</td>
                  </tr>
                  `
                      : ''
                  }
                  <tr>
                    <td style="font-weight: bold; border-bottom: 1px solid #eef1f8;">Amount Paid:</td>
                    <td style="font-weight: bold; color: #0033A0; border-bottom: 1px solid #eef1f8;">$${values.price.toFixed(2)}</td>
                  </tr>
                  ${
                    values.phone
                      ? `
                  <tr>
                    <td style="font-weight: bold; border-bottom: 1px solid #eef1f8;">Contact Number:</td>
                    <td style="border-bottom: 1px solid #eef1f8;">${values.phone}</td>
                  </tr>
                  `
                      : ''
                  }
                  ${
                    values.preferredDate
                      ? `
                  <tr>
                    <td style="font-weight: bold; border-bottom: 1px solid #eef1f8;">Preferred Date:</td>
                    <td style="border-bottom: 1px solid #eef1f8;">${values.preferredDate}</td>
                  </tr>
                  `
                      : ''
                  }
                  ${
                    values.preferredTime
                      ? `
                  <tr>
                    <td style="font-weight: bold; border-bottom: 1px solid #eef1f8;">Preferred Time:</td>
                    <td style="border-bottom: 1px solid #eef1f8;">${values.preferredTime}</td>
                  </tr>
                  `
                      : ''
                  }
                  ${
                    values.transactionId
                      ? `
                  <tr>
                    <td style="font-weight: bold; border-bottom: 1px solid #eef1f8;">Transaction ID:</td>
                    <td style="font-family: monospace; border-bottom: 1px solid #eef1f8;">${values.transactionId}</td>
                  </tr>
                  `
                      : ''
                  }
                  ${
                    values.note
                      ? `
                  <tr>
                    <td style="font-weight: bold;">Note:</td>
                    <td>${values.note}</td>
                  </tr>
                  `
                      : ''
                  }
                </table>
              </div>

              <!-- Haitian flag accent divider -->
              <div style="height: 4px; background: linear-gradient(90deg, #0033A0 50%, #E4002B 50%); border-radius: 2px; margin: 24px 0;"></div>
              
              <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin: 0 0 0 0;">
                Best regards,<br />
                <strong style="color: #0033A0;">IFundAyiti System Notification</strong><br />
                <span style="font-size: 13px; color: #6b7280; font-style: italic;">Invest. Build. Change Haiti.</span>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f8faff; padding: 28px 20px; border-top: 1px solid #dce8ff; text-align: center;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0 0 8px 0; line-height: 1.5;">
                This is an automated administrative notification.
              </p>
              <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} IFundAyiti. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
    `,
  };
};

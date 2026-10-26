import config from '../config';

export const NUTSUMO_LOGO_URL =
  'https://res.cloudinary.com/dknmebeee/image/upload/v1793003088/logo-nutsumo_yribt1.png';

interface EmailLayoutOptions {
  headline?: string;
  badgeText?: string;
  badgeColor?: string;
  badgeBg?: string;
  bodyContent: string;
}

export const wrapWithEmailLayout = ({
  headline,
  badgeText,
  badgeColor = '#059669',
  badgeBg = '#ecfdf5',
  bodyContent,
}: EmailLayoutOptions) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nutsumo</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 40px 16px; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04); margin: 0 auto; border: 1px solid #e2e8f0;">
          
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="background-color: #ffffff; padding: 36px 30px 26px 30px; border-bottom: 1px solid #f1f5f9;">
              <a href="${config.frontend_url || '#'}" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="${NUTSUMO_LOGO_URL}" alt="Nutsumo" width="170" style="display: block; width: 170px; max-width: 100%; height: auto; border: 0; outline: none; margin: 0 auto;" />
              </a>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              ${
                badgeText
                  ? `
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; letter-spacing: 0.3px;">
                  ${badgeText}
                </span>
              </div>
              `
                  : ''
              }
              ${
                headline
                  ? `
              <h1 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 20px 0; text-align: center; letter-spacing: -0.3px; line-height: 1.3;">
                ${headline}
              </h1>
              `
                  : ''
              }
              
              ${bodyContent}

              <!-- Divider -->
              <div style="height: 1px; background-color: #e2e8f0; margin: 28px 0;"></div>

              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0;">
                Best regards,<br />
                <strong style="color: #0f172a; font-size: 15px;">The Nutsumo Team</strong><br />
                <span style="font-size: 13px; color: #64748b;">Earned Trust • Verified Artisans</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafc; padding: 24px 28px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0; line-height: 1.5;">
                This email was sent by <strong>Nutsumo</strong>. Please do not reply directly to this automated email.
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} Nutsumo. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

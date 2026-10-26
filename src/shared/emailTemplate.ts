import {
  createAccount,
  resetPassword,
  welcomeAccount,
} from '../templates/authTemplate';

import {
  serviceBookingUserConfirmation,
  serviceBookingAdminNotification,
} from '../templates/serviceBookingTemplate';

export const emailTemplate = {
  createAccount,
  resetPassword,
  welcomeAccount,

  serviceBookingUserConfirmation,
  serviceBookingAdminNotification,
};

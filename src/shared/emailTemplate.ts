import {
  createAccount,
  resetPassword,
  welcomeAccount,
} from '../templates/authTemplate';

import {
  serviceBookingUserConfirmation,
  serviceBookingAdminNotification,
} from '../templates/serviceBookingTemplate';

import {
  inquiryUserConfirmation,
  inquiryAdminNotification,
} from '../templates/inquiryTemplate';

import {
  membershipSubscriptionUserConfirmation,
  adminMembershipNotification,
  subscriptionPaymentSuccess,
  subscriptionPaymentFailed,
  subscriptionCancelled,
} from '../templates/subscriptionTemplate';

import {
  quotationReceivedCustomerEmail,
  quotationAcceptedArtisanEmail,
  bookingConfirmedCustomerEmail,
  quotationRejectedArtisanEmail,
} from '../templates/quotationTemplate';

export const emailTemplate = {
  createAccount,
  resetPassword,
  welcomeAccount,

  serviceBookingUserConfirmation,
  serviceBookingAdminNotification,

  inquiryUserConfirmation,
  inquiryAdminNotification,

  membershipSubscriptionUserConfirmation,
  adminMembershipNotification,
  subscriptionPaymentSuccess,
  subscriptionPaymentFailed,
  subscriptionCancelled,

  quotationReceivedCustomerEmail,
  quotationAcceptedArtisanEmail,
  bookingConfirmedCustomerEmail,
  quotationRejectedArtisanEmail,
};


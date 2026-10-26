import nodemailer from 'nodemailer';
import config from '../config';
import { errorLogger, logger } from '../shared/logger';
import { ISendEmail } from '../types/email';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: Number(config.email.port),
  secure: false,
  pool: true,
  maxConnections: 1,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 2,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
} as any);

const sendEmail = async (values: ISendEmail) => {
  try {
    const info = await transporter.sendMail({
      from: `${config.project_name} <${config.email.from}>`,
      to: values.to,
      subject: values.subject,
      html: values.html,
    });

    logger.info('Mail send successfully', info.accepted);
    return { success: true, accepted: info.accepted };
  } catch (error) {
    errorLogger.error('Email Message failed:', error);
    throw error;
  }
};

// Transporter for order-related emails
const orderTransporter = nodemailer.createTransport({
  host: config.email.order_host,
  port: Number(config.email.order_port),
  secure: false,
  auth: {
    user: config.email.order_user,
    pass: config.email.order_pass,
  },
});
const sendOrderEmail = async (values: ISendEmail) => {
  try {
    const info = await orderTransporter.sendMail({
      from: `${config.project_name} <${config.email.order_from}>`,
      to: values.to,
      subject: values.subject,
      html: values.html,
    });
    logger.info('Order email sent successfully', info.accepted);
  } catch (error) {
    errorLogger.error('Order Email Error', error);
  }
};

export const emailHelper = {
  sendEmail,
  sendOrderEmail,
};

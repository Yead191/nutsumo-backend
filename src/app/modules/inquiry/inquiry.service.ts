import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Inquiry } from './inquiry.model';
import { NotificationServices } from '../notification/notification.service';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import config from '../../../config';

const createInquiry = async (payload: any) => {
  const email = payload.email?.trim().toLowerCase();

  if (email) {
    const existingInquiry = await Inquiry.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') },
    }).sort({ createdAt: -1 });

    if (existingInquiry && existingInquiry.createdAt) {
      const diffMs = Date.now() - new Date(existingInquiry.createdAt).getTime();
      const oneHourMs = 60 * 60 * 1000;
      if (diffMs < oneHourMs) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'An inquiry with this email address was already submitted within the last hour. Please try again later.',
        );
      }
    }
  }

  const result = await Inquiry.create(payload);

  // Send Notification to Admins
  try {
    await NotificationServices.sendNotificationToAdmins({
      title: 'New Project Inquiry',
      message: `${result.name} submitted a new inquiry regarding "${result.projectDescription ? result.projectDescription.substring(0, 40) : ''}${result.projectDescription && result.projectDescription.length > 40 ? '...' : ''}".`,
      refId: result._id,
      path: '/inquiries',
    });
  } catch (notifErr) {
    console.error('Failed to send admin notification for inquiry:', notifErr);
  }

  // Send Auto Confirmation Email to User
  if (result.email) {
    try {
      const userEmailData = emailTemplate.inquiryUserConfirmation({
        name: result.name,
        email: result.email,
        projectDescription: result.projectDescription,
        budget: result.budget,
        phone: result.phone,
        company: result.company,
      });
      await emailHelper.sendEmail(userEmailData);
    } catch (emailErr) {
      console.error(
        'Failed to send user inquiry confirmation email:',
        emailErr,
      );
    }
  }

  // Send Notification Email to Admin
  const adminEmail = config.super_admin.email;
  if (adminEmail) {
    try {
      const adminEmailData = emailTemplate.inquiryAdminNotification({
        adminEmail: adminEmail,
        name: result.name,
        email: result.email,
        projectDescription: result.projectDescription,
        budget: result.budget,
        phone: result.phone,
        company: result.company,
      });
      await emailHelper.sendEmail(adminEmailData);
    } catch (emailErr) {
      console.error(
        'Failed to send admin inquiry notification email:',
        emailErr,
      );
    }
  }

  return result;
};

const getAllInqueriesFromDB = async (query: Record<string, any>) => {
  const qb = new QueryBuilder(Inquiry.find(), query)
    .search(['name', 'email', 'phone', 'company'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [inqueries, pagination] = await Promise.all([
    qb.modelQuery.lean(),
    qb.getPaginationInfo(),
  ]);
  return { inqueries, pagination };
};

const getSingleInqueryFromDB = async (id: string) => {
  const isExist = await Inquiry.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Inquiry not found');
  }
  return isExist;
};

const updateInquiryInDB = async (id: string, payload: any) => {
  const isExist = await Inquiry.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Inquiry not found');
  }
  const result = await Inquiry.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const deleteInquiryFromDB = async (id: string) => {
  const isExist = await Inquiry.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Inquiry not found');
  }
  const result = await Inquiry.findByIdAndDelete(id);
  return result;
};

export const InquiryServices = {
  createInquiry,
  getAllInqueriesFromDB,
  getSingleInqueryFromDB,
  updateInquiryInDB,
  deleteInquiryFromDB,
};

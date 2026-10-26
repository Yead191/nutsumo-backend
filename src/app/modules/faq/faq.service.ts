import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { IFAQ } from './faq.interface';
import { FAQ } from './faq.model';
import QueryBuilder from '../../builder/QueryBuilder';
import { USER_ROLES } from '../../../enums/user';

const createFaq = async (payload: IFAQ) => {
  const result = await FAQ.create(payload);
  return result;
};

const getAllFaqs = async (
  user?: JwtPayload,
  query?: Record<string, unknown>,
) => {
  const isAdmin =
    user && [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(user?.role);

  const initQuery: Record<string, unknown> = {};

  if (!isAdmin) {
    initQuery.isActive = true;
  }

  const queryParams = { ...query };
  if (!queryParams.sort) {
    queryParams.sort = 'order createdAt';
  }

  const faqQuery = new QueryBuilder(FAQ.find(initQuery), queryParams)
    .search(['title', 'items.question', 'items.answer'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, pagination] = await Promise.all([
    faqQuery.modelQuery.lean(),
    faqQuery.getPaginationInfo(),
  ]);

  return {
    result,
    pagination,
  };
};

const getSingleFaq = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid FAQ ID');
  }
  const result = await FAQ.findById(id);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }
  return result;
};

const updateFaq = async (id: string, payload: Partial<IFAQ>) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid FAQ ID');
  }
  const existingFaq = await FAQ.findById(id);
  if (!existingFaq) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }
  const result = await FAQ.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const deleteFaq = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid FAQ ID');
  }
  const result = await FAQ.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }
  return result;
};

export const FaqServices = {
  createFaq,
  getAllFaqs,
  getSingleFaq,
  updateFaq,
  deleteFaq,
};

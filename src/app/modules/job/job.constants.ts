import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { Category } from '../category/category.model';
import { Service } from '../service/service.model';

export const JOB_CONSTANT = 'someValue';
export const JOB_STATUSES = {
  OPEN: 'OPEN',
  BOOKED: 'BOOKED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const validateObjectId = (id: string, fieldName = 'ID') => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${fieldName}`);
  }
};

export const getActiveCustomer = async (customerId: string) => {
  validateObjectId(customerId, 'customer ID');

  const customer = await User.findById(customerId);

  if (!customer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Customer not found');
  }

  if (customer.status !== 'active') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Your account is not active');
  }

  if (customer.role !== USER_ROLES.USER) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only customers can perform this action',
    );
  }

  return customer;
};

export const validateCatalogSelection = async (
  categoryId?: string | null,
  serviceId?: string | null,
) => {
  let resolvedCategoryId = categoryId || null;

  if (resolvedCategoryId) {
    validateObjectId(resolvedCategoryId, 'category ID');

    const category = await Category.findById(resolvedCategoryId);

    if (!category || !category.isActive) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Selected category is unavailable',
      );
    }
  }

  if (serviceId) {
    validateObjectId(serviceId, 'service ID');

    const service = await Service.findById(serviceId);

    if (!service || !service.isActive) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Selected service is unavailable',
      );
    }

    // A service always belongs to a category.
    const serviceCategoryId = service.category.toString();

    if (resolvedCategoryId && resolvedCategoryId !== serviceCategoryId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Selected service does not belong to the selected category',
      );
    }

    // If only service is provided, infer its category.
    resolvedCategoryId = serviceCategoryId;
  }

  return {
    category: resolvedCategoryId,
    service: serviceId || null,
  };
};

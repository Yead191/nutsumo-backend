import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { IService } from './service.interface';
import { Service } from './service.model';
import { Category } from '../category/category.model';
import { ArtisanService } from '../artisanService/artisanService.model';
import { generateSlug } from '../category/category.service';
import unlinkFile from '../../../shared/unlinkFile';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import QueryBuilder from '../../builder/QueryBuilder';

const createService = async (payload: Partial<IService>): Promise<IService> => {
  if (!payload.name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Service name is required');
  }
  if (!payload.category) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Category reference is required',
    );
  }

  // Validate category reference exists and is active
  if (!mongoose.Types.ObjectId.isValid(payload.category.toString())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Category ID');
  }

  const category = await Category.findById(payload.category);
  if (!category) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Referenced category does not exist',
    );
  }

  if (!category.isActive) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot create a service under an inactive category. Please activate the category first.',
    );
  }

  const slug = generateSlug(payload.name);
  const isExist = await Service.findOne({
    category: payload.category,
    slug,
  });

  if (isExist) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'A service with this name already exists in the selected category',
    );
  }

  const result = await Service.create({
    ...payload,
    slug,
  });

  return await result.populate('category');
};

const getAllServices = async (
  user: JwtPayload,
  query: Record<string, any> = {},
) => {
  const initQuery = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(
    user?.role,
  )
    ? {}
    : { isActive: true };

  const qb = new QueryBuilder(Service.find(initQuery), query)
    .search(['name', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [services, pagination] = await Promise.all([
    qb.modelQuery.lean().populate('category', 'name slug isActive image'),
    qb.getPaginationInfo(),
  ]);

  return { services, pagination };
};

const getSingleService = async (id: string): Promise<IService | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID');
  }

  const service = await Service.findById(id).populate('category');
  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  }

  return service;
};

const updateService = async (
  id: string,
  payload: Partial<IService>,
): Promise<IService | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID');
  }

  const service = await Service.findById(id);
  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  }

  const updateData: Partial<IService> = { ...payload };

  // If category changed, validate new category
  const targetCategory = payload.category || service.category;
  if (
    payload.category &&
    payload.category.toString() !== service.category.toString()
  ) {
    if (!mongoose.Types.ObjectId.isValid(payload.category.toString())) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Category ID');
    }
    const cat = await Category.findById(payload.category);
    if (!cat) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'New category does not exist');
    }
    if (!cat.isActive) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cannot assign service to an inactive category',
      );
    }
  }

  // If name changed, update slug and verify uniqueness within category
  if (payload.name && payload.name !== service.name) {
    const slug = generateSlug(payload.name);
    const isExist = await Service.findOne({
      category: targetCategory,
      slug,
      _id: { $ne: id },
    });
    if (isExist) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'A service with this name already exists in the category',
      );
    }
    updateData.slug = slug;
  }

  if (service.image && payload.image && payload.image !== service.image) {
    unlinkFile(service.image);
  }

  const result = await Service.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate('category');

  return result;
};

const deleteService = async (id: string): Promise<IService | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID');
  }

  const service = await Service.findById(id);
  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  }

  // Requirement: Protect existing references when services are deleted
  const artisanCount = await ArtisanService.countDocuments({ service: id });
  if (artisanCount > 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot delete service: ${artisanCount} artisan(s) currently offer this service in their profiles. Please deactivate the service instead.`,
    );
  }

  if (service.image) {
    unlinkFile(service.image);
  }

  const result = await Service.findByIdAndDelete(id);
  return result;
};

export const ServiceServices = {
  createService,
  getAllServices,
  getSingleService,
  updateService,
  deleteService,
};

import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IServiceCategory } from './serviceCategory.interface';
import { ServiceCategory } from './serviceCategory.model';
import unlinkFile from '../../../shared/unlinkFile';

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const createCategory = async (
  payload: Partial<IServiceCategory>,
): Promise<IServiceCategory> => {
  if (!payload.name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Category name is required');
  }

  const slug = generateSlug(payload.name);
  const isExist = await ServiceCategory.findOne({
    $or: [{ name: payload.name }, { slug }],
  });

  if (isExist) {
    throw new ApiError(StatusCodes.CONFLICT, 'Service category already exists');
  }

  const result = await ServiceCategory.create({
    ...payload,
    slug,
  });

  return result;
};

const getAllCategories = async (query: Record<string, unknown> = {}) => {
  const filter: Record<string, unknown> = {};
  if (query.status) {
    filter.status = query.status;
  } else {
    // By default, return active categories for clients/artisans
    filter.status = 'active';
  }

  const result = await ServiceCategory.find(filter).sort({ name: 1 });
  return result;
};

const getSingleCategory = async (
  id: string,
): Promise<IServiceCategory | null> => {
  const result = await ServiceCategory.findById(id);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service category not found');
  }
  return result;
};

const updateCategory = async (
  id: string,
  payload: Partial<IServiceCategory>,
): Promise<IServiceCategory | null> => {
  const updateData: Partial<IServiceCategory> = { ...payload };
  if (payload.name) {
    updateData.slug = generateSlug(payload.name);
  }

  const category = await ServiceCategory.findById(id);
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service category not found');
  }
  if (payload.image && payload.image !== category.image) {
    unlinkFile(category.image!);
  }

  const result = await ServiceCategory.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service category not found');
  }

  return result;
};

const deleteCategory = async (id: string): Promise<IServiceCategory | null> => {
  const category = await ServiceCategory.findById(id);
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service category not found');
  }
  if (category.image) {
    unlinkFile(category.image);
  }
  const result = await ServiceCategory.findByIdAndDelete(id);
  return result;
};

export const ServiceCategoryServices = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};

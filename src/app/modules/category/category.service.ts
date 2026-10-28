import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { ICategory } from './category.interface';
import { Category } from './category.model';
import { Service } from '../service/service.model';
import unlinkFile from '../../../shared/unlinkFile';

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const createCategory = async (payload: Partial<ICategory>): Promise<ICategory> => {
  if (!payload.name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Category name is required');
  }

  const slug = generateSlug(payload.name);
  const isExist = await Category.findOne({
    $or: [{ name: payload.name }, { slug }],
  });

  if (isExist) {
    throw new ApiError(StatusCodes.CONFLICT, 'Category already exists');
  }

  const result = await Category.create({
    ...payload,
    slug,
  });

  return result;
};

const getAllCategories = async (query: Record<string, unknown> = {}) => {
  const filter: Record<string, unknown> = {};

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true' || query.isActive === true;
  } else if (query.all !== 'true' && query.all !== true) {
    // Default to active categories for public/artisan catalog
    filter.isActive = true;
  }

  if (query.searchTerm) {
    filter.$or = [
      { name: { $regex: query.searchTerm, $options: 'i' } },
      { description: { $regex: query.searchTerm, $options: 'i' } },
    ];
  }

  const categories = await Category.find(filter).sort({ name: 1 });

  // Attach services and servicesCount for rich UI experience
  const categoryIds = categories.map(c => c._id);
  const allServices = await Service.find({
    category: { $in: categoryIds },
    isActive: true,
  }).sort({ name: 1 });

  const serviceMap: Record<string, any[]> = {};
  allServices.forEach(s => {
    const catId = s.category.toString();
    if (!serviceMap[catId]) serviceMap[catId] = [];
    serviceMap[catId].push(s);
  });

  const enriched = categories.map(cat => {
    const catServices = serviceMap[cat._id.toString()] || [];
    return {
      ...cat.toObject(),
      servicesCount: catServices.length,
      services: catServices.map(s => s.name),
      serviceList: catServices,
    };
  });

  return enriched;
};

const getSingleCategory = async (idOrSlug: string): Promise<any> => {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
  const filter = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

  const category = await Category.findOne(filter);
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  // Also include services in this category
  const services = await Service.find({ category: category._id }).sort({ name: 1 });

  return {
    ...category.toObject(),
    services,
  };
};

const updateCategory = async (
  id: string,
  payload: Partial<ICategory>,
): Promise<ICategory | null> => {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  const updateData: Partial<ICategory> = { ...payload };

  if (payload.name && payload.name !== category.name) {
    const slug = generateSlug(payload.name);
    const isExist = await Category.findOne({
      slug,
      _id: { $ne: id },
    });
    if (isExist) {
      throw new ApiError(StatusCodes.CONFLICT, 'Category name already taken');
    }
    updateData.slug = slug;
  }

  if (category.image && payload.image && payload.image !== category.image) {
    unlinkFile(category.image);
  }

  const result = await Category.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteCategory = async (id: string): Promise<ICategory | null> => {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  // Requirement: Protect existing references when categories are deleted
  const associatedServicesCount = await Service.countDocuments({ category: id });
  if (associatedServicesCount > 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot delete category: ${associatedServicesCount} service(s) are associated with this category. Please delete or reassign them first, or deactivate the category.`,
    );
  }

  if (category.image) {
    unlinkFile(category.image);
  }

  const result = await Category.findByIdAndDelete(id);
  return result;
};

export const CategoryServices = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};

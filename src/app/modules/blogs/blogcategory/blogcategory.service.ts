import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../../errors/ApiError';
import QueryBuilder from '../../../builder/QueryBuilder';
import { generateSlug } from '../../../../util/generateSlug';
import { IBlogcategory } from './blogcategory.interface';
import { BlogCategory } from './blogcategory.model';
import { blogcategorySearchableFields } from './blogcategory.constants';
import { Blog } from '../blog/blog.model';

const createCategoryToDB = async (payload: { name: string }) => {
  const slug = generateSlug(payload.name);

  const isExist = await BlogCategory.findOne({
    $or: [
      { name: { $regex: new RegExp(`^${payload.name.trim()}$`, 'i') } },
      { slug },
    ],
  });

  if (isExist) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'A blog category with this name already exists.',
    );
  }

  const result = await BlogCategory.create({
    name: payload.name.trim(),
    slug,
  });

  return result;
};

const getAllCategoriesFromDB = async (query: Record<string, unknown>) => {
  const queryParams = { ...query };
  if (!queryParams.sort) {
    queryParams.sort = 'name';
  }

  const categoryQuery = new QueryBuilder(BlogCategory.find(), queryParams)
    .search(blogcategorySearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const [rawCategories, pagination] = await Promise.all([
    categoryQuery.modelQuery.lean(),
    categoryQuery.getPaginationInfo(),
  ]);

  const categories = rawCategories as unknown as Array<
    IBlogcategory & { _id: Types.ObjectId }
  >;
  const categoryIds = categories.map(c => c._id);

  const blogCounts = await Blog.aggregate([
    { $match: { category: { $in: categoryIds } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(
    blogCounts.map(item => [item._id.toString(), item.count]),
  );

  const result = categories.map(cat => ({
    ...cat,
    blogCount: countMap.get(cat._id.toString()) || 0,
  }));

  return {
    pagination,
    result,
  };
};

const getSingleCategoryFromDB = async (idOrSlug: string) => {
  const query = Types.ObjectId.isValid(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug.toLowerCase() };

  const category = await BlogCategory.findOne(query).lean();
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog category not found.');
  }

  const blogCount = await Blog.countDocuments({ category: category._id });

  return {
    ...category,
    blogCount,
  };
};

const updateCategoryToDB = async (
  id: string,
  payload: Partial<IBlogcategory>,
) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid category ID.');
  }

  const existingCategory = await BlogCategory.findById(id);
  if (!existingCategory) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog category not found.');
  }

  if (payload.name) {
    const slug = generateSlug(payload.name);
    const isExist = await BlogCategory.findOne({
      _id: { $ne: id },
      $or: [
        { name: { $regex: new RegExp(`^${payload.name.trim()}$`, 'i') } },
        { slug },
      ],
    });

    if (isExist) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'Another blog category with this name already exists.',
      );
    }

    payload.name = payload.name.trim();
    payload.slug = slug;
  }

  const updatedCategory = await BlogCategory.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true },
  );

  if (!updatedCategory) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog category not found.');
  }

  return updatedCategory;
};

const deleteCategoryFromDB = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid category ID.');
  }

  const category = await BlogCategory.findById(id);
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog category not found.');
  }

  // Prevent deleting category if any blog is linked to it
  const blogCount = await Blog.countDocuments({ category: id });
  if (blogCount > 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot delete category. There are ${blogCount} blog(s) linked to this category.`,
    );
  }

  const result = await BlogCategory.findByIdAndDelete(id);
  return result;
};

export const BlogCategoryServices = {
  createCategoryToDB,
  getAllCategoriesFromDB,
  getSingleCategoryFromDB,
  updateCategoryToDB,
  deleteCategoryFromDB,
};

// Also export alias BlogcategoryServices
export const BlogcategoryServices = BlogCategoryServices;

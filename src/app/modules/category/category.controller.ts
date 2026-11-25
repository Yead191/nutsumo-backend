import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { CategoryServices } from './category.service';
import { getSingleFilePath } from '../../../shared/getFilePath';
import { revalidateFrontend } from '../../../helpers/revalidateFrontend';

// Cache tags used by the Next.js frontend for category data.
const categoryCacheTags = (category?: { _id?: unknown; slug?: string } | null) => [
  'categories',
  ...(category?._id ? [`category-${String(category._id)}`] : []),
  ...(category?.slug ? [`category-${category.slug}`] : []),
];

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const image = getSingleFilePath(req.files, 'image');
  if (image) {
    data.image = image;
  }
  const result = await CategoryServices.createCategory(data);
  revalidateFrontend(categoryCacheTags(result));
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Category created successfully',
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryServices.getAllCategories(req.user, req.query);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Categories fetched successfully',
    data: result.categories,
    pagination: result.pagination,
  });
});

const getSingleCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryServices.getSingleCategory(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Category fetched successfully',
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const image = getSingleFilePath(req.files, 'image');
  if (image) {
    data.image = image;
  }
  const result = await CategoryServices.updateCategory(req.params.id, data);
  revalidateFrontend([
    ...categoryCacheTags(result),
    `category-${req.params.id}`,
  ]);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Category updated successfully',
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryServices.deleteCategory(req.params.id);
  revalidateFrontend([
    ...categoryCacheTags(result),
    `category-${req.params.id}`,
  ]);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Category deleted successfully',
    data: result,
  });
});

export const CategoryController = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};

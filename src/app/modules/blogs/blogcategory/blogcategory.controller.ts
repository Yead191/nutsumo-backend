import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../../shared/catchAsync';
import sendResponse from '../../../../shared/sendResponse';
import { BlogCategoryServices } from './blogcategory.service';

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogCategoryServices.createCategoryToDB(req.body);
  return sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Blog category created successfully',
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogCategoryServices.getAllCategoriesFromDB(req.query);
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Blog categories fetched successfully',
    pagination: result.pagination,
    data: result.result,
  });
});

const getSingleCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogCategoryServices.getSingleCategoryFromDB(
    req.params.id,
  );
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Blog category fetched successfully',
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogCategoryServices.updateCategoryToDB(
    req.params.id,
    req.body,
  );
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Blog category updated successfully',
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogCategoryServices.deleteCategoryFromDB(req.params.id);
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Blog category deleted successfully',
    data: result,
  });
});

export const BlogCategoryController = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};

// Also export alias BlogcategoryController
export const BlogcategoryController = BlogCategoryController;

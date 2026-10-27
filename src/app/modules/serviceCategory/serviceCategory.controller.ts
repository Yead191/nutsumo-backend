import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ServiceCategoryServices } from './serviceCategory.service';
import { getSingleFilePath } from '../../../shared/getFilePath';

const createCategory = catchAsync(async (req: Request, res: Response) => {
  let data = req.body;
  const image = getSingleFilePath(req.files, 'image');
  if (image) {
    data.image = image;
  }
  const result = await ServiceCategoryServices.createCategory(data);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Service category created successfully',
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceCategoryServices.getAllCategories(req.query);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service categories fetched successfully',
    data: result,
  });
});

const getSingleCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceCategoryServices.getSingleCategory(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service category fetched successfully',
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  let data = req.body;
  const image = getSingleFilePath(req.files, 'image');
  if (image) {
    data.image = image;
  }
  const result = await ServiceCategoryServices.updateCategory(
    req.params.id,
    data,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service category updated successfully',
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceCategoryServices.deleteCategory(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service category deleted successfully',
    data: result,
  });
});

export const ServiceCategoryController = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};

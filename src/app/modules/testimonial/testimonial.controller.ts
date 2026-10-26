import { Request, Response, NextFunction } from 'express';
import { TestimonialServices } from './testimonial.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { getSingleFilePath } from '../../../shared/getFilePath';

const createTestimonial = catchAsync(async (req: Request, res: Response) => {
  let { ...data } = req.body;
  const image = getSingleFilePath(req.files, 'image');
  if (image) {
    data.image = image;
  }

  const result = await TestimonialServices.createTestimonialToDB(data);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Testimonial created successfully',
    data: result,
  });
});

const getAllTestimonial = catchAsync(async (req: Request, res: Response) => {
  const result = await TestimonialServices.getAllTestimonialFromDB();
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Testimonial fatched successfully',
    data: result,
  });
});

const updateTestimonial = catchAsync(async (req: Request, res: Response) => {
  console.log(req.body, 'update');
  let { ...data } = req.body;
  const image = getSingleFilePath(req.files, 'image');
  if (image) {
    data.image = image;
  }

  const result = await TestimonialServices.updateTestimonialFromDB(
    req.params.id,
    data,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Testimonial updated successfully',
    data: result,
  });
});

const deleteTestimonial = catchAsync(async (req: Request, res: Response) => {
  const result = await TestimonialServices.deleteTestimonialToDB(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Testimonial deleted successfully',
    data: result,
  });
});

const getSingleTestimonial = catchAsync(async (req: Request, res: Response) => {
  const result = await TestimonialServices.getSingleTestimonialFromDB(
    req.params.id,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Testimonial fatched successfully',
    data: result,
  });
});

export const TestimonialController = {
  createTestimonial,
  getAllTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getSingleTestimonial,
};

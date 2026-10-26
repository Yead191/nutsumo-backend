import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { FaqServices } from './faq.service';

const createFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.createFaq(req.body);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'FAQ category created successfully',
    data: result,
  });
});

const getAllFaqs = catchAsync(async (req: Request, res: Response) => {
  const { result, pagination } = await FaqServices.getAllFaqs(
    req.user,
    req.query,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'FAQs fetched successfully',
    pagination,
    data: result,
  });
});

const getSingleFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.getSingleFaq(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'FAQ fetched successfully',
    data: result,
  });
});

const updateFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.updateFaq(req.params.id, req.body);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'FAQ updated successfully',
    data: result,
  });
});

const deleteFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.deleteFaq(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'FAQ deleted successfully',
    data: result,
  });
});

export const FaqController = {
  createFaq,
  getAllFaqs,
  getSingleFaq,
  updateFaq,
  deleteFaq,
};

import { Request, Response, NextFunction } from 'express';
import { InquiryServices } from './inquiry.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

const createInquiry = catchAsync(async (req: Request, res: Response) => {
  const result = await InquiryServices.createInquiry(req.body);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Inquiry created successfully',
    data: result,
  });
});

const getInquiries = catchAsync(async (req: Request, res: Response) => {
  const result = await InquiryServices.getAllInqueriesFromDB(req.query);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Inquiries fetched successfully',
    data: result.inqueries,
    pagination: result.pagination,
  });
});

const getSingleInquiry = catchAsync(async (req: Request, res: Response) => {
  const result = await InquiryServices.getSingleInqueryFromDB(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Inquiry fetched successfully',
    data: result,
  });
});

const updateInquiry = catchAsync(async (req: Request, res: Response) => {
  const result = await InquiryServices.updateInquiryInDB(
    req.params.id,
    req.body,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Inquiry updated successfully',
    data: result,
  });
});

const deleteInquiry = catchAsync(async (req: Request, res: Response) => {
  const result = await InquiryServices.deleteInquiryFromDB(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Inquiry deleted successfully',
    data: result,
  });
});

export const InquiryController = {
  createInquiry,
  getInquiries,
  getSingleInquiry,
  updateInquiry,
  deleteInquiry,
};

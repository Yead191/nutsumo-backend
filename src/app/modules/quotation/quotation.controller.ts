import { Request, Response } from 'express';
import { QuotationServices } from './quotation.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { USER_ROLES } from '../../../enums/user';

// Submit quotation (Artisan)
const submitQuotation = catchAsync(async (req: Request, res: Response) => {
  const artisanId = req.user?.id;
  const result = await QuotationServices.submitQuotation(artisanId, req.body);

  return sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Quotation submitted successfully',
    data: result,
  });
});

// Get logged-in artisan's quotations
const getMyQuotations = catchAsync(async (req: Request, res: Response) => {
  const artisanId = req.user?.id;
  const result = await QuotationServices.getMyQuotations(artisanId, req.query);

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotations fetched successfully',
    data: result.quotations,
    pagination: result.pagination,
  });
});

// Get all quotations for a specific job (Job Owner / Admin)
const getJobQuotations = catchAsync(async (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const userId = req.user?.id;
  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(
    req.user?.role as USER_ROLES,
  );

  const result = await QuotationServices.getJobQuotations(
    jobId,
    userId,
    isAdmin,
    req.query,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Job quotations retrieved successfully',
    data: result.quotations,
    pagination: result.pagination,
  });
});

// Get single quotation by ID
const getSingleQuotation = catchAsync(async (req: Request, res: Response) => {
  const quotationId = req.params.id;
  const userId = req.user?.id;
  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(
    req.user?.role as USER_ROLES,
  );

  const result = await QuotationServices.getSingleQuotation(
    quotationId,
    userId,
    isAdmin,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotation retrieved successfully',
    data: result,
  });
});

// Update pending quotation (Artisan)
const updateQuotation = catchAsync(async (req: Request, res: Response) => {
  const quotationId = req.params.id;
  const artisanId = req.user?.id;

  const result = await QuotationServices.updateQuotation(
    quotationId,
    artisanId,
    req.body,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotation updated successfully',
    data: result,
  });
});

// Withdraw pending quotation (Artisan)
const withdrawQuotation = catchAsync(async (req: Request, res: Response) => {
  const quotationId = req.params.id;
  const artisanId = req.user?.id;

  const result = await QuotationServices.withdrawQuotation(
    quotationId,
    artisanId,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotation withdrawn successfully',
    data: result,
  });
});

// Accept quotation (Job Owner)
const acceptQuotation = catchAsync(async (req: Request, res: Response) => {
  const quotationId = req.params.id;
  const customerId = req.user?.id;

  const result = await QuotationServices.acceptQuotation(
    quotationId,
    customerId,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotation accepted and booking confirmed successfully',
    data: result,
  });
});

// Reject quotation (Job Owner)
const rejectQuotation = catchAsync(async (req: Request, res: Response) => {
  const quotationId = req.params.id;
  const customerId = req.user?.id;

  const result = await QuotationServices.rejectQuotation(
    quotationId,
    customerId,
    req.body?.rejectReason,
  );

  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Quotation rejected successfully',
    data: result,
  });
});

export const QuotationController = {
  submitQuotation,
  getMyQuotations,
  getJobQuotations,
  getSingleQuotation,
  updateQuotation,
  withdrawQuotation,
  acceptQuotation,
  rejectQuotation,
};

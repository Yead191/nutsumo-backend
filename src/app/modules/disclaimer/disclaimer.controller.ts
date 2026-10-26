import { Request, Response, NextFunction } from 'express';
import { DisclaimerServices } from './disclaimer.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

const createDisclaimer = catchAsync(async (req: Request, res: Response) => {
  const result = await DisclaimerServices.createDisclaimer(req.body);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Disclaimer created successfully!',
    data: result,
  });
});

const getDisclaimer = catchAsync(async (req: Request, res: Response) => {
  const { type } = req.query;
  const result = await DisclaimerServices.getDisclaimer(type as string);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Disclaimer fetched successfully!',
    data: result,
  });
});

export const DisclaimerController = {
  createDisclaimer,
  getDisclaimer,
};

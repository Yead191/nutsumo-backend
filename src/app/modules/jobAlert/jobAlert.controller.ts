import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { JobAlertServices } from './jobAlert.service';

const saveAlert = catchAsync(async (req: Request, res: Response) => {
  const result = await JobAlertServices.saveAlert(req.user.id, req.body);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Job alert saved',
    data: result,
  });
});

const listMine = catchAsync(async (req: Request, res: Response) => {
  const result = await JobAlertServices.listMine(req.user.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Job alerts retrieved',
    data: result,
  });
});

const removeAlert = catchAsync(async (req: Request, res: Response) => {
  const result = await JobAlertServices.removeAlert(req.user.id, req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Job alert removed',
    data: result,
  });
});

export const JobAlertController = {
  saveAlert,
  listMine,
  removeAlert,
};

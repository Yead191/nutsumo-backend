import { Request, Response, NextFunction } from 'express';
import { SubscriptionServices } from './subscription.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

const subscribePackage = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const auto_renew = req.body?.auto_renew ?? true;
    const result = await SubscriptionServices.subscribePackage(
      req.user,
      req.params.id,
      auto_renew,
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      data: result,
    });
  },
);

const getMySubcription = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await SubscriptionServices.getMySubcription(req.user);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'My Subcription retrieved successfully!',
      data: result,
    });
  },
);

const getSubsribersByPackage = catchAsync(
  async (req: Request, res: Response) => {
    const result = await SubscriptionServices.getSubsribersByPackage(
      req.params.id,
      req.query,
    );
    return sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Subcribers retrieved successfully!',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
  const { subscriptionId, cancelType } = req.body;
  const result = await SubscriptionServices.cancelSubscription(
    req.user,
    subscriptionId,
    cancelType,
  );
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Subscription cancelled successfully!',
    data: result,
  });
});

const checkTrialEligibility = catchAsync(
  async (req: Request, res: Response) => {
    const result = await SubscriptionServices.checkTrialEligibility(req.user);
    return sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Trial eligibility status retrieved successfully!',
      data: result,
    });
  },
);

export const SubscriptionController = {
  subscribePackage,
  getMySubcription,
  getSubsribersByPackage,
  cancelSubscription,
  checkTrialEligibility,
};

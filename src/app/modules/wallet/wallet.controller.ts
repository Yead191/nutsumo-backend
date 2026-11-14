import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { WalletServices } from './wallet.service';

const getDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await WalletServices.getDashboard(req.user.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Dashboard retrieved',
    data: result,
  });
});

const getMine = catchAsync(async (req: Request, res: Response) => {
  const result = await WalletServices.getMine(req.user.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Wallet retrieved',
    data: result,
  });
});

const saveDestination = catchAsync(async (req: Request, res: Response) => {
  const result = await WalletServices.saveDestination(req.user.id, req.body);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payout account saved',
    data: result,
  });
});

const openStripe = catchAsync(async (req: Request, res: Response) => {
  const result = await WalletServices.openStripeAccount(req.user.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.connected ? 'Stripe login ready' : 'Stripe onboarding ready',
    data: result,
  });
});

const syncStripe = catchAsync(async (req: Request, res: Response) => {
  const result = await WalletServices.syncStripeAccount(req.user.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.connected ? 'Stripe account connected' : 'Stripe account saved',
    data: result,
  });
});

const withdraw = catchAsync(async (req: Request, res: Response) => {
  const result = await WalletServices.withdraw(req.user.id, req.body.amount);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message:
      result.status === 'PAID'
        ? 'Withdrawal sent'
        : 'Withdrawal requested. It will be paid to your saved account.',
    data: result,
  });
});

const listWithdrawals = catchAsync(async (req: Request, res: Response) => {
  const result = await WalletServices.listWithdrawalsAdmin({
    status: req.query.status as string | undefined,
    page: req.query.page as string | undefined,
    limit: req.query.limit as string | undefined,
  });
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Withdrawals retrieved',
    data: result.withdrawals,
    pagination: result.pagination,
  });
});

const settleWithdrawal = catchAsync(async (req: Request, res: Response) => {
  const result = await WalletServices.settleWithdrawal(
    req.params.id,
    req.user.id,
    req.body,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message:
      result.status === 'PAID'
        ? 'Withdrawal marked paid'
        : 'Withdrawal failed and the balance was restored',
    data: result,
  });
});

export const WalletController = {
  getDashboard,
  getMine,
  saveDestination,
  openStripe,
  syncStripe,
  withdraw,
  listWithdrawals,
  settleWithdrawal,
};

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { TransactionServices } from './transaction.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

const getTransactions = catchAsync(async (req: Request, res: Response) => {
  const result = await TransactionServices.getTransactions(req.user, req.query);
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Transactions fetched successfully',
    data: result.transactions,
    pagination: result.pagination,
  });
});

const getSingleTransaction = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TransactionServices.getSingleTransactionFromDB(
    id,
    req.user,
  );
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Transaction fetched successfully',
    data: result,
  });
});

const getTransactionStats = catchAsync(async (req: Request, res: Response) => {
  const result = await TransactionServices.getTransactionStatsFromDB(
    req.user,
    req.query,
  );
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Transaction stats fetched successfully',
    data: result,
  });
});

const deleteTransaction = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TransactionServices.deleteTransactionFromDB(id);
  return sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Transaction deleted successfully',
    data: result,
  });
});

const deleteMultipleTransactions = catchAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    const result = await TransactionServices.deleteMultipleTransactionsFromDB(
      ids,
    );
    return sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: `${result.deletedCount} transaction(s) deleted successfully`,
      data: result,
    });
  },
);

export const TransactionController = {
  getTransactions,
  getSingleTransaction,
  getTransactionStats,
  deleteTransaction,
  deleteMultipleTransactions,
};

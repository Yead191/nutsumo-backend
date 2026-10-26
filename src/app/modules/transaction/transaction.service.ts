import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import QueryBuilder from '../../builder/QueryBuilder';
import { Transaction } from './transaction.model';
import ApiError from '../../../errors/ApiError';
import {
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '../../../enums/transaction';

const getTransactions = async (
  user: JwtPayload,
  query: Record<string, any>,
) => {
  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(
    user.role,
  );

  const initQuery = isAdmin ? {} : { user: user.id };

  const transactionQuery = new QueryBuilder(
    Transaction.find(initQuery).populate([
      { path: 'user', select: 'name email image role' },
      {
        path: 'order',
        select:
          'order_id price_breakdown status payment_status contact_number formatted_address items createdAt',
      },
    ]),
    query,
  )
    .search([
      'transaction_id',
      'payment_intent_id',
      'payment_method',
    ])
    .filter()
    .sort()
    .paginate()
    .fields();
  const [transactions, pagination] = await Promise.all([
    transactionQuery.modelQuery.lean(),
    transactionQuery.getPaginationInfo(),
  ]);

  return { transactions, pagination };
};

const getSingleTransactionFromDB = async (id: string, user: JwtPayload) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid transaction ID');
  }

  const transaction = await Transaction.findById(id)
    .populate([
      { path: 'user', select: 'name email image role' },
      {
        path: 'order',
        select:
          'order_id price_breakdown status payment_status contact_number formatted_address items createdAt',
      },
    ])
    .lean();

  if (!transaction) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Transaction not found');
  }

  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(
    user.role,
  );

  const transactionUserId =
    (transaction.user as any)?._id?.toString() || transaction.user?.toString();
  if (!isAdmin && transactionUserId !== user.id) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to view this transaction',
    );
  }

  return transaction;
};

const getTransactionStatsFromDB = async (
  user?: JwtPayload,
  query?: Record<string, any>,
) => {
  const matchStage: Record<string, any> = {};

  if (user && ![USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(user.role)) {
    matchStage.user = new Types.ObjectId(user.id);
  }

  const startDate = query?.startDate || query?.from;
  const endDate = query?.endDate || query?.to;
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) {
      matchStage.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      matchStage.createdAt.$lte = new Date(endDate);
    }
  }

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );

  const amountExpr = {
    $cond: [
      { $gt: ['$payment_received', 0] },
      '$payment_received',
      {
        $cond: [
          { $gt: ['$total_price', 0] },
          '$total_price',
          { $ifNull: ['$amount', 0] },
        ],
      },
    ],
  };

  const isSuccess = {
    $in: [
      '$status',
      [
        TRANSACTION_STATUS.SUCCESS,
        'success',
        'SUCCESS',
        'paid',
        'PAID',
      ],
    ],
  };

  const isPending = {
    $in: [
      '$status',
      [
        TRANSACTION_STATUS.PENDING,
        'pending',
        'PENDING',
      ],
    ],
  };

  const isFailed = {
    $in: [
      '$status',
      [
        TRANSACTION_STATUS.FAILED,
        'failed',
        'FAILED',
        'cancelled',
        'CANCELLED',
      ],
    ],
  };

  const isCredit = {
    $in: ['$type', [TRANSACTION_TYPE.CREDIT, 'credit', 'Credit', 'CREDIT']],
  };

  const isDebit = {
    $in: ['$type', [TRANSACTION_TYPE.DEBIT, 'debit', 'Debit', 'DEBIT']],
  };

  const [stats] = await Transaction.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },

        // Total Inflow (Successful Credits)
        totalInflow: {
          $sum: {
            $cond: [{ $and: [isCredit, isSuccess] }, amountExpr, 0],
          },
        },

        // Total Outflow (Successful Debits, e.g. operational expenses)
        totalOutflow: {
          $sum: {
            $cond: [{ $and: [isDebit, isSuccess] }, amountExpr, 0],
          },
        },

        // Gross Inflows by Category
        shopRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  isSuccess,
                  {
                    $in: [
                      '$category',
                      [
                        TRANSACTION_CATEGORY.SHOP,
                        'shop',
                        'Shop',
                        'SHOP',
                      ],
                    ],
                  },
                ],
              },
              amountExpr,
              0,
            ],
          },
        },
        membershipRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  isSuccess,
                  {
                    $in: [
                      '$category',
                      [
                        TRANSACTION_CATEGORY.MEMBERSHIP,
                        'membership',
                        'Membership',
                        'MEMBERSHIP',
                      ],
                    ],
                  },
                ],
              },
              amountExpr,
              0,
            ],
          },
        },
        donationRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  isSuccess,
                  {
                    $in: [
                      '$category',
                      [
                        TRANSACTION_CATEGORY.DONATION,
                        'donation',
                        'Donation',
                        'DONATION',
                      ],
                    ],
                  },
                ],
              },
              amountExpr,
              0,
            ],
          },
        },
        eventRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  isSuccess,
                  {
                    $in: [
                      '$category',
                      [
                        TRANSACTION_CATEGORY.EVENT,
                        'event',
                        'Event',
                        'EVENT',
                      ],
                    ],
                  },
                ],
              },
              amountExpr,
              0,
            ],
          },
        },
        serviceRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  isSuccess,
                  {
                    $in: [
                      '$category',
                      [
                        TRANSACTION_CATEGORY.SERVICE,
                        'service',
                        'Service',
                        'SERVICE',
                      ],
                    ],
                  },
                ],
              },
              amountExpr,
              0,
            ],
          },
        },
        expenseAmount: {
          $sum: {
            $cond: [
              {
                $and: [
                  isSuccess,
                  {
                    $in: [
                      '$category',
                      [
                        TRANSACTION_CATEGORY.EXPENSE,
                        'expense',
                        'Expense',
                        'EXPENSE',
                      ],
                    ],
                  },
                ],
              },
              amountExpr,
              0,
            ],
          },
        },

        // Time-based Revenues (Inflows)
        todayRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$createdAt', startOfToday] },
                  isCredit,
                  isSuccess,
                ],
              },
              amountExpr,
              0,
            ],
          },
        },
        thisMonthRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$createdAt', startOfMonth] },
                  isCredit,
                  isSuccess,
                ],
              },
              amountExpr,
              0,
            ],
          },
        },

        // Status Counts
        successfulTransactions: {
          $sum: { $cond: [isSuccess, 1, 0] },
        },
        pendingTransactions: {
          $sum: { $cond: [isPending, 1, 0] },
        },
        failedTransactions: {
          $sum: { $cond: [isFailed, 1, 0] },
        },

        // Type Counts
        creditTransactions: {
          $sum: { $cond: [isCredit, 1, 0] },
        },
        debitTransactions: {
          $sum: { $cond: [isDebit, 1, 0] },
        },

        // Time-based Counts
        todayTransactions: {
          $sum: {
            $cond: [{ $gte: ['$createdAt', startOfToday] }, 1, 0],
          },
        },
        thisMonthTransactions: {
          $sum: {
            $cond: [{ $gte: ['$createdAt', startOfMonth] }, 1, 0],
          },
        },
      },
    },
  ]);

  const totalInflow = stats?.totalInflow || 0;
  const totalOutflow = stats?.totalOutflow || 0;
  const netBalance = totalInflow - totalOutflow;

  return {
    totalRevenue: totalInflow,
    totalInflow,
    totalOutflow,
    netBalance,
    shopRevenue: stats?.shopRevenue || 0,
    membershipRevenue: stats?.membershipRevenue || 0,
    donationRevenue: stats?.donationRevenue || 0,
    eventRevenue: stats?.eventRevenue || 0,
    serviceRevenue: stats?.serviceRevenue || 0,
    expenseAmount: stats?.expenseAmount || 0,
    todayRevenue: stats?.todayRevenue || 0,
    thisMonthRevenue: stats?.thisMonthRevenue || 0,
    totalTransactions: stats?.totalTransactions || 0,
    successfulTransactions: stats?.successfulTransactions || 0,
    pendingTransactions: stats?.pendingTransactions || 0,
    failedTransactions: stats?.failedTransactions || 0,
    creditTransactions: stats?.creditTransactions || 0,
    debitTransactions: stats?.debitTransactions || 0,
    todayTransactions: stats?.todayTransactions || 0,
    thisMonthTransactions: stats?.thisMonthTransactions || 0,
  };
};

const deleteTransactionFromDB = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid transaction ID');
  }

  const transaction = await Transaction.findById(id);
  if (!transaction) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Transaction not found');
  }

  const result = await Transaction.findByIdAndDelete(id);
  return result;
};

const deleteMultipleTransactionsFromDB = async (ids: string[]) => {
  const validIds = ids.filter(id => Types.ObjectId.isValid(id));
  if (validIds.length === 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No valid transaction IDs provided',
    );
  }

  const result = await Transaction.deleteMany({ _id: { $in: validIds } });
  return {
    deletedCount: result.deletedCount,
  };
};

export const TransactionServices = {
  getTransactions,
  getSingleTransactionFromDB,
  getTransactionStatsFromDB,
  deleteTransactionFromDB,
  deleteMultipleTransactionsFromDB,
};

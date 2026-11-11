export const BOOKING_STATUSES = {
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  IN_PROGRESS: 'IN_PROGRESS',
  DELIVERED: 'DELIVERED',
  REVISION_REQUESTED: 'REVISION_REQUESTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED',
} as const;

export const BOOKING_PAYMENT_STATUSES = {
  UNPAID: 'UNPAID',
  ESCROW_HELD: 'ESCROW_HELD',
  PAID: 'PAID',
  REFUNDED: 'REFUNDED',
} as const;

export const BOOKING_PAYOUT_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  RELEASED: 'RELEASED',
  REJECTED: 'REJECTED',
} as const;

// Statutory Tax & Levy Rates (Total: 20%)
export const TAX_RATES = {
  VAT: 15,            // 15% Value Added Tax
  NHIL: 2.5,          // 2.5% National Health Insurance Levy
  GET_FUND_LEVY: 2.5, // 2.5% Ghana Education Trust Fund Levy
} as const;

export const DEFAULT_PLATFORM_COMMISSION_PERCENTAGE =
  TAX_RATES.VAT + TAX_RATES.NHIL + TAX_RATES.GET_FUND_LEVY; // 20%

export interface IPlatformFeeBreakdown {
  vatRate: number;
  vatAmount: number;
  nhilRate: number;
  nhilAmount: number;
  getFundLevyRate: number;
  getFundLevyAmount: number;
  platformCommissionRate: number;
  platformFee: number;
  artisanPayoutAmount: number;
}

/**
 * Enterprise fee and statutory deduction calculator
 * Calculates VAT (15%), NHIL (2.5%), and GETFund Levy (2.5%) = 20% Total
 */
export const calculatePlatformFees = (amount: number): IPlatformFeeBreakdown => {
  const safeAmount = Number(amount) || 0;
  const vatAmount = Number(((safeAmount * TAX_RATES.VAT) / 100).toFixed(2));
  const nhilAmount = Number(((safeAmount * TAX_RATES.NHIL) / 100).toFixed(2));
  const getFundLevyAmount = Number(
    ((safeAmount * TAX_RATES.GET_FUND_LEVY) / 100).toFixed(2),
  );
  const platformFee = Number(
    (vatAmount + nhilAmount + getFundLevyAmount).toFixed(2),
  );
  const artisanPayoutAmount = Number((safeAmount - platformFee).toFixed(2));

  return {
    vatRate: TAX_RATES.VAT,
    vatAmount,
    nhilRate: TAX_RATES.NHIL,
    nhilAmount,
    getFundLevyRate: TAX_RATES.GET_FUND_LEVY,
    getFundLevyAmount,
    platformCommissionRate: DEFAULT_PLATFORM_COMMISSION_PERCENTAGE,
    platformFee,
    artisanPayoutAmount,
  };
};

export const BOOKING_SEARCHABLE_FIELDS = [
  'bookingNumber',
  'notes',
  'deliveryNotes',
  'revisionNotes',
  'disputeReason',
];

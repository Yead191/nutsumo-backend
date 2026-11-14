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

// Statutory levies 20% plus Nutsumo platform fee 2.5% = 22.5% total.
export const TAX_RATES = {
  VAT: 15,
  NHIL: 2.5,
  GET_FUND_LEVY: 2.5,
  PLATFORM: 2.5,
} as const;

export const STATUTORY_DEDUCTION_PERCENTAGE =
  TAX_RATES.VAT + TAX_RATES.NHIL + TAX_RATES.GET_FUND_LEVY;
export const PLATFORM_FEE_PERCENTAGE = TAX_RATES.PLATFORM;
export const DEFAULT_PLATFORM_COMMISSION_PERCENTAGE =
  STATUTORY_DEDUCTION_PERCENTAGE + PLATFORM_FEE_PERCENTAGE;

export interface IPlatformFeeBreakdown {
  vatRate: number;
  vatAmount: number;
  nhilRate: number;
  nhilAmount: number;
  getFundLevyRate: number;
  getFundLevyAmount: number;
  platformServiceFeeRate: number;
  platformServiceFeeAmount: number;
  platformCommissionRate: number;
  platformFee: number;
  artisanPayoutAmount: number;
}

export const calculatePlatformFees = (amount: number): IPlatformFeeBreakdown => {
  const safeAmount = Number(amount) || 0;
  const vatAmount = Number(((safeAmount * TAX_RATES.VAT) / 100).toFixed(2));
  const nhilAmount = Number(((safeAmount * TAX_RATES.NHIL) / 100).toFixed(2));
  const getFundLevyAmount = Number(
    ((safeAmount * TAX_RATES.GET_FUND_LEVY) / 100).toFixed(2),
  );
  const platformServiceFeeAmount = Number(
    ((safeAmount * TAX_RATES.PLATFORM) / 100).toFixed(2),
  );
  const platformFee = Number(
    (vatAmount + nhilAmount + getFundLevyAmount + platformServiceFeeAmount).toFixed(2),
  );
  const artisanPayoutAmount = Number((safeAmount - platformFee).toFixed(2));

  return {
    vatRate: TAX_RATES.VAT,
    vatAmount,
    nhilRate: TAX_RATES.NHIL,
    nhilAmount,
    getFundLevyRate: TAX_RATES.GET_FUND_LEVY,
    getFundLevyAmount,
    platformServiceFeeRate: TAX_RATES.PLATFORM,
    platformServiceFeeAmount,
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

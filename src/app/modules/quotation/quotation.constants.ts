export const QUOTATION_STATUSES = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

export const QUOTATION_RATE_TYPES = {
  HOURLY: 'HOURLY',
  DAILY: 'DAILY',
  FIXED: 'FIXED',
} as const;

export const QUOTATION_SEARCHABLE_FIELDS = ['message', 'estimatedDuration'];

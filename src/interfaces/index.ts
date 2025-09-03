export * from "./loans.interfaces";
export * from "./messages.interfaces";
export * from "./transactions.interfaces";
export * from "./users.interfaces";
export * from "./commons.interfaces";
export * from "./paybills.interfaces";

// V2 Enhanced interfaces
export interface LedgerEntry {
  _id: string;
  traceId: string;
  userId?: string;
  account: string;
  entryType: 'DEBIT' | 'CREDIT';
  category: 'bill-payment' | 'transfer' | 'loan' | 'savings' | 'fee' | 'refund' | 'settlement';
  subtype?: string;
  amount: number; // in kobo
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  meta?: Record<string, any>;
  idempotencyKey?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface IdempotencyKey {
  _id: string;
  key: string;
  userId?: string;
  response: any;
  createdAt: Date;
  expiresAt?: Date;
}
export type MOBILENETWORKS = '01' | '02' | '04' | '03';
export type BONUSTYPE = '01' | '02';
export type CABLETV = 'dstv' | 'gotv' | 'startimes';
export type METERTYPE = "01" | "02";

export type ServiceType =
  | 'airtime'
  | 'data'
  | 'tv'
  | 'power'
  | 'betting'
  | 'internet'
  | 'waec'
  | 'jamb';

export interface InitiateBillPaymentRequest {
  userId: string;
  amount: number;                    // in naira (converted to kobo by processor)
  serviceType: ServiceType;          // e.g., airtime, data, tv, power, betting, internet, waec, jamb
  serviceId: string;                 // provider-specific product ID or identifier (see mapping below)
  customerReference: string;         // e.g., phoneNo, smartcardNo, meterNo, profileId, customerId
  idempotencyKey: string;
  /**
   * Extra, service-specific parameters.
   * Only some fields are required depending on the serviceType (guards below).
   */
  extras?: {
    // airtime/data
    mobileNetwork?: MOBILENETWORKS;
    bonusType?: BONUSTYPE;

    // tv
    pkg?: string; // package code/string

    // power
    meterType?: METERTYPE;

    // internet
    internetNetwork?: 'smile-direct' | 'spectranet';
  };
}

export interface BillPaymentResult {
  traceId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  billPaymentId: string;
  message?: string;
}

export interface IBillPayment extends Document {
  _id: string;
  userId: string;
  traceId: string; // v2 addition
  serviceType: string;
  serviceId: string;
  customerReference: string;
  amount: number; // in kobo
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  providerRef?: string;
  createdAt: Date;
  processedAt?: Date;
  meta?: Record<string, any>;
}
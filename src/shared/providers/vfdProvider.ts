/**
 * VFD Provider - Banking operations adapter
 * Wraps VFD API calls with retry logic and circuit breaker
 */
import axios, { AxiosRequestConfig } from 'axios';
import { CircuitBreaker } from '../utils/circuit';
import { generateBearerToken } from '../../utils/generateBearerToken';
import { customerKey, customerSecret, baseUrl } from '../../config';

export interface TransferRequest {
  fromAccount: string;
  toAccount: string;
  amount: number; // in kobo
  reference: string;
  remark: string;
  transferType: 'intra' | 'inter';
}

export interface TransferResponse {
  status: string;
  txnId: string;
  sessionId: string;
  message?: string;
}

export class VfdProvider {
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 300000 // 5 minutes
    });
  }

  async transfer(request: TransferRequest): Promise<TransferResponse> {
    return this.circuitBreaker.execute(async () => {
      const accessToken = await generateBearerToken(customerKey, customerSecret);
      
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: `${baseUrl}/wallet2/transfer`,
        headers: {
          'Content-Type': 'application/json',
          'AccessToken': accessToken
        },
        data: {
          ...request,
          amount: String(request.amount / 100) // Convert kobo to naira for provider
        },
        timeout: 30000
      };

      const response = await axios(config);
      return response.data;
    });
  }

  async queryTransfer(reference: string): Promise<TransferResponse> {
    return this.circuitBreaker.execute(async () => {
      const accessToken = await generateBearerToken(customerKey, customerSecret);
      
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: `${baseUrl}/wallet2/transfer/status?reference=${reference}`,
        headers: {
          'AccessToken': accessToken
        },
        timeout: 15000
      };

      const response = await axios(config);
      return response.data;
    });
  }

  async getAccountBalance(accountNumber: string): Promise<{ balance: number; accountNo: string }> {
    return this.circuitBreaker.execute(async () => {
      const accessToken = await generateBearerToken(customerKey, customerSecret);
      
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: `${baseUrl}/wallet2/account/enquiry?accountNumber=${accountNumber}`,
        headers: {
          'AccessToken': accessToken
        },
        timeout: 15000
      };

      const response = await axios(config);
      const data = response.data.data;
      
      return {
        balance: Math.round(parseFloat(data.accountBalance) * 100), // Convert to kobo
        accountNo: data.accountNo
      };
    });
  }
}
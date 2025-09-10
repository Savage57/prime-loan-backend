/**
 * Dependency Injection Container
 * Simple wiring for services and providers to enable easier testing and swapping
 */
import { VfdProvider } from '../shared/providers/vfd.provider';
import { LedgerService } from '../modules/ledger/LedgerService';
import { BillPaymentService } from '../modules/bill-payments/bill.payment.service';
import { TransferService } from '../modules/transfers/transfer.service';
import { LoanService } from '../modules/loans/loan.service';
import { SavingsService } from '../modules/savings/savings.service';

export interface ServiceContainer {
  vfdProvider: VfdProvider;
  ledgerService: typeof LedgerService;
  billPaymentService: typeof BillPaymentService;
  transferService: typeof TransferService;
  loanService: typeof LoanService;
  savingsService: typeof SavingsService;
}

export class Wire {
  private static container: ServiceContainer;

  static getContainer(): ServiceContainer {
    if (!this.container) {
      this.container = {
        vfdProvider: new VfdProvider(),
        ledgerService: LedgerService,
        billPaymentService: BillPaymentService,
        transferService: TransferService,
        loanService: LoanService,
        savingsService: SavingsService
      };
    }
    return this.container;
  }

  static setContainer(container: Partial<ServiceContainer>) {
    this.container = { ...this.getContainer(), ...container };
  }
}
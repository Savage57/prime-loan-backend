/**
 * Dependency Injection Container
 * Simple wiring for services and providers to enable easier testing and swapping
 */
import { VfdProvider } from '../shared/providers/vfdProvider';
import { LedgerService } from '../modules/ledger/service';
import { BillPaymentService } from '../modules/bill-payments/application/BillPaymentService';
import { TransferService } from '../modules/transfers/application/TransferService';
import { LoanApplicationService } from '../modules/loans/application/LoanApplicationService';
import { SavingsService } from '../modules/savings/application/SavingsService';

export interface ServiceContainer {
  vfdProvider: VfdProvider;
  ledgerService: typeof LedgerService;
  billPaymentService: typeof BillPaymentService;
  transferService: typeof TransferService;
  loanApplicationService: typeof LoanApplicationService;
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
        loanApplicationService: LoanApplicationService,
        savingsService: SavingsService
      };
    }
    return this.container;
  }

  static setContainer(container: Partial<ServiceContainer>) {
    this.container = { ...this.getContainer(), ...container };
  }
}
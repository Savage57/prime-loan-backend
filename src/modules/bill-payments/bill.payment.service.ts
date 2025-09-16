/**
 * Bill Payment Orchestrator with Club Konnect Integration
 */
import { ClubConnectsService } from '../../shared/providers/clubConnect.provider';
import { processTransaction } from "../../shared/transactions/BillPaymentTransactionProcessor";
import { TransferService } from '../transfers/transfer.service';
import { VfdProvider, TransferRequest } from '../../shared/providers/vfd.provider';
import User from '../users/user.model';
import { sha512 } from 'js-sha512';
import { InitiateBillPaymentRequest, ServiceType } from './bill-payment.interface';

function requireExtra<T>(
  value: T | undefined,
  name: string,
  service: ServiceType
): T {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    throw new Error(`Missing required '${name}' for serviceType='${service}'`);
  }
  return value;
}

export class BillPaymentService {
  static async initiateBillPayment(req: InitiateBillPaymentRequest) {
    const provider = new ClubConnectsService();
    const vfdProvider = new VfdProvider();
    
    const userId = req.userId;

    const user = await User.findById(userId);
    const from = (await vfdProvider.getAccountInfo(user? user.user_metadata.accountNo : "trx-user")).data;
    const to = (await vfdProvider.getPrimeAccountInfo()).data;

    const prd = req.extras?.internetNetwork? 
      req.extras.internetNetwork
    : req.extras?.mobileNetwork?
      req.extras.mobileNetwork == "01"?
        "MTN"
      : req.extras.mobileNetwork == "02"?
        "Glo"
      : req.extras.mobileNetwork == "03"?
        "9Mobile"
      : "Airtel"
    : req.extras?.meterType?
      req.extras.meterType == "01"?
        "Prepaid"
      : "Postpaid"
    : ''
    
    const idempotencyKey = req.idempotencyKey!;      
      
    return await processTransaction({
      userId: req.userId,
      amount: req.amount,
      serviceType: req.serviceType,
      serviceId: req.serviceId,
      customerReference: req.customerReference,
      idempotencyKey: req.idempotencyKey,
      providerFn: async () => {
        switch (req.serviceType) {
          /**
           * AIRTIME
           * ClubConnectsService.BuyAirtime(amount, mobileNumber, mobileNetwork, bonusType?)
           * - amount: req.amount
           * - mobileNumber: Number(req.customerReference)
           * - mobileNetwork: extras.mobileNetwork (REQUIRED)
           * - bonusType: extras.bonusType (OPTIONAL)
           */
          case 'airtime': {
            const mobileNetwork = requireExtra(req.extras?.mobileNetwork, 'extras.mobileNetwork', 'airtime');
            const mobileNumber = Number(req.customerReference);
            return provider.BuyAirtime(req.amount, mobileNumber, mobileNetwork, req.extras?.bonusType);
          }

          /**
           * DATA
           * ClubConnectsService.BuyData(dataPlan, mobileNumber, mobileNetwork)
           * - dataPlan: Number(req.serviceId) (REQUIRED)
           * - mobileNumber: Number(req.customerReference)
           * - mobileNetwork: extras.mobileNetwork (REQUIRED)
           */
          case 'data': {
            const dataPlan = Number(req.serviceId);
            if (Number.isNaN(dataPlan)) {
              throw new Error(`Invalid 'serviceId' for data: expected numeric dataPlan, got '${req.serviceId}'`);
            }
            const mobileNetwork = requireExtra(req.extras?.mobileNetwork, 'extras.mobileNetwork', 'data');
            const mobileNumber = Number(req.customerReference);
            return provider.BuyData(dataPlan, mobileNumber, mobileNetwork);
          }

          /**
           * TV
           * ClubConnectsService.BuyTv(cableTV, pkg, smartCardNo, phoneNo)
           * - cableTV: req.serviceId (REQUIRED)
           * - pkg: extras.pkg (REQUIRED)
           * - smartCardNo: Number(req.customerReference) (REQUIRED)
           * - phoneNo: You may choose to pass a contact phone; reusing customerReference is common.
           */
          case 'tv': {
            const cableTV = req.serviceId as any;
            const pkg = requireExtra(req.extras?.pkg, 'extras.pkg', 'tv');
            const smartCardNo = Number(req.customerReference);
            const phoneNo = smartCardNo; // or pass a separate contact number if you store it elsewhere
            return provider.BuyTv(cableTV, pkg, smartCardNo, phoneNo);
          }

          /**
           * POWER
           * ClubConnectsService.BuyPower(electricCompany, meterType, meterNo, amount, phoneNo)
           * - electricCompany: req.serviceId (REQUIRED)
           * - meterType: extras.meterType (REQUIRED)
           * - meterNo: Number(req.customerReference) (REQUIRED)
           * - amount: req.amount
           * - phoneNo: a phone to receive token/SMS; reusing meterNo or separate phone is common
           */
          case 'power': {
            const electricCompany = req.serviceId;
            const meterType = requireExtra(req.extras?.meterType, 'extras.meterType', 'power');
            const meterNo = Number(req.customerReference);
            const phoneNo = meterNo; // or supply a distinct phone number if available
            return provider.BuyPower(electricCompany, meterType, meterNo, req.amount, phoneNo);
          }

          /**
           * BETTING
           * ClubConnectsService.BuyBetting(bettingCompany, customerId, amount)
           * - bettingCompany: req.serviceId
           * - customerId: Number(req.customerReference)
           * - amount: req.amount
           */
          case 'betting': {
            const bettingCompany = req.serviceId;
            const customerId = Number(req.customerReference);
            return provider.BuyBetting(bettingCompany, customerId, req.amount);
          }

          /**
           * INTERNET
           * ClubConnectsService.BuyInternet(mobileNetwork, dataPlan, mobileNumber)
           * - mobileNetwork: extras.internetNetwork ('smile-direct' | 'spectranet') (REQUIRED)
           * - dataPlan: req.serviceId (string)
           * - mobileNumber: Number(req.customerReference)
           */
          case 'internet': {
            const internetNetwork = requireExtra(req.extras?.internetNetwork, 'extras.internetNetwork', 'internet');
            const dataPlan = req.serviceId; // e.g., Smile/Spectranet plan code
            const mobileNumber = Number(req.customerReference);
            return provider.BuyInternet(internetNetwork, dataPlan, mobileNumber);
          }

          /**
           * WAEC
           * ClubConnectsService.BuyWaec(examType, phoneNo)
           * - examType: req.serviceId
           * - phoneNo: Number(req.customerReference)
           */
          case 'waec': {
            const examType = req.serviceId;
            const phoneNo = Number(req.customerReference);
            return provider.BuyWaec(examType, phoneNo);
          }

          /**
           * JAMB
           * ClubConnectsService.BuyJamb(examType, phoneNo)
           * - examType: req.serviceId
           * - phoneNo: Number(req.customerReference)
           */
          case 'jamb': {
            const examType = req.serviceId;
            const phoneNo = Number(req.customerReference);
            return provider.BuyJamb(examType, phoneNo);
          }

          default:
            throw new Error(`Unsupported serviceType: ${req.serviceType}`);
        }
      },
      txnProvider: async () => {
        // 1. Create transfer record + ledger entry (PENDING)
        const result = await TransferService.initiateTransfer({
          fromAccount: from.accountNo,
          userId,
          toAccount: to.accountNo,
          amount: req.amount,
          transferType: "intra",
          bankCode: "999999",
          remark: `${prd} ${req.serviceType[0].toLocaleUpperCase()}${req.serviceType.slice(1)} Purchase`,
          idempotencyKey,
        });
        
        // 2. Send transfer to VFD
        const transferReq: TransferRequest = {
          uniqueSenderAccountId: from.accountId,
          fromAccount: from.accountNo,
          fromClientId: from.clientId,
          fromClient: from.client,
          fromSavingsId: from.accountId,
          toAccount: to.accountNo,
          toClient: to.client,
          toSession: to.accountId,
          toClientId: to.clientId,
          toSavingsId: to.accountId,
          toBank: "999999",
          signature: sha512.hex(`${from.accountNo}${to.accountNo}`),
          amount: req.amount,
          remark: `${prd} ${req.serviceType[0].toLocaleUpperCase()}${req.serviceType.slice(1)} Purchase`,
          transferType: "intra",
          reference: result.reference,
        };

        return {...(await vfdProvider.transfer(transferReq)), reference: result.reference};
      }
    });
  }
}
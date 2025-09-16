/**
 * Bill Payment Controller - V2 bill payment endpoints
 * Exposes ClubConnect provider querying & validation endpoints
 */
import { Request, Response, NextFunction } from "express";
import { BillPaymentService } from "./bill.payment.service";
import { ClubConnectsService } from "../../shared/providers/clubConnect.provider";
import { ProtectedRequest } from "../../interfaces";

export class BillPaymentController {
  /**
   * Initiate bill payment transaction
   */
  static async initiate(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { amount, serviceType, serviceId, customerReference, extras } = req.body;
      const userId = req.user!._id;
      const idempotencyKey = req.idempotencyKey!;

      const result = await BillPaymentService.initiateBillPayment({
        userId,
        amount,
        serviceType,
        serviceId,
        customerReference,
        extras,
        idempotencyKey,
      });

      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch status of a transaction
   */
  static async getStatus(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const provider = new ClubConnectsService();

      const result = await provider.QueryTransaction(Number(id));

      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a transaction
   */
  static async cancelTransaction(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const provider = new ClubConnectsService();

      const result = await provider.CancelTransaction(Number(id));

      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Wallet balance
   */
  static async walletBalance(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const provider = new ClubConnectsService();
      const balance = await provider.CheckWalletBalance();

      res.status(200).json({ status: "success", data: balance });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List data plans
   */
  static async getDataPlans(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const provider = new ClubConnectsService();
      const plans = await provider.GetDataPlans();

      res.status(200).json({ status: "success", data: plans });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List TV packages
   */
  static async getTvPackages(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const provider = new ClubConnectsService();
      const tv = await provider.GetTvPackages();

      res.status(200).json({ status: "success", data: tv });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify TV smartcard number
   */
  static async verifyTv(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { cableTV, smartCardNo } = req.body;
      const provider = new ClubConnectsService();

      const result = await provider.VerifyTvNumber(cableTV, Number(smartCardNo));

      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Electricity subscriptions
   */
  static async getPowerSubscriptions(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const provider = new ClubConnectsService();
      const subs = await provider.GetPowerSubscriptions();

      res.status(200).json({ status: "success", data: subs });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify electricity meter number
   */
  static async verifyPower(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { electricCompany, meterNo } = req.body;
      const provider = new ClubConnectsService();

      const result = await provider.VerifyPowerNumber(electricCompany, Number(meterNo));

      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Betting platforms
   */
  static async getBettingPlatforms(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const provider = new ClubConnectsService();
      const platforms = await provider.GetBettingPlatforms();

      res.status(200).json({ status: "success", data: platforms });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify betting customer
   */
  static async verifyBetting(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { bettingCompany, customerId } = req.body;
      const provider = new ClubConnectsService();

      const result = await provider.VerifyBettingNumber(bettingCompany, Number(customerId));

      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Internet plans
   */
  static async getInternetPlans(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { network } = req.params; // "smile-direct" or "spectranet"
      const provider = new ClubConnectsService();

      const result = await provider.GetInternetPlans(network as "smile-direct" | "spectranet");

      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify Smile number
   */
  static async verifySmile(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { mobileNumber } = req.body;
      const provider = new ClubConnectsService();

      const result = await provider.VerifySmileNumber(Number(mobileNumber));

      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * WAEC types
   */
  static async getWaecTypes(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const provider = new ClubConnectsService();
      const types = await provider.GetWaecTypes();

      res.status(200).json({ status: "success", data: types });
    } catch (error) {
      next(error);
    }
  }

  /**
   * JAMB types
   */
  static async getJambTypes(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const provider = new ClubConnectsService();
      const types = await provider.GetJambTypes();

      res.status(200).json({ status: "success", data: types });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify JAMB profile
   */
  static async verifyJamb(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { examType, profileId } = req.body;
      const provider = new ClubConnectsService();

      const result = await provider.VerifyJambNumber(examType, Number(profileId));

      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      next(error);
    }
  }
}

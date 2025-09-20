import { Schema, model, Document } from "mongoose";

export interface ISettings extends Document {
  autoLoanApproval: boolean;         // enable/disable automatic loan approval
  maxLoanAmount: number;             // maximum loan amount allowed
  minCreditScore: number;            // minimum credit score required
  maxLoanTerm: number;               // maximum loan term in months/days
  loanEnabled: boolean;              // toggle loan feature
  transferEnabled: boolean;          // toggle transfers
  transferDailyLimit: number;        // daily transfer cap
  savingsEnabled: boolean;           // toggle savings
  billPaymentEnabled: boolean;       // toggle bill payments
  savingsPenalty: number;            // penalty for early withdrawal
  savingsInterestRate: number;       // e.g., 0.025 = 2.5%
  updatedBy: string;                 // adminId who last updated
  updatedAt: Date;                   // last updated timestamp
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  companyTimezone: string;
  maintenanceMode: boolean;          // put platform in maintenance mode
  singleton: string;
}

const SettingsSchema = new Schema<ISettings>(
  {
    autoLoanApproval: { type: Boolean, default: true },
    maxLoanAmount: { type: Number, default: 50000 }, // ₦50,000
    minCreditScore: { type: Number, default: 0.4 },
    maxLoanTerm: { type: Number, default: 12 }, // e.g., 12 months

    loanEnabled: { type: Boolean, default: true },
    transferEnabled: { type: Boolean, default: true },
    transferDailyLimit: { type: Number, default: 500000 }, // ₦500,000
    savingsEnabled: { type: Boolean, default: true },
    billPaymentEnabled: { type: Boolean, default: true },

    savingsPenalty: { type: Number, default: 0.15 }, // 15%
    savingsInterestRate: { type: Number, default: 0.025 }, // 2.5%

    companyName: { type: String, default: "Prime Finance" },
    companyPhone: { type: String, default: "+234-800-000-0000" },
    companyEmail: { type: String, default: "support@primefinance.live" },
    companyAddress: { type: String, default: "Lagos, Nigeria" },
    companyTimezone: { type: String, default: "Africa/Lagos" },

    maintenanceMode: { type: Boolean, default: false },

    updatedBy: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "settings" }
);

// ✅ Enforce single settings document
SettingsSchema.index({ singleton: 1 }, { unique: true });
SettingsSchema.add({ singleton: { type: String, default: "singleton" } });

export const Settings = model<ISettings>("Settings", SettingsSchema);

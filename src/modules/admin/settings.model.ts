import { Schema, model, Document } from "mongoose";

export interface ISettings extends Document {
  autoLoanApproval: boolean; // enable/disable automatic loan approval
  maxLoanAmount: number; // in kobo (e.g., 5000000 = ₦50,000)
  minCreditScore: number; // minimum credit score required
  loanEnabled: boolean;
  transferEnabled: boolean;
  transferDailyLimit: number; // in kobo
  savingsEnabled: boolean;
  billPaymentEnabled: boolean;
  savingsPenalty: Number;
  updatedBy: string; // adminId
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    autoLoanApproval: { type: Boolean, default: true },
    maxLoanAmount: { type: Number, default: 50000 }, // ₦50,000 default
    minCreditScore: { type: Number, default: 0.4 },
    transferEnabled: { type: Boolean, default: true },
    transferDailyLimit: { type: Number, default: 500000 }, // ₦1,000,000 default
    loanEnabled: { type: Boolean, default: true },
    savingsPenalty: { type: Number, default: 0.15 },
    savingsEnabled: { type: Boolean, default: true },
    billPaymentEnabled: { type: Boolean, default: true },
    updatedBy: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now }
  },
  { collection: "settings" }
);

// Ensure only one settings doc exists
SettingsSchema.index({}, { unique: true });

export const Settings = model<ISettings>("Settings", SettingsSchema);

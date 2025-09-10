import { Settings, ISettings } from "./settings.model";

export class SettingsService {
  /**
   * Get current system settings
   */
  static async getSettings(): Promise<ISettings> {
    let settings = await Settings.findOne();
    if (!settings) {
      // initialize defaults if none exist
      settings = await Settings.create({
        autoLoanApproval: true,
        maxLoanAmount: 5000000,
        minCreditScore: 0.4,
        transferEnabled: true,
        transferDailyLimit: 100000000,
        savingsEnabled: true,
        billPaymentEnabled: true,
        updatedBy: "system"
      });
    }
    return settings;
  }

  /**
   * Update system settings
   */
  static async updateSettings(
    adminId: string,
    updates: Partial<ISettings>
  ): Promise<ISettings> {
    const settings = await Settings.findOneAndUpdate(
      {},
      { ...updates, updatedBy: adminId, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    return settings!;
  }
}

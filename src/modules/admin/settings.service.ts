import { Settings, ISettings } from "./settings.model";

export class SettingsService {
  /**
   * Get current system settings (always returns the singleton doc)
   */
  static async getSettings(): Promise<ISettings> {
    let settings = await Settings.findOne({ singleton: "singleton" });
    if (!settings) {
      // initialize with schema defaults
      settings = await Settings.create({
        singleton: "singleton",
        updatedBy: "system",
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
      { singleton: "singleton" },
      { ...updates, updatedBy: adminId, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    return settings!;
  }
}

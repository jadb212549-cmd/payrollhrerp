/**
 * Settings Repository - Data Access Layer
 * Manages local application configuration
 */

import { dbEngine } from '../db/database';
import { ApplicationSettings } from '../db/schema';

export class SettingsRepository {
  private static instance: SettingsRepository | null = null;
  private readonly storeName = 'application_settings';
  private readonly defaultId = 'app_settings_default';

  private constructor() {}

  public static getInstance(): SettingsRepository {
    if (!SettingsRepository.instance) {
      SettingsRepository.instance = new SettingsRepository();
    }
    return SettingsRepository.instance;
  }

  public async getSettings(): Promise<ApplicationSettings> {
    const settings = await dbEngine.get<ApplicationSettings>(this.storeName, this.defaultId);
    if (!settings) {
      const fallback: ApplicationSettings = {
        id: this.defaultId,
        theme: 'bento',
        language: 'en-US',
        dateFormat: 'YYYY-MM-DD',
        currency: 'PHP',
        startupCompanyId: null,
        salaryPrivacy: false,
        compactMode: false,
        updatedAt: new Date().toISOString(),
      };
      await dbEngine.put<ApplicationSettings>(this.storeName, fallback);
      return fallback;
    }
    return settings;
  }

  public async updateSettings(partial: Partial<ApplicationSettings>): Promise<ApplicationSettings> {
    const current = await this.getSettings();
    const updated: ApplicationSettings = {
      ...current,
      ...partial,
      id: this.defaultId,
      updatedAt: new Date().toISOString(),
    };
    await dbEngine.put<ApplicationSettings>(this.storeName, updated);
    return updated;
  }
}

export const settingsRepository = SettingsRepository.getInstance();

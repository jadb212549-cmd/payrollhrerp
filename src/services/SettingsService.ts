/**
 * Settings Service - Business Layer for Application Configuration
 */

import { settingsRepository } from '../repositories/SettingsRepository';
import { ApplicationSettings } from '../db/schema';

export class SettingsService {
  private static instance: SettingsService | null = null;

  private constructor() {}

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  public async getSettings(): Promise<ApplicationSettings> {
    return settingsRepository.getSettings();
  }

  public async updateSettings(partial: Partial<ApplicationSettings>): Promise<ApplicationSettings> {
    return settingsRepository.updateSettings(partial);
  }
}

export const settingsService = SettingsService.getInstance();

/**
 * Portable Persistence Engine for Tauri Desktop (Windows Portable) & Web
 * Ensures all database records and changes are automatically saved to and loaded
 * from the portable data folder directly beside the executable (./payroll_data/payroll_master_db.json).
 */

import { dbEngine } from '../db/database';
import { ALL_STORE_NAMES } from './BackupRestoreService';
import { CURRENT_APP_VERSION } from '../config/version';

const PORTABLE_FILE_NAME = 'payroll_master_db.json';
const LOCAL_MIRROR_KEY = 'payroll_master_portable_mirror';

export interface PortableDatabasePayload {
  version: string;
  appVersion: string;
  timestamp: string;
  totalRecords: number;
  stores: Record<string, any[]>;
}

export class PortablePersistenceService {
  private static instance: PortablePersistenceService | null = null;
  private autoSaveTimer: any = null;
  private isInitialized = false;
  private lastSavedTimestamp: string | null = null;
  private portableFilePath: string = './payroll_data/payroll_master_db.json';

  private constructor() {}

  public static getInstance(): PortablePersistenceService {
    if (!PortablePersistenceService.instance) {
      PortablePersistenceService.instance = new PortablePersistenceService();
    }
    return PortablePersistenceService.instance;
  }

  /**
   * Check if running in Tauri desktop environment
   */
  public isTauri(): boolean {
    return typeof window !== 'undefined' && (!!(window as any).__TAURI__ || !!(window as any).__TAURI_IPC__);
  }

  /**
   * Safe Tauri invoke wrapper
   */
  private async invokeTauri<T>(cmd: string, args?: Record<string, any>): Promise<T | null> {
    try {
      if (this.isTauri() && (window as any).__TAURI__?.invoke) {
        return await (window as any).__TAURI__.invoke(cmd, args);
      }
    } catch (err) {
      console.warn(`[PortablePersistence] Tauri invoke '${cmd}' error:`, err);
    }
    return null;
  }

  /**
   * Get the absolute path of the portable data file
   */
  public async getPortablePath(): Promise<string> {
    if (this.isTauri()) {
      const path = await this.invokeTauri<string>('get_portable_data_path');
      if (path) {
        this.portableFilePath = path;
        return path;
      }
    }
    return this.portableFilePath;
  }

  public getLastSavedTimestamp(): string | null {
    return this.lastSavedTimestamp;
  }

  /**
   * Export all IndexedDB stores into a unified portable JSON payload
   */
  public async dumpDatabase(): Promise<PortableDatabasePayload> {
    const storesData: Record<string, any[]> = {};
    let totalCount = 0;

    for (const storeName of ALL_STORE_NAMES) {
      try {
        const records = await dbEngine.getAll<any>(storeName);
        storesData[storeName] = records || [];
        totalCount += (records || []).length;
      } catch {
        storesData[storeName] = [];
      }
    }

    return {
      version: '1.0.0',
      appVersion: CURRENT_APP_VERSION.version,
      timestamp: new Date().toISOString(),
      totalRecords: totalCount,
      stores: storesData,
    };
  }

  /**
   * Save the entire database snapshot to disk beside the executable
   */
  public async saveToDisk(): Promise<{ success: boolean; path: string; totalRecords: number }> {
    try {
      const payload = await this.dumpDatabase();
      const jsonString = JSON.stringify(payload, null, 2);

      // 1. Mirror to LocalStorage for web/offline redundancy
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem(LOCAL_MIRROR_KEY, jsonString);
        } catch {
          // localStorage full or restricted
        }
      }

      // 2. Save directly beside the executable in Tauri
      if (this.isTauri()) {
        const result = await this.invokeTauri<boolean>('save_portable_data', {
          content: jsonString,
          filename: PORTABLE_FILE_NAME,
        });

        if (result) {
          this.lastSavedTimestamp = payload.timestamp;
          const fullPath = await this.getPortablePath();
          console.info(`[PortablePersistence] Data saved successfully beside EXE at ${fullPath}`);
          return { success: true, path: fullPath, totalRecords: payload.totalRecords };
        }
      }

      this.lastSavedTimestamp = payload.timestamp;
      return { success: true, path: this.portableFilePath, totalRecords: payload.totalRecords };
    } catch (err: any) {
      console.error('[PortablePersistence] Failed to save database to disk:', err);
      return { success: false, path: this.portableFilePath, totalRecords: 0 };
    }
  }

  /**
   * Restore database from portable file beside the executable or localStorage mirror
   */
  public async restoreFromDisk(): Promise<{ success: boolean; loadedRecords: number; source: string }> {
    try {
      let rawJson: string | null = null;
      let source = 'None';

      // 1. Attempt to load from Tauri file beside the executable
      if (this.isTauri()) {
        const fileExists = await this.invokeTauri<boolean>('check_portable_data_exists', {
          filename: PORTABLE_FILE_NAME,
        });

        if (fileExists) {
          rawJson = await this.invokeTauri<string>('load_portable_data', {
            filename: PORTABLE_FILE_NAME,
          });
          source = 'Portable File (beside EXE)';
        }
      }

      // 2. Fallback to LocalStorage mirror if not found or in web mode
      if (!rawJson && typeof window !== 'undefined' && window.localStorage) {
        rawJson = localStorage.getItem(LOCAL_MIRROR_KEY);
        if (rawJson) {
          source = 'Browser Storage Mirror';
        }
      }

      if (!rawJson) {
        return { success: false, loadedRecords: 0, source: 'No data file found' };
      }

      const payload: PortableDatabasePayload = JSON.parse(rawJson);
      if (!payload.stores || typeof payload.stores !== 'object') {
        throw new Error('Invalid portable database format');
      }

      let loadedCount = 0;

      // Populate IndexedDB object stores
      for (const [storeName, records] of Object.entries(payload.stores)) {
        if (!Array.isArray(records) || records.length === 0) continue;

        for (const record of records) {
          try {
            await dbEngine.put(storeName, record);
            loadedCount++;
          } catch (err) {
            console.warn(`[PortablePersistence] Error inserting record into ${storeName}:`, err);
          }
        }
      }

      console.info(`[PortablePersistence] Restored ${loadedCount} records from ${source}`);
      this.lastSavedTimestamp = payload.timestamp || new Date().toISOString();
      return { success: true, loadedRecords: loadedCount, source };
    } catch (err: any) {
      console.error('[PortablePersistence] Error restoring database from disk:', err);
      return { success: false, loadedRecords: 0, source: 'Error: ' + err?.message };
    }
  }

  /**
   * Schedule debounced auto-save to disk
   */
  public scheduleAutoSave() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      this.saveToDisk();
    }, 2000);
  }

  /**
   * Initialize persistence lifecycle hooks
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Check path
    await this.getPortablePath();

    // Check if portable file exists on startup and restore if present
    const restoreResult = await this.restoreFromDisk();
    if (restoreResult.success) {
      console.info(`[PortablePersistence] Initialized and hydrated from ${restoreResult.source} (${restoreResult.loadedRecords} records)`);
    } else {
      console.info('[PortablePersistence] Initialized fresh state.');
    }

    // Register auto-save listener on database modifications
    dbEngine.addChangeListener(() => {
      this.scheduleAutoSave();
    });

    // Hook into beforeunload / window closing to perform immediate save
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveToDisk();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.saveToDisk();
        }
      });
    }
  }
}

export const portablePersistenceService = PortablePersistenceService.getInstance();

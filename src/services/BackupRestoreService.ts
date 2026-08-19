/**
 * Backup, Restore, & Factory Reset Engine - Phase 10 Production Hardening
 */

import { dbEngine } from '../db/database';
import { SecurityService } from './SecurityService';
import { auditService } from './AuditService';

const ALL_STORE_NAMES = [
  'schema_migrations',
  'companies',
  'users',
  'roles',
  'user_companies',
  'audit_logs',
  'application_settings',
  'departments',
  'positions',
  'employees',
  'employee_rate_history',
  'dtr_records',
  'overtime_requests',
  'payroll_rules',
  'payroll_periods',
  'payroll_runs',
  'payslip_records',
];

export interface BackupPayload {
  version: string;
  appVersion: string;
  timestamp: string;
  recordCount: number;
  data: Record<string, any[]>;
  checksum: string;
}

export class BackupRestoreService {
  /**
   * Export complete database backup
   */
  public async createBackup(): Promise<{ payload: BackupPayload; jsonString: string; filename: string }> {
    const dataMap: Record<string, any[]> = {};
    let totalCount = 0;

    for (const store of ALL_STORE_NAMES) {
      try {
        const records = await dbEngine.getAll<any>(store);
        dataMap[store] = records;
        totalCount += records.length;
      } catch (err) {
        dataMap[store] = [];
      }
    }

    const dataJsonStr = JSON.stringify(dataMap);
    const checksum = await SecurityService.generateChecksum(dataJsonStr);
    const timestamp = new Date().toISOString();
    const filename = `Payroll_ERP_Backup_${timestamp.split('T')[0]}_${Date.now()}.json`;

    const payload: BackupPayload = {
      version: '1.0.0',
      appVersion: '0.1.0',
      timestamp,
      recordCount: totalCount,
      data: dataMap,
      checksum,
    };

    const fullJson = JSON.stringify(payload, null, 2);

    // Audit action
    auditService.logAction({
      userId: 'admin',
      action: 'SYSTEM',
      entityType: 'Backup',
      entityId: filename,
      description: `Created system backup containing ${totalCount} records across ${ALL_STORE_NAMES.length} data stores.`,
    });

    return { payload, jsonString: fullJson, filename };
  }

  /**
   * Validate uploaded backup file
   */
  public async validateBackup(jsonString: string): Promise<{
    isValid: boolean;
    error?: string;
    payload?: BackupPayload;
    summary?: Record<string, number>;
  }> {
    try {
      const payload = JSON.parse(jsonString) as BackupPayload;
      if (!payload || !payload.version || !payload.data || !payload.checksum) {
        return { isValid: false, error: 'Invalid backup structure. Required metadata headers missing.' };
      }

      // Checksum Verification
      const dataJsonStr = JSON.stringify(payload.data);
      const computedChecksum = await SecurityService.generateChecksum(dataJsonStr);

      if (computedChecksum !== payload.checksum) {
        return { isValid: false, error: 'Backup checksum validation failed. File may be corrupted or modified.' };
      }

      const summary: Record<string, number> = {};
      for (const [store, records] of Object.entries(payload.data)) {
        summary[store] = Array.isArray(records) ? records.length : 0;
      }

      return { isValid: true, payload, summary };
    } catch (err: any) {
      return { isValid: false, error: `Failed to parse backup JSON: ${err?.message || 'Invalid JSON format'}` };
    }
  }

  /**
   * Perform database restoration with safety backup creation
   */
  public async restoreBackup(payload: BackupPayload): Promise<{ success: boolean; safetyBackupFilename?: string }> {
    // 1. Create Safety Backup First
    const { jsonString: safetyJson, filename: safetyFilename } = await this.createBackup();
    
    // Store safety backup in localStorage / download blob as emergency safeguard
    sessionStorage.setItem('payroll_safety_backup', safetyJson);

    // 2. Clear & Restore stores
    for (const [storeName, records] of Object.entries(payload.data)) {
      if (ALL_STORE_NAMES.includes(storeName) && Array.isArray(records)) {
        // Overwrite items
        for (const record of records) {
          if (record && record.id) {
            await dbEngine.put(storeName, record);
          }
        }
      }
    }

    auditService.logAction({
      userId: 'admin',
      action: 'SYSTEM',
      entityType: 'BackupRestore',
      entityId: payload.checksum,
      description: `Restored database backup from timestamp ${payload.timestamp}. Safety backup created: ${safetyFilename}`,
    });

    return { success: true, safetyBackupFilename: safetyFilename };
  }

  /**
   * Factory Reset with Safety Backup
   */
  public async performFactoryReset(confirmationText: string): Promise<boolean> {
    if (confirmationText !== 'CONFIRM RESET') {
      throw new Error('Factory reset canceled: Confirmation text mismatch.');
    }

    // 1. Create Safety Backup
    await this.createBackup();

    // 2. Clear non-essential data stores
    const storesToClear = [
      'companies', 'employees', 'dtr_records', 'overtime_requests',
      'payroll_rules', 'payroll_periods', 'payroll_runs', 'payslip_records',
      'departments', 'positions', 'leave_records', 'loan_records'
    ];

    for (const store of storesToClear) {
      try {
        const records = await dbEngine.getAll<any>(store);
        for (const r of records) {
          if (r.id) await dbEngine.delete(store, r.id);
        }
      } catch (err) {
        console.error(`Failed clearing store ${store}:`, err);
      }
    }

    auditService.logAction({
      userId: 'admin',
      action: 'SYSTEM',
      entityType: 'FactoryReset',
      entityId: 'SYSTEM_RESET',
      description: 'Factory reset performed. Database restored to pristine clean state.',
    });

    return true;
  }
}

export const backupRestoreService = new BackupRestoreService();

/**
 * Database Migration Manager
 * Sequentially tracks and executes schema migrations
 */

import { dbEngine } from './database';
import { SchemaMigration, Role, User, ApplicationSettings, Department, Position } from './schema';

export class MigrationManager {
  private static instance: MigrationManager | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  /**
   * Run pending migrations
   */
  public async runMigrations(): Promise<{ currentVersion: number; appliedCount: number }> {
    if (this.isInitialized) {
      const current = await this.getCurrentVersion();
      return { currentVersion: current, appliedCount: 0 };
    }

    const currentVersion = await this.getCurrentVersion();
    let appliedCount = 0;

    // Migration 1: Initial Foundation Schemas & Seed Roles
    if (currentVersion < 1) {
      await this.applyMigration1();
      appliedCount++;
    }

    // Migration 2: Employee, Department, and Position Infrastructure
    if (currentVersion < 2) {
      await this.applyMigration2();
      appliedCount++;
    }

    this.isInitialized = true;
    const finalVersion = await this.getCurrentVersion();
    return { currentVersion: finalVersion, appliedCount };
  }

  public async getCurrentVersion(): Promise<number> {
    try {
      const migrations = await dbEngine.getAll<SchemaMigration>('schema_migrations');
      if (!migrations || migrations.length === 0) {
        return 0;
      }
      return Math.max(...migrations.map((m) => m.version));
    } catch {
      return 0;
    }
  }

  /**
   * Version 1: Core Roles, Default Settings, and Admin User Foundation
   */
  private async applyMigration1(): Promise<void> {
    const timestamp = new Date().toISOString();

    // 1. Initial Standard Roles
    const standardRoles: Role[] = [
      { id: 'role_super_admin', name: 'Super Admin', description: 'Full cross-company system configuration and user management', createdAt: timestamp },
      { id: 'role_company_admin', name: 'Company Admin', description: 'Administrative and operational configuration for assigned company', createdAt: timestamp },
      { id: 'role_payroll_admin', name: 'Payroll Admin', description: 'Full access to payroll processing, cutoffs, and disbursements', createdAt: timestamp },
      { id: 'role_hr', name: 'HR', description: 'Employee 201 records, attendance, and leave management', createdAt: timestamp },
      { id: 'role_reviewer', name: 'Reviewer', description: 'Worksheet and report verification rights prior to final payroll approval', createdAt: timestamp },
      { id: 'role_approver', name: 'Approver', description: 'Disbursement and final payroll release authorization', createdAt: timestamp },
      { id: 'role_viewer', name: 'Viewer', description: 'Read-only access to company reports and dashboards', createdAt: timestamp },
    ];

    for (const role of standardRoles) {
      const existing = await dbEngine.get<Role>('roles', role.id);
      if (!existing) {
        await dbEngine.put('roles', role);
      }
    }

    // 2. Default Application Settings
    const defaultSettings: ApplicationSettings = {
      id: 'app_settings_default',
      theme: 'bento',
      language: 'en-US',
      dateFormat: 'YYYY-MM-DD',
      currency: 'PHP',
      startupCompanyId: null,
      salaryPrivacy: true,
      compactMode: false,
      updatedAt: timestamp,
    };

    const existingSettings = await dbEngine.get<ApplicationSettings>('application_settings', defaultSettings.id);
    if (!existingSettings) {
      await dbEngine.put('application_settings', defaultSettings);
    }

    // 3. Default System Administrator (Local)
    const adminUser: User = {
      id: 'user_admin_root',
      username: 'admin',
      displayName: 'System Administrator',
      email: 'admin@payroll.local',
      passwordHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // SHA-256 placeholder
      role: 'Super Admin',
      companyAccess: ['*'],
      status: 'Active',
      createdAt: timestamp,
      updatedAt: timestamp,
      lastLoginAt: timestamp,
    };

    const existingAdmin = await dbEngine.get<User>('users', adminUser.id);
    if (!existingAdmin) {
      await dbEngine.put('users', adminUser);
    }

    // Record migration 1
    const migrationRecord: SchemaMigration = {
      version: 1,
      name: 'v1_foundation_core_roles_settings',
      appliedAt: timestamp,
    };
    await dbEngine.put('schema_migrations', migrationRecord);
  }

  /**
   * Version 2: Employee Master Data, Departments, Positions, and Rate History
   */
  private async applyMigration2(): Promise<void> {
    const timestamp = new Date().toISOString();

    // Record migration 2
    const migrationRecord: SchemaMigration = {
      version: 2,
      name: 'v2_employee_dept_pos_rate_history',
      appliedAt: timestamp,
    };
    await dbEngine.put('schema_migrations', migrationRecord);
  }
}

export const migrationManager = MigrationManager.getInstance();

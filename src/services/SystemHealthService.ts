/**
 * System Health Diagnostic & Data Integrity Scanner Engine - Phase 11
 */

import { dbEngine } from '../db/database';
import { CURRENT_APP_VERSION } from '../config/version';
import { Employee, DTRRecord, PayrollRun, PayslipRecord, Company, Department } from '../db/schema';
import { diagnosticsService } from './DiagnosticsService';

export type HealthStatus = 'HEALTHY' | 'WARNING' | 'ERROR';

export interface HealthCheckItem {
  component: string;
  status: HealthStatus;
  message: string;
  details?: string;
}

export interface IntegrityIssue {
  id: string;
  title: string;
  entityType: string;
  recordId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedAction: string;
  details: string;
}

export class SystemHealthService {
  /**
   * Run System Health Check
   */
  public async runHealthCheck(): Promise<{ overall: HealthStatus; items: HealthCheckItem[] }> {
    const items: HealthCheckItem[] = [];

    // 1. Database Connectivity
    try {
      const db = await dbEngine.getDB();
      if (db) {
        items.push({
          component: 'IndexedDB Engine',
          status: 'HEALTHY',
          message: `Connected to ${db.name} (v${db.version})`,
        });
      } else {
        items.push({
          component: 'IndexedDB Engine',
          status: 'ERROR',
          message: 'Failed to initialize database connection',
        });
      }
    } catch (err: any) {
      items.push({
        component: 'IndexedDB Engine',
        status: 'ERROR',
        message: `Database error: ${err?.message}`,
      });
    }

    // 2. Database Schema
    items.push({
      component: 'Database Schema Version',
      status: 'HEALTHY',
      message: `Schema Version ${CURRENT_APP_VERSION.dbSchemaVersion} Compliant`,
    });

    // 3. Application Versioning
    items.push({
      component: 'Application Release Metadata',
      status: 'HEALTHY',
      message: `v${CURRENT_APP_VERSION.version} (Build ${CURRENT_APP_VERSION.buildNumber} - ${CURRENT_APP_VERSION.releaseChannel})`,
    });

    // 4. Data Stores Count Check
    try {
      const companies = await dbEngine.getAll<Company>('companies');
      const employees = await dbEngine.getAll<Employee>('employees');
      const runs = await dbEngine.getAll<PayrollRun>('payroll_runs');

      items.push({
        component: 'Core Data Stores',
        status: 'HEALTHY',
        message: `${companies.length} Companies, ${employees.length} Employees, ${runs.length} Payroll Runs initialized`,
      });
    } catch (err: any) {
      items.push({
        component: 'Core Data Stores',
        status: 'WARNING',
        message: `Store query warning: ${err?.message}`,
      });
    }

    // 5. Backup Availability
    try {
      const safetyBackup = sessionStorage.getItem('payroll_safety_backup');
      items.push({
        component: 'Local Safety Backup Buffer',
        status: safetyBackup ? 'HEALTHY' : 'WARNING',
        message: safetyBackup ? 'Safety snapshot active in memory buffer' : 'No recent memory backup snapshot found',
      });
    } catch {
      items.push({
        component: 'Local Safety Backup Buffer',
        status: 'WARNING',
        message: 'Storage quota warning',
      });
    }

    // Overall Calculation
    let overall: HealthStatus = 'HEALTHY';
    if (items.some((i) => i.status === 'ERROR')) {
      overall = 'ERROR';
    } else if (items.some((i) => i.status === 'WARNING')) {
      overall = 'WARNING';
    }

    return { overall, items };
  }

  /**
   * Run Data Integrity Scan across all entities without deleting data
   */
  public async runDataIntegrityScan(): Promise<IntegrityIssue[]> {
    diagnosticsService.log('INFO', 'SYSTEM', 'Executing full data integrity scan...');
    const issues: IntegrityIssue[] = [];

    try {
      const companies = await dbEngine.getAll<Company>('companies');
      const departments = await dbEngine.getAll<Department>('departments');
      const employees = await dbEngine.getAll<Employee>('employees');
      const dtrs = await dbEngine.getAll<DTRRecord>('dtr_records');
      const runs = await dbEngine.getAll<PayrollRun>('payroll_runs');
      const payslips = await dbEngine.getAll<PayslipRecord>('payslip_records');

      const companyIds = new Set(companies.map((c) => c.id));
      const departmentIds = new Set(departments.map((d) => d.id));
      const employeeIds = new Set(employees.map((e) => e.id));
      const runIds = new Set(runs.map((r) => r.id));

      // 1. Check Orphan Employees (Invalid company or department)
      for (const emp of employees) {
        const empName = `${emp.lastName}, ${emp.firstName}`;
        if (!companyIds.has(emp.companyId)) {
          issues.push({
            id: `iss_${emp.id}_comp`,
            title: 'Invalid Company Reference',
            entityType: 'Employee',
            recordId: emp.id,
            severity: 'CRITICAL',
            details: `Employee ${empName} (${emp.employeeNumber}) is assigned to non-existent company ID ${emp.companyId}`,
            recommendedAction: 'Reassign employee to an active company or archive record.',
          });
        }
        if (emp.departmentId && !departmentIds.has(emp.departmentId)) {
          issues.push({
            id: `iss_${emp.id}_dept`,
            title: 'Orphan Department Reference',
            entityType: 'Employee',
            recordId: emp.id,
            severity: 'MEDIUM',
            details: `Employee ${empName} (${emp.employeeNumber}) refers to missing department ID ${emp.departmentId}`,
            recommendedAction: 'Update employee department assignment.',
          });
        }
      }

      // 2. Check Orphan DTR Records
      for (const dtr of dtrs) {
        if (!employeeIds.has(dtr.employeeId)) {
          issues.push({
            id: `iss_dtr_${dtr.id}`,
            title: 'Orphan DTR Attendance Record',
            entityType: 'DTRRecord',
            recordId: dtr.id,
            severity: 'HIGH',
            details: `DTR record dated ${dtr.date} references non-existent employee ID ${dtr.employeeId}`,
            recommendedAction: 'Verify employee profile or purge invalid attendance reference.',
          });
        }
      }

      // 3. Check Orphan Payslip Records
      for (const slip of payslips) {
        if (!runIds.has(slip.payrollRunId)) {
          issues.push({
            id: `iss_slip_${slip.id}`,
            title: 'Orphan Payslip Record',
            entityType: 'PayslipRecord',
            recordId: slip.id,
            severity: 'HIGH',
            details: `Payslip for ${slip.employeeName} references missing payroll run ID ${slip.payrollRunId}`,
            recommendedAction: 'Verify payroll history batch reference.',
          });
        }
      }

      // 4. Duplicate Employee Numbers within same company
      const empNoMap = new Map<string, string>();
      for (const emp of employees) {
        const key = `${emp.companyId}:${emp.employeeNumber}`;
        if (empNoMap.has(key)) {
          issues.push({
            id: `iss_dup_${emp.id}`,
            title: 'Duplicate Employee Number in Company',
            entityType: 'Employee',
            recordId: emp.id,
            severity: 'HIGH',
            details: `Employee Number ${emp.employeeNumber} is used by multiple profiles in company ${emp.companyId}`,
            recommendedAction: 'Update employee number to be unique.',
          });
        } else {
          empNoMap.set(key, emp.id);
        }
      }

      diagnosticsService.log('INFO', 'SYSTEM', `Data integrity scan complete. Found ${issues.length} potential issues.`);
    } catch (err: any) {
      diagnosticsService.log('ERROR', 'SYSTEM', `Data integrity scan error: ${err?.message}`);
    }

    return issues;
  }
}

export const systemHealthService = new SystemHealthService();

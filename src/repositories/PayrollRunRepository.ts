/**
 * Payroll Run & Payslip Records Repository - Data Access Layer for Payroll Batches
 */

import { dbEngine } from '../db/database';
import { PayrollRun, PayslipRecord } from '../db/schema';

const RUN_STORE = 'payroll_runs';
const SLIP_STORE = 'payslip_records';

export class PayrollRunRepository {
  private static instance: PayrollRunRepository | null = null;

  private constructor() {}

  public static getInstance(): PayrollRunRepository {
    if (!PayrollRunRepository.instance) {
      PayrollRunRepository.instance = new PayrollRunRepository();
    }
    return PayrollRunRepository.instance;
  }

  // --- Payroll Run Batch Methods ---
  public async findAllRuns(): Promise<PayrollRun[]> {
    return this.findRunsByCompany(null);
  }

  public async findAllPayslips(): Promise<PayslipRecord[]> {
    return dbEngine.getAll<PayslipRecord>(SLIP_STORE);
  }

  public async findRunById(id: string): Promise<PayrollRun | null> {
    return dbEngine.get<PayrollRun>(RUN_STORE, id);
  }

  public async findRunsByCompany(companyId: string | null): Promise<PayrollRun[]> {
    const list = await dbEngine.getAll<PayrollRun>(RUN_STORE);
    if (!companyId) return list.sort((a, b) => b.runDate.localeCompare(a.runDate));
    return list.filter((r) => r.companyId === companyId).sort((a, b) => b.runDate.localeCompare(a.runDate));
  }

  public async createRun(run: PayrollRun): Promise<PayrollRun> {
    await dbEngine.put<PayrollRun>(RUN_STORE, run);
    return run;
  }

  public async updateRun(run: PayrollRun): Promise<PayrollRun> {
    await dbEngine.put<PayrollRun>(RUN_STORE, run);
    return run;
  }

  public async deleteRun(id: string): Promise<void> {
    await dbEngine.delete(RUN_STORE, id);
  }

  // --- Payslip Records Methods ---
  public async findPayslipById(id: string): Promise<PayslipRecord | null> {
    return dbEngine.get<PayslipRecord>(SLIP_STORE, id);
  }

  public async findPayslipsByRun(runId: string): Promise<PayslipRecord[]> {
    const list = await dbEngine.getAllByIndex<PayslipRecord>(SLIP_STORE, 'payrollRunId', runId);
    return list.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }

  public async findPayslipsByEmployee(employeeId: string): Promise<PayslipRecord[]> {
    const list = await dbEngine.getAllByIndex<PayslipRecord>(SLIP_STORE, 'employeeId', employeeId);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async createPayslip(slip: PayslipRecord): Promise<PayslipRecord> {
    await dbEngine.put<PayslipRecord>(SLIP_STORE, slip);
    return slip;
  }

  public async bulkSavePayslips(slips: PayslipRecord[]): Promise<void> {
    for (const s of slips) {
      await dbEngine.put<PayslipRecord>(SLIP_STORE, s);
    }
  }

  public async deletePayslipsByRun(runId: string): Promise<void> {
    const slips = await this.findPayslipsByRun(runId);
    for (const s of slips) {
      await dbEngine.delete(SLIP_STORE, s.id);
    }
  }
}

export const payrollRunRepository = PayrollRunRepository.getInstance();

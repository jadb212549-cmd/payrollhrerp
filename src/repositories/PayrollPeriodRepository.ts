/**
 * Payroll Period Repository - Data Access Layer for Cutoff Periods
 */

import { dbEngine } from '../db/database';
import { PayrollPeriod } from '../db/schema';

const STORE_NAME = 'payroll_periods';

export class PayrollPeriodRepository {
  private static instance: PayrollPeriodRepository | null = null;

  private constructor() {}

  public static getInstance(): PayrollPeriodRepository {
    if (!PayrollPeriodRepository.instance) {
      PayrollPeriodRepository.instance = new PayrollPeriodRepository();
    }
    return PayrollPeriodRepository.instance;
  }

  public async findById(id: string): Promise<PayrollPeriod | null> {
    return dbEngine.get<PayrollPeriod>(STORE_NAME, id);
  }

  public async findByCompany(companyId: string | null): Promise<PayrollPeriod[]> {
    const list = await dbEngine.getAll<PayrollPeriod>(STORE_NAME);
    if (!companyId) return list.sort((a, b) => b.startDate.localeCompare(a.startDate));
    return list.filter((p) => p.companyId === companyId).sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  public async findAll(): Promise<PayrollPeriod[]> {
    const list = await dbEngine.getAll<PayrollPeriod>(STORE_NAME);
    return list.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  public async create(period: PayrollPeriod): Promise<PayrollPeriod> {
    await dbEngine.put<PayrollPeriod>(STORE_NAME, period);
    return period;
  }

  public async update(period: PayrollPeriod): Promise<PayrollPeriod> {
    await dbEngine.put<PayrollPeriod>(STORE_NAME, period);
    return period;
  }

  public async delete(id: string): Promise<void> {
    await dbEngine.delete(STORE_NAME, id);
  }
}

export const payrollPeriodRepository = PayrollPeriodRepository.getInstance();

import { dbEngine } from '../db/database';
import { EmployeeRateHistory } from '../db/schema';

export class RateHistoryRepository {
  private readonly storeName = 'employee_rate_history';

  public async findById(id: string): Promise<EmployeeRateHistory | null> {
    return dbEngine.get<EmployeeRateHistory>(this.storeName, id);
  }

  public async findByEmployeeId(employeeId: string): Promise<EmployeeRateHistory[]> {
    const list = await dbEngine.getAllByIndex<EmployeeRateHistory>(this.storeName, 'employeeId', employeeId);
    // Sort descending by effective date
    return list.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
  }

  public async findByCompanyId(companyId: string): Promise<EmployeeRateHistory[]> {
    return dbEngine.getAllByIndex<EmployeeRateHistory>(this.storeName, 'companyId', companyId);
  }

  public async save(rateHistory: EmployeeRateHistory): Promise<void> {
    await dbEngine.put(this.storeName, rateHistory);
  }

  public async delete(id: string): Promise<void> {
    await dbEngine.delete(this.storeName, id);
  }
}

export const rateHistoryRepository = new RateHistoryRepository();

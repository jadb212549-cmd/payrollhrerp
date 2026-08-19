/**
 * Overtime Repository - Data Access Layer for Overtime Applications
 */

import { dbEngine } from '../db/database';
import { OvertimeRequest, OvertimeStatus } from '../db/schema';

const STORE_NAME = 'overtime_requests';

export class OvertimeRepository {
  private static instance: OvertimeRepository | null = null;

  private constructor() {}

  public static getInstance(): OvertimeRepository {
    if (!OvertimeRepository.instance) {
      OvertimeRepository.instance = new OvertimeRepository();
    }
    return OvertimeRepository.instance;
  }

  public async findById(id: string): Promise<OvertimeRequest | null> {
    return dbEngine.get<OvertimeRequest>(STORE_NAME, id);
  }

  public async findByCompany(companyId: string): Promise<OvertimeRequest[]> {
    const records = await dbEngine.getAllByIndex<OvertimeRequest>(STORE_NAME, 'companyId', companyId);
    return records.sort((a, b) => b.date.localeCompare(a.date));
  }

  public async findAll(): Promise<OvertimeRequest[]> {
    const records = await dbEngine.getAll<OvertimeRequest>(STORE_NAME);
    return records.sort((a, b) => b.date.localeCompare(a.date));
  }

  public async create(record: OvertimeRequest): Promise<OvertimeRequest> {
    await dbEngine.put<OvertimeRequest>(STORE_NAME, record);
    return record;
  }

  public async update(record: OvertimeRequest): Promise<OvertimeRequest> {
    await dbEngine.put<OvertimeRequest>(STORE_NAME, record);
    return record;
  }

  public async delete(id: string): Promise<void> {
    await dbEngine.delete(STORE_NAME, id);
  }
}

export const overtimeRepository = OvertimeRepository.getInstance();

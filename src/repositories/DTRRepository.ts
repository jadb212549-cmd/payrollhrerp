/**
 * DTR Repository - Data Access Layer for Timekeeping & Attendance Records
 */

import { dbEngine } from '../db/database';
import { DTRRecord, DTRStatus } from '../db/schema';

const STORE_NAME = 'dtr_records';

export interface DTRQueryOptions {
  companyId?: string | null;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: DTRStatus | 'All';
}

export class DTRRepository {
  private static instance: DTRRepository | null = null;

  private constructor() {}

  public static getInstance(): DTRRepository {
    if (!DTRRepository.instance) {
      DTRRepository.instance = new DTRRepository();
    }
    return DTRRepository.instance;
  }

  public async findById(id: string): Promise<DTRRecord | null> {
    return dbEngine.get<DTRRecord>(STORE_NAME, id);
  }

  public async findByEmployeeAndDate(companyId: string, employeeId: string, date: string): Promise<DTRRecord | null> {
    const list = await this.findByCompanyAndEmployee(companyId, employeeId);
    return list.find((r) => r.date === date) || null;
  }

  public async findByCompany(companyId: string): Promise<DTRRecord[]> {
    const records = await dbEngine.getAllByIndex<DTRRecord>(STORE_NAME, 'companyId', companyId);
    return records.sort((a, b) => b.date.localeCompare(a.date));
  }

  public async findByCompanyAndEmployee(companyId: string, employeeId: string): Promise<DTRRecord[]> {
    const records = await dbEngine.getAllByIndex<DTRRecord>(STORE_NAME, 'employeeId', employeeId);
    return records.filter((r) => r.companyId === companyId).sort((a, b) => a.date.localeCompare(b.date));
  }

  public async findAll(): Promise<DTRRecord[]> {
    const records = await dbEngine.getAll<DTRRecord>(STORE_NAME);
    return records.sort((a, b) => b.date.localeCompare(a.date));
  }

  public async findByQuery(options: DTRQueryOptions): Promise<DTRRecord[]> {
    let records: DTRRecord[];

    if (options.companyId) {
      records = await dbEngine.getAllByIndex<DTRRecord>(STORE_NAME, 'companyId', options.companyId);
    } else {
      records = await dbEngine.getAll<DTRRecord>(STORE_NAME);
    }

    if (options.employeeId) {
      records = records.filter((r) => r.employeeId === options.employeeId);
    }

    if (options.startDate) {
      records = records.filter((r) => r.date >= options.startDate!);
    }

    if (options.endDate) {
      records = records.filter((r) => r.date <= options.endDate!);
    }

    if (options.status && options.status !== 'All') {
      records = records.filter((r) => r.status === options.status);
    }

    return records.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return a.employeeId.localeCompare(b.employeeId);
    });
  }

  public async create(record: DTRRecord): Promise<DTRRecord> {
    await dbEngine.put<DTRRecord>(STORE_NAME, record);
    return record;
  }

  public async update(record: DTRRecord): Promise<DTRRecord> {
    await dbEngine.put<DTRRecord>(STORE_NAME, record);
    return record;
  }

  public async delete(id: string): Promise<void> {
    await dbEngine.delete(STORE_NAME, id);
  }

  public async bulkPut(records: DTRRecord[]): Promise<void> {
    for (const rec of records) {
      await dbEngine.put<DTRRecord>(STORE_NAME, rec);
    }
  }
}

export const dtrRepository = DTRRepository.getInstance();

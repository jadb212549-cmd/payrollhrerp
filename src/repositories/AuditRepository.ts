/**
 * Audit Repository - Data Access Layer
 * Manages immutable audit logs for transactions and record changes
 */

import { dbEngine } from '../db/database';
import { AuditLog } from '../db/schema';

export class AuditRepository {
  private static instance: AuditRepository | null = null;
  private readonly storeName = 'audit_logs';

  private constructor() {}

  public static getInstance(): AuditRepository {
    if (!AuditRepository.instance) {
      AuditRepository.instance = new AuditRepository();
    }
    return AuditRepository.instance;
  }

  public async log(entry: AuditLog): Promise<void> {
    await dbEngine.put<AuditLog>(this.storeName, entry);
  }

  public async findAll(): Promise<AuditLog[]> {
    const logs = await dbEngine.getAll<AuditLog>(this.storeName);
    // Sort descending by timestamp
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async findByCompany(companyId: string): Promise<AuditLog[]> {
    const logs = await dbEngine.getAllByIndex<AuditLog>(this.storeName, 'companyId', companyId);
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const all = await this.findAll();
    return all.filter((l) => l.entityType === entityType && l.entityId === entityId);
  }
}

export const auditRepository = AuditRepository.getInstance();

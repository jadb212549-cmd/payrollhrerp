/**
 * Audit Service - Business Layer for Audit Trails
 */

import { auditRepository } from '../repositories/AuditRepository';
import { AuditLog, AuditAction } from '../db/schema';

export interface LogActionParams {
  userId: string;
  companyId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  description: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  private static instance: AuditService | null = null;

  private constructor() {}

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  public async logAction(params: LogActionParams): Promise<void> {
    const timestamp = new Date().toISOString();
    const log: AuditLog = {
      id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      timestamp,
      userId: params.userId,
      companyId: params.companyId || undefined,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
      previousValue: params.previousValue,
      newValue: params.newValue,
      metadata: params.metadata,
    };
    await auditRepository.log(log);
  }

  public async getLogs(): Promise<AuditLog[]> {
    return auditRepository.findAll();
  }

  public async getRecentLogs(limit = 100): Promise<AuditLog[]> {
    const all = await auditRepository.findAll();
    return all.slice(0, limit);
  }

  public async getLogsForCompany(companyId: string): Promise<AuditLog[]> {
    return auditRepository.findByCompany(companyId);
  }

  public async getLogsForEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return auditRepository.findByEntity(entityType, entityId);
  }
}

export const auditService = AuditService.getInstance();

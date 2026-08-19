import { Position, Department } from '../db/schema';
import { positionRepository } from '../repositories/PositionRepository';
import { auditService } from './AuditService';

export interface CreatePositionInput {
  companyId: string;
  code: string;
  name: string;
  description?: string;
  departmentId?: string;
}

export interface UpdatePositionInput {
  name?: string;
  description?: string;
  departmentId?: string;
  status?: 'Active' | 'Inactive' | 'Archived';
}

export class PositionService {
  private generateId(): string {
    return 'pos_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  }

  public async listPositions(companyId?: string | null, departmentId?: string | null): Promise<Position[]> {
    if (!companyId) {
      const all = await positionRepository.findAll();
      return all.sort((a, b) => a.code.localeCompare(b.code));
    }
    if (departmentId) {
      const list = await positionRepository.findByDepartmentId(departmentId);
      return list.filter((p) => p.companyId === companyId).sort((a, b) => a.code.localeCompare(b.code));
    }
    const list = await positionRepository.findByCompanyId(companyId);
    return list.sort((a, b) => a.code.localeCompare(b.code));
  }

  public async getPosition(id: string): Promise<Position | null> {
    return positionRepository.findById(id);
  }

  public async createPosition(input: CreatePositionInput, userId = 'user_admin'): Promise<Position> {
    const code = input.code.trim().toUpperCase();
    if (!code) {
      throw new Error('Position Code is required.');
    }
    if (!input.name.trim()) {
      throw new Error('Position Name is required.');
    }
    if (!input.companyId) {
      throw new Error('Company ID is required to create a position.');
    }

    // Check unique code within company
    const existing = await positionRepository.findByCompanyAndCode(input.companyId, code);
    if (existing) {
      throw new Error(`Position Code "${code}" already exists for this company.`);
    }

    const timestamp = new Date().toISOString();
    const position: Position = {
      id: this.generateId(),
      companyId: input.companyId,
      code,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      departmentId: input.departmentId || '',
      status: 'Active',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await positionRepository.save(position);

    await auditService.logAction({
      userId,
      companyId: input.companyId,
      action: 'CREATE',
      entityType: 'Position',
      entityId: position.id,
      description: `Created position "${position.name}" (${position.code})`,
      newValue: { ...position },
    });

    return position;
  }

  public async updatePosition(
    id: string,
    input: UpdatePositionInput,
    userId = 'user_admin'
  ): Promise<Position> {
    const existing = await positionRepository.findById(id);
    if (!existing) {
      throw new Error('Position not found.');
    }

    const previousValue = { ...existing };
    const updated: Position = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      description: input.description !== undefined ? input.description.trim() : existing.description,
      departmentId: input.departmentId !== undefined ? input.departmentId : existing.departmentId,
      status: input.status || existing.status,
      updatedAt: new Date().toISOString(),
    };

    await positionRepository.save(updated);

    await auditService.logAction({
      userId,
      companyId: existing.companyId,
      action: 'UPDATE',
      entityType: 'Position',
      entityId: updated.id,
      description: `Updated position "${updated.name}" (${updated.code})`,
      previousValue,
      newValue: { ...updated },
    });

    return updated;
  }

  public async archivePosition(id: string, userId = 'user_admin'): Promise<void> {
    const existing = await positionRepository.findById(id);
    if (!existing) {
      throw new Error('Position not found.');
    }

    const previousValue = { ...existing };
    const updated: Position = {
      ...existing,
      status: 'Archived',
      updatedAt: new Date().toISOString(),
    };

    await positionRepository.save(updated);

    await auditService.logAction({
      userId,
      companyId: existing.companyId,
      action: 'ARCHIVE',
      entityType: 'Position',
      entityId: id,
      description: `Archived position "${existing.name}" (${existing.code})`,
      previousValue,
      newValue: { ...updated },
    });
  }

  public async restorePosition(id: string, userId = 'user_admin'): Promise<void> {
    const existing = await positionRepository.findById(id);
    if (!existing) {
      throw new Error('Position not found.');
    }

    const previousValue = { ...existing };
    const updated: Position = {
      ...existing,
      status: 'Active',
      updatedAt: new Date().toISOString(),
    };

    await positionRepository.save(updated);

    await auditService.logAction({
      userId,
      companyId: existing.companyId,
      action: 'RESTORE',
      entityType: 'Position',
      entityId: id,
      description: `Restored position "${existing.name}" (${existing.code}) to Active status`,
      previousValue,
      newValue: { ...updated },
    });
  }

  /**
   * Seed standard positions linked to departments
   */
  public async seedDefaultPositions(companyId: string, departments: Department[]): Promise<Position[]> {
    const hrDept = departments.find((d) => d.code === 'HR')?.id;
    const prodDept = departments.find((d) => d.code === 'PROD')?.id;
    const finDept = departments.find((d) => d.code === 'FIN')?.id;
    const itDept = departments.find((d) => d.code === 'IT')?.id;
    const cqmDept = departments.find((d) => d.code === 'CQM')?.id;

    const defaultPositions = [
      { code: 'HR-MGR', name: 'HR Manager', departmentId: hrDept, description: 'Department head for human resources' },
      { code: 'PAY-SPEC', name: 'Payroll Specialist', departmentId: hrDept, description: 'Payroll computation and timekeeping audit' },
      { code: 'PROD-SUP', name: 'Production Supervisor', departmentId: prodDept, description: 'Plant line supervisor' },
      { code: 'PROD-OP', name: 'Production Operator', departmentId: prodDept, description: 'Machine operator and line personnel' },
      { code: 'QC-INSP', name: 'Quality Control Inspector', departmentId: cqmDept, description: 'Quality assurance and compliance inspector' },
      { code: 'FIN-ACC', name: 'Senior Accountant', departmentId: finDept, description: 'Financial books and treasury' },
      { code: 'IT-ADMIN', name: 'Systems Administrator', departmentId: itDept, description: 'Desktop ERP and IT support' },
    ];

    const results: Position[] = [];
    for (const p of defaultPositions) {
      const existing = await positionRepository.findByCompanyAndCode(companyId, p.code);
      if (!existing) {
        const created = await this.createPosition({ companyId, ...p }, 'system_seeder');
        results.push(created);
      } else {
        results.push(existing);
      }
    }
    return results;
  }
}

export const positionService = new PositionService();

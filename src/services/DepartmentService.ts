import { Department } from '../db/schema';
import { departmentRepository } from '../repositories/DepartmentRepository';
import { auditService } from './AuditService';

export interface CreateDepartmentInput {
  companyId: string;
  code: string;
  name: string;
  description?: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  description?: string;
  status?: 'Active' | 'Inactive' | 'Archived';
}

export class DepartmentService {
  private generateId(): string {
    return 'dept_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  }

  public async listDepartments(companyId?: string | null): Promise<Department[]> {
    if (!companyId) {
      const all = await departmentRepository.findAll();
      return all.sort((a, b) => a.code.localeCompare(b.code));
    }
    const list = await departmentRepository.findByCompanyId(companyId);
    return list.sort((a, b) => a.code.localeCompare(b.code));
  }

  public async getDepartment(id: string): Promise<Department | null> {
    return departmentRepository.findById(id);
  }

  public async createDepartment(input: CreateDepartmentInput, userId = 'user_admin'): Promise<Department> {
    const code = input.code.trim().toUpperCase();
    if (!code) {
      throw new Error('Department Code is required.');
    }
    if (!input.name.trim()) {
      throw new Error('Department Name is required.');
    }
    if (!input.companyId) {
      throw new Error('Company ID is required to create a department.');
    }

    // Check unique code within company
    const existing = await departmentRepository.findByCompanyAndCode(input.companyId, code);
    if (existing) {
      throw new Error(`Department Code "${code}" already exists for this company.`);
    }

    const timestamp = new Date().toISOString();
    const department: Department = {
      id: this.generateId(),
      companyId: input.companyId,
      code,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      status: 'Active',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await departmentRepository.save(department);

    await auditService.logAction({
      userId,
      companyId: input.companyId,
      action: 'CREATE',
      entityType: 'Department',
      entityId: department.id,
      description: `Created department "${department.name}" (${department.code})`,
      newValue: { ...department },
    });

    return department;
  }

  public async updateDepartment(
    id: string,
    input: UpdateDepartmentInput,
    userId = 'user_admin'
  ): Promise<Department> {
    const existing = await departmentRepository.findById(id);
    if (!existing) {
      throw new Error('Department not found.');
    }

    const previousValue = { ...existing };
    const updated: Department = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      description: input.description !== undefined ? input.description.trim() : existing.description,
      status: input.status || existing.status,
      updatedAt: new Date().toISOString(),
    };

    await departmentRepository.save(updated);

    await auditService.logAction({
      userId,
      companyId: existing.companyId,
      action: 'UPDATE',
      entityType: 'Department',
      entityId: updated.id,
      description: `Updated department "${updated.name}" (${updated.code})`,
      previousValue,
      newValue: { ...updated },
    });

    return updated;
  }

  public async archiveDepartment(id: string, userId = 'user_admin'): Promise<void> {
    const existing = await departmentRepository.findById(id);
    if (!existing) {
      throw new Error('Department not found.');
    }

    const previousValue = { ...existing };
    const updated: Department = {
      ...existing,
      status: 'Archived',
      updatedAt: new Date().toISOString(),
    };

    await departmentRepository.save(updated);

    await auditService.logAction({
      userId,
      companyId: existing.companyId,
      action: 'ARCHIVE',
      entityType: 'Department',
      entityId: id,
      description: `Archived department "${existing.name}" (${existing.code})`,
      previousValue,
      newValue: { ...updated },
    });
  }

  public async restoreDepartment(id: string, userId = 'user_admin'): Promise<void> {
    const existing = await departmentRepository.findById(id);
    if (!existing) {
      throw new Error('Department not found.');
    }

    const previousValue = { ...existing };
    const updated: Department = {
      ...existing,
      status: 'Active',
      updatedAt: new Date().toISOString(),
    };

    await departmentRepository.save(updated);

    await auditService.logAction({
      userId,
      companyId: existing.companyId,
      action: 'RESTORE',
      entityType: 'Department',
      entityId: id,
      description: `Restored department "${existing.name}" (${existing.code}) to Active status`,
      previousValue,
      newValue: { ...updated },
    });
  }

  /**
   * Seed standard departments for a company
   */
  public async seedDefaultDepartments(companyId: string): Promise<Department[]> {
    const defaultDepts = [
      { code: 'HR', name: 'Human Resources & Admin', description: 'Talent, 201 records, and employee relations' },
      { code: 'PROD', name: 'Production & Manufacturing', description: 'Plant operations, assembly, and quality lines' },
      { code: 'CQM', name: 'Quality Management (CQM)', description: 'Standards verification and product testing' },
      { code: 'FIN', name: 'Finance & Accounting', description: 'Payroll audit, treasury, and tax reporting' },
      { code: 'LOG', name: 'Supply Chain & Logistics', description: 'Warehouse, fleet, and distribution management' },
      { code: 'IT', name: 'Information Technology', description: 'Systems, network infrastructure, and ERP support' },
    ];

    const results: Department[] = [];
    for (const d of defaultDepts) {
      const existing = await departmentRepository.findByCompanyAndCode(companyId, d.code);
      if (!existing) {
        const created = await this.createDepartment({ companyId, ...d }, 'system_seeder');
        results.push(created);
      } else {
        results.push(existing);
      }
    }
    return results;
  }
}

export const departmentService = new DepartmentService();

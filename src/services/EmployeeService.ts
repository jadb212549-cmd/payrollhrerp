import { 
  Employee, 
  EmploymentStatus, 
  EmploymentType, 
  PayType, 
  PayFrequency, 
  Gender, 
  CivilStatus,
  EmployeeRateHistory 
} from '../db/schema';
import { employeeRepository } from '../repositories/EmployeeRepository';
import { rateHistoryRepository } from '../repositories/RateHistoryRepository';
import { departmentRepository } from '../repositories/DepartmentRepository';
import { positionRepository } from '../repositories/PositionRepository';
import { auditService } from './AuditService';

export interface CreateEmployeeInput {
  companyId: string;
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  nickname?: string;
  birthDate?: string;
  gender?: Gender;
  civilStatus?: CivilStatus;
  address?: string;
  contactNumber?: string;
  email?: string;
  dateHired: string;
  employmentStatus: EmploymentStatus;
  employmentType: EmploymentType;
  departmentId?: string;
  positionId?: string;
  location?: string;
  supervisorId?: string;
  tin?: string;
  sssNumber?: string;
  philHealthNumber?: string;
  pagIbigNumber?: string;
  bankName?: string;
  bankAccount?: string;
  dailyRate?: number;
  monthlyRate?: number;
  hourlyRate?: number;
  payType?: PayType;
  payFrequency?: PayFrequency;
}

export interface UpdateEmployeeInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  nickname?: string;
  birthDate?: string;
  gender?: Gender;
  civilStatus?: CivilStatus;
  address?: string;
  contactNumber?: string;
  email?: string;
  dateHired?: string;
  employmentStatus?: EmploymentStatus;
  employmentType?: EmploymentType;
  departmentId?: string;
  positionId?: string;
  location?: string;
  supervisorId?: string;
  tin?: string;
  sssNumber?: string;
  philHealthNumber?: string;
  pagIbigNumber?: string;
  bankName?: string;
  bankAccount?: string;
  payFrequency?: PayFrequency;
  status?: 'Active' | 'Inactive' | 'Archived';
}

export interface AdjustRateInput {
  employeeId: string;
  effectiveDate: string;
  dailyRate?: number;
  monthlyRate?: number;
  hourlyRate?: number;
  payType?: PayType;
  reason: string;
  approvedBy?: string;
}

export interface EmployeeQueryCriteria {
  companyId?: string | null;
  searchTerm?: string;
  employmentStatus?: EmploymentStatus | 'All';
  employmentType?: EmploymentType | 'All';
  departmentId?: string | 'All';
  positionId?: string | 'All';
  status?: 'Active' | 'Inactive' | 'Archived' | 'All';
}

export class EmployeeService {
  private generateId(): string {
    return 'emp_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  }

  private generateRateHistoryId(): string {
    return 'rh_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  }

  public async getEmployee(id: string): Promise<Employee | null> {
    return employeeRepository.findById(id);
  }

  public async getEmployeeRateHistory(employeeId: string): Promise<EmployeeRateHistory[]> {
    return rateHistoryRepository.findByEmployeeId(employeeId);
  }

  public async listEmployees(criteria: EmployeeQueryCriteria): Promise<{ employees: Employee[]; total: number }> {
    let list: Employee[];

    if (criteria.companyId) {
      list = await employeeRepository.findByCompanyId(criteria.companyId);
    } else {
      list = await employeeRepository.findAll();
    }

    // Filter by general status
    if (criteria.status && criteria.status !== 'All') {
      list = list.filter((e) => e.status === criteria.status);
    } else {
      // By default hide archived unless explicitly asked
      list = list.filter((e) => e.status !== 'Archived');
    }

    // Filter by employmentStatus
    if (criteria.employmentStatus && criteria.employmentStatus !== 'All') {
      list = list.filter((e) => e.employmentStatus === criteria.employmentStatus);
    }

    // Filter by employmentType
    if (criteria.employmentType && criteria.employmentType !== 'All') {
      list = list.filter((e) => e.employmentType === criteria.employmentType);
    }

    // Filter by departmentId
    if (criteria.departmentId && criteria.departmentId !== 'All') {
      list = list.filter((e) => e.departmentId === criteria.departmentId);
    }

    // Filter by positionId
    if (criteria.positionId && criteria.positionId !== 'All') {
      list = list.filter((e) => e.positionId === criteria.positionId);
    }

    // Search term filtering
    if (criteria.searchTerm && criteria.searchTerm.trim()) {
      const term = criteria.searchTerm.toLowerCase().trim();
      list = list.filter((e) => {
        const empNo = e.employeeNumber.toLowerCase();
        const first = e.firstName.toLowerCase();
        const last = e.lastName.toLowerCase();
        const full = `${first} ${last}`.toLowerCase();
        const middle = (e.middleName || '').toLowerCase();
        const email = (e.email || '').toLowerCase();
        return (
          empNo.includes(term) ||
          first.includes(term) ||
          last.includes(term) ||
          full.includes(term) ||
          middle.includes(term) ||
          email.includes(term)
        );
      });
    }

    // Sort by employeeNumber
    list.sort((a, b) => a.employeeNumber.localeCompare(b.employeeNumber, undefined, { numeric: true }));

    return { employees: list, total: list.length };
  }

  public async createEmployee(input: CreateEmployeeInput, userId = 'user_admin'): Promise<Employee> {
    // 1. Validations
    const companyId = input.companyId;
    if (!companyId) {
      throw new Error('Company ID is required.');
    }

    const empNo = input.employeeNumber.trim().toUpperCase();
    if (!empNo) {
      throw new Error('Employee Number is required.');
    }

    if (!input.firstName.trim()) {
      throw new Error('First Name is required.');
    }
    if (!input.lastName.trim()) {
      throw new Error('Last Name is required.');
    }
    if (!input.dateHired) {
      throw new Error('Date Hired is required.');
    }
    if (!input.employmentStatus) {
      throw new Error('Employment Status is required.');
    }
    if (!input.employmentType) {
      throw new Error('Employment Type is required.');
    }

    // Email format validation
    if (input.email && input.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.email.trim())) {
        throw new Error(`Invalid email address format: "${input.email}".`);
      }
    }

    // Rate validation (must be non-negative)
    if (input.dailyRate !== undefined && (isNaN(input.dailyRate) || input.dailyRate < 0)) {
      throw new Error('Daily Rate must be a non-negative number.');
    }
    if (input.monthlyRate !== undefined && (isNaN(input.monthlyRate) || input.monthlyRate < 0)) {
      throw new Error('Monthly Rate must be a non-negative number.');
    }
    if (input.hourlyRate !== undefined && (isNaN(input.hourlyRate) || input.hourlyRate < 0)) {
      throw new Error('Hourly Rate must be a non-negative number.');
    }

    // Check unique employee number within company
    const existing = await employeeRepository.findByCompanyAndEmpNo(companyId, empNo);
    if (existing) {
      throw new Error(`Employee Number "${empNo}" is already assigned to another employee in this company.`);
    }

    // Check supervisor belongs to same company
    if (input.supervisorId) {
      const supervisor = await employeeRepository.findById(input.supervisorId);
      if (!supervisor) {
        throw new Error('Assigned supervisor record was not found.');
      }
      if (supervisor.companyId !== companyId) {
        throw new Error('Assigned supervisor must belong to the same company entity.');
      }
    }

    const timestamp = new Date().toISOString();
    const employeeId = this.generateId();

    const employee: Employee = {
      id: employeeId,
      companyId,
      employeeNumber: empNo,
      firstName: input.firstName.trim(),
      middleName: input.middleName?.trim() || '',
      lastName: input.lastName.trim(),
      suffix: input.suffix?.trim() || '',
      nickname: input.nickname?.trim() || '',
      birthDate: input.birthDate || '',
      gender: input.gender,
      civilStatus: input.civilStatus,
      address: input.address?.trim() || '',
      contactNumber: input.contactNumber?.trim() || '',
      email: input.email?.trim() || '',
      dateHired: input.dateHired,
      employmentStatus: input.employmentStatus,
      employmentType: input.employmentType,
      departmentId: input.departmentId || '',
      positionId: input.positionId || '',
      location: input.location?.trim() || '',
      supervisorId: input.supervisorId || '',
      tin: input.tin?.trim() || '',
      sssNumber: input.sssNumber?.trim() || '',
      philHealthNumber: input.philHealthNumber?.trim() || '',
      pagIbigNumber: input.pagIbigNumber?.trim() || '',
      bankName: input.bankName?.trim() || '',
      bankAccount: input.bankAccount?.trim() || '',
      dailyRate: input.dailyRate || 0,
      monthlyRate: input.monthlyRate || 0,
      hourlyRate: input.hourlyRate || 0,
      payType: input.payType || 'Monthly',
      payFrequency: input.payFrequency || 'Semi-Monthly',
      status: 'Active',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await employeeRepository.save(employee);

    // Record initial rate in Rate History if compensation provided
    if ((employee.dailyRate || employee.monthlyRate || employee.hourlyRate) && employee.dailyRate > 0 || employee.monthlyRate > 0) {
      const rateHistory: EmployeeRateHistory = {
        id: this.generateRateHistoryId(),
        employeeId: employee.id,
        companyId,
        effectiveDate: employee.dateHired,
        dailyRate: employee.dailyRate,
        monthlyRate: employee.monthlyRate,
        hourlyRate: employee.hourlyRate,
        payType: employee.payType,
        reason: 'Initial onboarding salary rate',
        approvedBy: userId,
        createdAt: timestamp,
      };
      await rateHistoryRepository.save(rateHistory);
    }

    // Safe audit logging (No raw sensitive numbers in description)
    await auditService.logAction({
      userId,
      companyId,
      action: 'CREATE',
      entityType: 'Employee',
      entityId: employee.id,
      description: `Created employee record ${employee.firstName} ${employee.lastName} (${employee.employeeNumber})`,
      newValue: {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        departmentId: employee.departmentId,
        positionId: employee.positionId,
        employmentStatus: employee.employmentStatus,
        employmentType: employee.employmentType,
        dateHired: employee.dateHired,
      },
    });

    return employee;
  }

  public async updateEmployee(
    id: string,
    input: UpdateEmployeeInput,
    userId = 'user_admin'
  ): Promise<Employee> {
    const existing = await employeeRepository.findById(id);
    if (!existing) {
      throw new Error('Employee record not found.');
    }

    // Email format validation
    if (input.email && input.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.email.trim())) {
        throw new Error(`Invalid email address format: "${input.email}".`);
      }
    }

    // Check supervisor belongs to same company
    if (input.supervisorId) {
      if (input.supervisorId === id) {
        throw new Error('An employee cannot be assigned as their own supervisor.');
      }
      const supervisor = await employeeRepository.findById(input.supervisorId);
      if (!supervisor) {
        throw new Error('Assigned supervisor record was not found.');
      }
      if (supervisor.companyId !== existing.companyId) {
        throw new Error('Assigned supervisor must belong to the same company entity.');
      }
    }

    const previousValue = { ...existing };
    const updated: Employee = {
      ...existing,
      firstName: input.firstName !== undefined ? input.firstName.trim() : existing.firstName,
      middleName: input.middleName !== undefined ? input.middleName.trim() : existing.middleName,
      lastName: input.lastName !== undefined ? input.lastName.trim() : existing.lastName,
      suffix: input.suffix !== undefined ? input.suffix.trim() : existing.suffix,
      nickname: input.nickname !== undefined ? input.nickname.trim() : existing.nickname,
      birthDate: input.birthDate !== undefined ? input.birthDate : existing.birthDate,
      gender: input.gender !== undefined ? input.gender : existing.gender,
      civilStatus: input.civilStatus !== undefined ? input.civilStatus : existing.civilStatus,
      address: input.address !== undefined ? input.address.trim() : existing.address,
      contactNumber: input.contactNumber !== undefined ? input.contactNumber.trim() : existing.contactNumber,
      email: input.email !== undefined ? input.email.trim() : existing.email,
      dateHired: input.dateHired !== undefined ? input.dateHired : existing.dateHired,
      employmentStatus: input.employmentStatus !== undefined ? input.employmentStatus : existing.employmentStatus,
      employmentType: input.employmentType !== undefined ? input.employmentType : existing.employmentType,
      departmentId: input.departmentId !== undefined ? input.departmentId : existing.departmentId,
      positionId: input.positionId !== undefined ? input.positionId : existing.positionId,
      location: input.location !== undefined ? input.location.trim() : existing.location,
      supervisorId: input.supervisorId !== undefined ? input.supervisorId : existing.supervisorId,
      tin: input.tin !== undefined ? input.tin.trim() : existing.tin,
      sssNumber: input.sssNumber !== undefined ? input.sssNumber.trim() : existing.sssNumber,
      philHealthNumber: input.philHealthNumber !== undefined ? input.philHealthNumber.trim() : existing.philHealthNumber,
      pagIbigNumber: input.pagIbigNumber !== undefined ? input.pagIbigNumber.trim() : existing.pagIbigNumber,
      bankName: input.bankName !== undefined ? input.bankName.trim() : existing.bankName,
      bankAccount: input.bankAccount !== undefined ? input.bankAccount.trim() : existing.bankAccount,
      payFrequency: input.payFrequency !== undefined ? input.payFrequency : existing.payFrequency,
      status: input.status !== undefined ? input.status : existing.status,
      updatedAt: new Date().toISOString(),
    };

    await employeeRepository.save(updated);

    await auditService.logAction({
      userId,
      companyId: existing.companyId,
      action: 'UPDATE',
      entityType: 'Employee',
      entityId: updated.id,
      description: `Updated employee profile for ${updated.firstName} ${updated.lastName} (${updated.employeeNumber})`,
      previousValue: {
        firstName: previousValue.firstName,
        lastName: previousValue.lastName,
        employmentStatus: previousValue.employmentStatus,
        departmentId: previousValue.departmentId,
        positionId: previousValue.positionId,
      },
      newValue: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        employmentStatus: updated.employmentStatus,
        departmentId: updated.departmentId,
        positionId: updated.positionId,
      },
    });

    return updated;
  }

  public async adjustEmployeeRate(
    input: AdjustRateInput,
    userId = 'user_admin'
  ): Promise<Employee> {
    const employee = await employeeRepository.findById(input.employeeId);
    if (!employee) {
      throw new Error('Employee record not found.');
    }

    if (!input.effectiveDate) {
      throw new Error('Effective Date is required for rate adjustments.');
    }
    if (!input.reason.trim()) {
      throw new Error('Reason for rate adjustment is required.');
    }

    if (input.dailyRate !== undefined && (isNaN(input.dailyRate) || input.dailyRate < 0)) {
      throw new Error('Daily Rate must be a non-negative number.');
    }
    if (input.monthlyRate !== undefined && (isNaN(input.monthlyRate) || input.monthlyRate < 0)) {
      throw new Error('Monthly Rate must be a non-negative number.');
    }
    if (input.hourlyRate !== undefined && (isNaN(input.hourlyRate) || input.hourlyRate < 0)) {
      throw new Error('Hourly Rate must be a non-negative number.');
    }

    const timestamp = new Date().toISOString();
    const rateHistory: EmployeeRateHistory = {
      id: this.generateRateHistoryId(),
      employeeId: employee.id,
      companyId: employee.companyId,
      effectiveDate: input.effectiveDate,
      dailyRate: input.dailyRate !== undefined ? input.dailyRate : employee.dailyRate,
      monthlyRate: input.monthlyRate !== undefined ? input.monthlyRate : employee.monthlyRate,
      hourlyRate: input.hourlyRate !== undefined ? input.hourlyRate : employee.hourlyRate,
      payType: input.payType || employee.payType,
      reason: input.reason.trim(),
      approvedBy: input.approvedBy || userId,
      createdAt: timestamp,
    };

    await rateHistoryRepository.save(rateHistory);

    const updatedEmployee: Employee = {
      ...employee,
      dailyRate: rateHistory.dailyRate,
      monthlyRate: rateHistory.monthlyRate,
      hourlyRate: rateHistory.hourlyRate,
      payType: rateHistory.payType,
      updatedAt: timestamp,
    };

    await employeeRepository.save(updatedEmployee);

    await auditService.logAction({
      userId,
      companyId: employee.companyId,
      action: 'RATE_CHANGE',
      entityType: 'EmployeeRateHistory',
      entityId: rateHistory.id,
      description: `Adjusted salary rate for ${employee.firstName} ${employee.lastName} (${employee.employeeNumber}) - Effective ${input.effectiveDate} (${input.reason})`,
      metadata: {
        employeeId: employee.id,
        effectiveDate: input.effectiveDate,
        reason: input.reason,
      },
    });

    return updatedEmployee;
  }

  public async changeEmploymentStatus(
    id: string,
    newStatus: EmploymentStatus,
    reason = '',
    userId = 'user_admin'
  ): Promise<Employee> {
    const existing = await employeeRepository.findById(id);
    if (!existing) {
      throw new Error('Employee record not found.');
    }

    const prevStatus = existing.employmentStatus;
    const updated: Employee = {
      ...existing,
      employmentStatus: newStatus,
      updatedAt: new Date().toISOString(),
    };

    await employeeRepository.save(updated);

    await auditService.logAction({
      userId,
      companyId: existing.companyId,
      action: 'UPDATE',
      entityType: 'Employee',
      entityId: id,
      description: `Changed employment status for ${existing.firstName} ${existing.lastName} from "${prevStatus}" to "${newStatus}"${reason ? ` (${reason})` : ''}`,
      previousValue: { employmentStatus: prevStatus },
      newValue: { employmentStatus: newStatus },
    });

    return updated;
  }

  public async archiveEmployee(id: string, reason = '', userId = 'user_admin'): Promise<void> {
    const existing = await employeeRepository.findById(id);
    if (!existing) {
      throw new Error('Employee not found.');
    }

    const timestamp = new Date().toISOString();
    const updated: Employee = {
      ...existing,
      status: 'Archived',
      archivedAt: timestamp,
      updatedAt: timestamp,
    };

    await employeeRepository.save(updated);

    await auditService.logAction({
      userId,
      companyId: existing.companyId,
      action: 'ARCHIVE',
      entityType: 'Employee',
      entityId: id,
      description: `Archived employee record ${existing.firstName} ${existing.lastName} (${existing.employeeNumber})${reason ? ` - ${reason}` : ''}`,
    });
  }

  public async restoreEmployee(id: string, userId = 'user_admin'): Promise<void> {
    const existing = await employeeRepository.findById(id);
    if (!existing) {
      throw new Error('Employee not found.');
    }

    const timestamp = new Date().toISOString();
    const updated: Employee = {
      ...existing,
      status: 'Active',
      archivedAt: null,
      updatedAt: timestamp,
    };

    await employeeRepository.save(updated);

    await auditService.logAction({
      userId,
      companyId: existing.companyId,
      action: 'RESTORE',
      entityType: 'Employee',
      entityId: id,
      description: `Restored employee ${existing.firstName} ${existing.lastName} (${existing.employeeNumber}) to Active status`,
    });
  }

  public async bulkUpdateStatus(
    ids: string[],
    newStatus: EmploymentStatus,
    userId = 'user_admin'
  ): Promise<{ count: number }> {
    let count = 0;
    const timestamp = new Date().toISOString();

    for (const id of ids) {
      const emp = await employeeRepository.findById(id);
      if (emp) {
        emp.employmentStatus = newStatus;
        emp.updatedAt = timestamp;
        await employeeRepository.save(emp);
        count++;
      }
    }

    await auditService.logAction({
      userId,
      action: 'BULK_UPDATE',
      entityType: 'Employee',
      entityId: 'bulk',
      description: `Bulk updated employment status to "${newStatus}" for ${count} employee records`,
    });

    return { count };
  }

  public async bulkArchive(ids: string[], userId = 'user_admin'): Promise<{ count: number }> {
    let count = 0;
    const timestamp = new Date().toISOString();

    for (const id of ids) {
      const emp = await employeeRepository.findById(id);
      if (emp) {
        emp.status = 'Archived';
        emp.archivedAt = timestamp;
        emp.updatedAt = timestamp;
        await employeeRepository.save(emp);
        count++;
      }
    }

    await auditService.logAction({
      userId,
      action: 'BULK_UPDATE',
      entityType: 'Employee',
      entityId: 'bulk',
      description: `Bulk archived ${count} employee records`,
    });

    return { count };
  }

  public async bulkAssignDepartment(
    ids: string[],
    departmentId: string,
    userId = 'user_admin'
  ): Promise<{ count: number }> {
    let count = 0;
    const timestamp = new Date().toISOString();
    const dept = await departmentRepository.findById(departmentId);

    for (const id of ids) {
      const emp = await employeeRepository.findById(id);
      if (emp) {
        emp.departmentId = departmentId;
        emp.updatedAt = timestamp;
        await employeeRepository.save(emp);
        count++;
      }
    }

    await auditService.logAction({
      userId,
      action: 'BULK_UPDATE',
      entityType: 'Employee',
      entityId: 'bulk',
      description: `Bulk assigned ${count} employees to department "${dept?.name || departmentId}"`,
    });

    return { count };
  }

  public async bulkAssignPosition(
    ids: string[],
    positionId: string,
    userId = 'user_admin'
  ): Promise<{ count: number }> {
    let count = 0;
    const timestamp = new Date().toISOString();
    const pos = await positionRepository.findById(positionId);

    for (const id of ids) {
      const emp = await employeeRepository.findById(id);
      if (emp) {
        emp.positionId = positionId;
        emp.updatedAt = timestamp;
        await employeeRepository.save(emp);
        count++;
      }
    }

    await auditService.logAction({
      userId,
      action: 'BULK_UPDATE',
      entityType: 'Employee',
      entityId: 'bulk',
      description: `Bulk assigned ${count} employees to position "${pos?.name || positionId}"`,
    });

    return { count };
  }

  /**
   * Seed rich sample employee dataset for demo/evaluation
   */
  public async seedSampleEmployees(companyId: string): Promise<Employee[]> {
    const depts = await departmentRepository.findByCompanyId(companyId);
    const positions = await positionRepository.findByCompanyId(companyId);

    const hrDept = depts.find((d) => d.code === 'HR')?.id || '';
    const prodDept = depts.find((d) => d.code === 'PROD')?.id || '';
    const finDept = depts.find((d) => d.code === 'FIN')?.id || '';
    const cqmDept = depts.find((d) => d.code === 'CQM')?.id || '';
    const itDept = depts.find((d) => d.code === 'IT')?.id || '';

    const hrMgrPos = positions.find((p) => p.code === 'HR-MGR')?.id || '';
    const paySpecPos = positions.find((p) => p.code === 'PAY-SPEC')?.id || '';
    const prodSupPos = positions.find((p) => p.code === 'PROD-SUP')?.id || '';
    const prodOpPos = positions.find((p) => p.code === 'PROD-OP')?.id || '';
    const qcInspPos = positions.find((p) => p.code === 'QC-INSP')?.id || '';
    const finAccPos = positions.find((p) => p.code === 'FIN-ACC')?.id || '';
    const itAdminPos = positions.find((p) => p.code === 'IT-ADMIN')?.id || '';

    const sampleData: CreateEmployeeInput[] = [
      {
        companyId,
        employeeNumber: 'EMP-0001',
        firstName: 'Eduardo',
        middleName: 'Santos',
        lastName: 'dela Cruz',
        birthDate: '1985-04-12',
        gender: 'Male',
        civilStatus: 'Married',
        address: '142 Rizal Ave, Sta. Rosa, Laguna',
        contactNumber: '+63 917 123 4567',
        email: 'e.delacruz@company.ph',
        dateHired: '2020-01-15',
        employmentStatus: 'Active',
        employmentType: 'Regular',
        departmentId: hrDept,
        positionId: hrMgrPos,
        location: 'Main Plant - Head Office',
        tin: '123-456-789-000',
        sssNumber: '03-1234567-8',
        philHealthNumber: '12-345678901-2',
        pagIbigNumber: '1234-5678-9012',
        bankName: 'BDO Unibank',
        bankAccount: '109823487192',
        dailyRate: 1800,
        monthlyRate: 45000,
        hourlyRate: 225,
        payType: 'Monthly',
        payFrequency: 'Semi-Monthly',
      },
      {
        companyId,
        employeeNumber: 'EMP-0002',
        firstName: 'Maria Cristina',
        middleName: 'Reyes',
        lastName: 'Bautista',
        birthDate: '1990-08-23',
        gender: 'Female',
        civilStatus: 'Single',
        address: 'Block 8 Lot 15, Technopark Village, Biñan, Laguna',
        contactNumber: '+63 920 987 6543',
        email: 'mc.bautista@company.ph',
        dateHired: '2021-03-01',
        employmentStatus: 'Active',
        employmentType: 'Regular',
        departmentId: hrDept,
        positionId: paySpecPos,
        location: 'Main Plant - HR Wing',
        tin: '234-567-890-000',
        sssNumber: '03-2345678-9',
        philHealthNumber: '23-456789012-3',
        pagIbigNumber: '2345-6789-0123',
        bankName: 'BPI',
        bankAccount: '2987123984',
        dailyRate: 1200,
        monthlyRate: 30000,
        hourlyRate: 150,
        payType: 'Monthly',
        payFrequency: 'Semi-Monthly',
      },
      {
        companyId,
        employeeNumber: 'EMP-0003',
        firstName: 'Rodelio',
        middleName: 'Gomez',
        lastName: 'Alcantara',
        birthDate: '1988-11-05',
        gender: 'Male',
        civilStatus: 'Married',
        address: '28 Mayapa Road, Calamba City, Laguna',
        contactNumber: '+63 918 555 1212',
        email: 'r.alcantara@company.ph',
        dateHired: '2019-06-15',
        employmentStatus: 'Active',
        employmentType: 'Regular',
        departmentId: prodDept,
        positionId: prodSupPos,
        location: 'Factory Floor Line A',
        tin: '345-678-901-000',
        sssNumber: '03-3456789-0',
        philHealthNumber: '34-567890123-4',
        pagIbigNumber: '3456-7890-1234',
        bankName: 'Metrobank',
        bankAccount: '5812903841',
        dailyRate: 1400,
        monthlyRate: 35000,
        hourlyRate: 175,
        payType: 'Monthly',
        payFrequency: 'Semi-Monthly',
      },
      {
        companyId,
        employeeNumber: 'EMP-0004',
        firstName: 'Arnel',
        middleName: 'Perez',
        lastName: 'Navarro',
        birthDate: '1995-02-18',
        gender: 'Male',
        civilStatus: 'Single',
        address: 'San Antonio, San Pedro, Laguna',
        contactNumber: '+63 927 444 3322',
        email: 'a.navarro@company.ph',
        dateHired: '2023-08-10',
        employmentStatus: 'Active',
        employmentType: 'Contractual',
        departmentId: prodDept,
        positionId: prodOpPos,
        location: 'Factory Floor Line B',
        tin: '456-789-012-000',
        sssNumber: '03-4567890-1',
        philHealthNumber: '45-678901234-5',
        pagIbigNumber: '4567-8901-2345',
        bankName: 'BDO Unibank',
        bankAccount: '109844390192',
        dailyRate: 750,
        monthlyRate: 19500,
        hourlyRate: 93.75,
        payType: 'Daily',
        payFrequency: 'Semi-Monthly',
      },
      {
        companyId,
        employeeNumber: 'EMP-0005',
        firstName: 'Jocelyn',
        middleName: 'Tan',
        lastName: 'Lim',
        birthDate: '1992-09-30',
        gender: 'Female',
        civilStatus: 'Married',
        address: 'Golden City, Sta. Rosa, Laguna',
        contactNumber: '+63 919 888 7766',
        email: 'j.lim@company.ph',
        dateHired: '2022-02-01',
        employmentStatus: 'Active',
        employmentType: 'Regular',
        departmentId: cqmDept,
        positionId: qcInspPos,
        location: 'QA Testing Laboratory',
        tin: '567-890-123-000',
        sssNumber: '03-5678901-2',
        philHealthNumber: '56-789012345-6',
        pagIbigNumber: '5678-9012-3456',
        bankName: 'Security Bank',
        bankAccount: '000049182390',
        dailyRate: 1100,
        monthlyRate: 27500,
        hourlyRate: 137.5,
        payType: 'Monthly',
        payFrequency: 'Semi-Monthly',
      },
      {
        companyId,
        employeeNumber: 'EMP-0006',
        firstName: 'Ferdinand',
        middleName: 'Valdez',
        lastName: 'Mendoza',
        birthDate: '1987-12-14',
        gender: 'Male',
        civilStatus: 'Married',
        address: 'Poblacion, Cabuyao, Laguna',
        contactNumber: '+63 915 222 9988',
        email: 'f.mendoza@company.ph',
        dateHired: '2018-11-20',
        employmentStatus: 'Active',
        employmentType: 'Regular',
        departmentId: finDept,
        positionId: finAccPos,
        location: 'Finance Suite 204',
        tin: '678-901-234-000',
        sssNumber: '03-6789012-3',
        philHealthNumber: '67-890123456-7',
        pagIbigNumber: '6789-0123-4567',
        bankName: 'BPI',
        bankAccount: '3819203941',
        dailyRate: 1600,
        monthlyRate: 40000,
        hourlyRate: 200,
        payType: 'Monthly',
        payFrequency: 'Semi-Monthly',
      },
      {
        companyId,
        employeeNumber: 'EMP-0007',
        firstName: 'Christian',
        middleName: 'Cruz',
        lastName: 'Soriano',
        birthDate: '1994-07-07',
        gender: 'Male',
        civilStatus: 'Single',
        address: 'Nuvali Boulevard, Sta. Rosa, Laguna',
        contactNumber: '+63 922 111 8877',
        email: 'c.soriano@company.ph',
        dateHired: '2022-09-15',
        employmentStatus: 'Active',
        employmentType: 'Regular',
        departmentId: itDept,
        positionId: itAdminPos,
        location: 'IT Server Room & Helpdesk',
        tin: '789-012-345-000',
        sssNumber: '03-7890123-4',
        philHealthNumber: '78-901234567-8',
        pagIbigNumber: '7890-1234-5678',
        bankName: 'UnionBank',
        bankAccount: '109283746501',
        dailyRate: 1500,
        monthlyRate: 37500,
        hourlyRate: 187.5,
        payType: 'Monthly',
        payFrequency: 'Semi-Monthly',
      },
    ];

    const results: Employee[] = [];
    for (const item of sampleData) {
      const existing = await employeeRepository.findByCompanyAndEmpNo(companyId, item.employeeNumber);
      if (!existing) {
        const created = await this.createEmployee(item, 'system_seeder');
        results.push(created);
      } else {
        results.push(existing);
      }
    }

    return results;
  }
}

export const employeeService = new EmployeeService();

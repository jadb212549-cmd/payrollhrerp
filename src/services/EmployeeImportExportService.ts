import { Employee, EmploymentStatus, EmploymentType, PayType, PayFrequency } from '../db/schema';
import { CreateEmployeeInput, employeeService } from './EmployeeService';
import { departmentService } from './DepartmentService';
import { positionService } from './PositionService';
import { auditService } from './AuditService';

export interface ImportErrorDetail {
  row: number;
  field: string;
  value: string;
  error: string;
  suggestedFix: string;
}

export interface ParsedImportRow {
  rowNumber: number;
  raw: Record<string, string>;
  normalized?: CreateEmployeeInput;
  errors: ImportErrorDetail[];
  isValid: boolean;
}

export interface ImportValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ParsedImportRow[];
}

export interface ExportOptions {
  companyId?: string | null;
  includeSalary?: boolean;
  includeStatutory?: boolean;
  employmentStatus?: string;
  format?: 'csv' | 'json';
}

export class EmployeeImportExportService {
  /**
   * Parse CSV text safely
   */
  public parseCSV(text: string): Record<string, string>[] {
    const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Simple regex for CSV split respecting quotes
      const values: string[] = [];
      let currentVal = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentVal.trim().replace(/^"|"$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim().replace(/^"|"$/g, ''));

      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      rows.push(rowObj);
    }

    return rows;
  }

  /**
   * Validate import rows against company data & business constraints
   */
  public async validateImportData(
    rows: Record<string, string>[],
    targetCompanyId: string
  ): Promise<ImportValidationSummary> {
    if (!targetCompanyId) {
      throw new Error('A target company must be selected for employee import.');
    }

    const depts = await departmentService.listDepartments(targetCompanyId);
    const positions = await positionService.listPositions(targetCompanyId);
    const existingEmployeesResult = await employeeService.listEmployees({ companyId: targetCompanyId, status: 'All' });
    const existingEmpNumbers = new Set(existingEmployeesResult.employees.map((e) => e.employeeNumber.toUpperCase()));

    const seenInCurrentFile = new Set<string>();
    const parsedRows: ParsedImportRow[] = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const raw = rows[idx];
      const rowNum = idx + 2; // +1 for 1-index, +1 for header row
      const errors: ImportErrorDetail[] = [];

      // 1. Employee Number
      const empNo = (raw['Employee Number'] || raw['employeeNumber'] || raw['Employee No'] || raw['EmpNo'] || '').trim().toUpperCase();
      if (!empNo) {
        errors.push({
          row: rowNum,
          field: 'Employee Number',
          value: '',
          error: 'Employee Number is required.',
          suggestedFix: `Provide a unique code (e.g. EMP-${String(rowNum).padStart(4, '0')}).`,
        });
      } else if (existingEmpNumbers.has(empNo)) {
        errors.push({
          row: rowNum,
          field: 'Employee Number',
          value: empNo,
          error: `Employee Number "${empNo}" already exists in the database.`,
          suggestedFix: 'Assign a new, unused employee number or update existing record via Edit.',
        });
      } else if (seenInCurrentFile.has(empNo)) {
        errors.push({
          row: rowNum,
          field: 'Employee Number',
          value: empNo,
          error: `Duplicate Employee Number "${empNo}" inside this import file.`,
          suggestedFix: 'Each employee in the import file must have a distinct number.',
        });
      } else {
        seenInCurrentFile.add(empNo);
      }

      // 2. Names
      const firstName = (raw['First Name'] || raw['firstName'] || '').trim();
      const lastName = (raw['Last Name'] || raw['lastName'] || '').trim();
      const middleName = (raw['Middle Name'] || raw['middleName'] || '').trim();

      if (!firstName) {
        errors.push({
          row: rowNum,
          field: 'First Name',
          value: '',
          error: 'First Name is required.',
          suggestedFix: 'Provide employee given name.',
        });
      }

      if (!lastName) {
        errors.push({
          row: rowNum,
          field: 'Last Name',
          value: '',
          error: 'Last Name is required.',
          suggestedFix: 'Provide employee family name.',
        });
      }

      // 3. Date Hired
      const dateHired = (raw['Date Hired'] || raw['dateHired'] || raw['Hire Date'] || '').trim();
      if (!dateHired) {
        errors.push({
          row: rowNum,
          field: 'Date Hired',
          value: '',
          error: 'Date Hired is required.',
          suggestedFix: 'Format date as YYYY-MM-DD (e.g. 2026-01-15).',
        });
      } else if (isNaN(new Date(dateHired).getTime())) {
        errors.push({
          row: rowNum,
          field: 'Date Hired',
          value: dateHired,
          error: `Invalid date format for Date Hired: "${dateHired}".`,
          suggestedFix: 'Use ISO standard format YYYY-MM-DD.',
        });
      }

      // 4. Employment Status
      const rawStatus = (raw['Employment Status'] || raw['employmentStatus'] || raw['Status'] || 'Active').trim();
      const validStatuses: EmploymentStatus[] = ['Active', 'Inactive', 'Resigned', 'Terminated', 'Retired', 'On Leave'];
      const matchedStatus = validStatuses.find((s) => s.toLowerCase() === rawStatus.toLowerCase()) || 'Active';

      // 5. Employment Type
      const rawType = (raw['Employment Type'] || raw['employmentType'] || raw['Type'] || 'Regular').trim();
      const validTypes: EmploymentType[] = ['Regular', 'Probationary', 'Contractual', 'Casual', 'Part-Time', 'Other'];
      const matchedType = validTypes.find((t) => t.toLowerCase() === rawType.toLowerCase()) || 'Regular';

      // 6. Department Matching
      const deptCode = (raw['Department'] || raw['Department Code'] || raw['department'] || '').trim().toUpperCase();
      let departmentId = '';
      if (deptCode) {
        const foundDept = depts.find((d) => d.code === deptCode || d.name.toLowerCase() === deptCode.toLowerCase());
        if (foundDept) {
          departmentId = foundDept.id;
        } else {
          errors.push({
            row: rowNum,
            field: 'Department',
            value: deptCode,
            error: `Department "${deptCode}" does not exist in this company.`,
            suggestedFix: `Create department "${deptCode}" first or use an existing code: ${depts.map((d) => d.code).join(', ')}.`,
          });
        }
      }

      // 7. Position Matching
      const posCode = (raw['Position'] || raw['Position Code'] || raw['position'] || '').trim().toUpperCase();
      let positionId = '';
      if (posCode) {
        const foundPos = positions.find((p) => p.code === posCode || p.name.toLowerCase() === posCode.toLowerCase());
        if (foundPos) {
          positionId = foundPos.id;
        } else {
          errors.push({
            row: rowNum,
            field: 'Position',
            value: posCode,
            error: `Position "${posCode}" does not exist in this company.`,
            suggestedFix: `Create position "${posCode}" first or use: ${positions.map((p) => p.code).join(', ')}.`,
          });
        }
      }

      // 8. Rates
      const rawDaily = raw['Daily Rate'] || raw['dailyRate'] || '';
      const rawMonthly = raw['Monthly Rate'] || raw['monthlyRate'] || '';
      let dailyRate = 0;
      let monthlyRate = 0;

      if (rawDaily) {
        dailyRate = parseFloat(rawDaily.replace(/[^0-9.]/g, ''));
        if (isNaN(dailyRate) || dailyRate < 0) {
          errors.push({
            row: rowNum,
            field: 'Daily Rate',
            value: rawDaily,
            error: 'Daily Rate must be a valid non-negative number.',
            suggestedFix: 'Enter numeric rate without letters or symbols.',
          });
        }
      }

      if (rawMonthly) {
        monthlyRate = parseFloat(rawMonthly.replace(/[^0-9.]/g, ''));
        if (isNaN(monthlyRate) || monthlyRate < 0) {
          errors.push({
            row: rowNum,
            field: 'Monthly Rate',
            value: rawMonthly,
            error: 'Monthly Rate must be a valid non-negative number.',
            suggestedFix: 'Enter numeric rate without letters or symbols.',
          });
        }
      }

      const rawPayType = (raw['Pay Type'] || raw['payType'] || (monthlyRate > 0 ? 'Monthly' : 'Daily')).trim();
      const payType: PayType = rawPayType.toLowerCase() === 'daily' ? 'Daily' : 'Monthly';

      // 9. Email
      const email = (raw['Email'] || raw['email'] || '').trim();
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push({
            row: rowNum,
            field: 'Email',
            value: email,
            error: 'Invalid email address format.',
            suggestedFix: 'Provide a valid email (e.g. employee@company.ph).',
          });
        }
      }

      const isValid = errors.length === 0;
      let normalized: CreateEmployeeInput | undefined = undefined;

      if (isValid) {
        normalized = {
          companyId: targetCompanyId,
          employeeNumber: empNo,
          firstName,
          middleName,
          lastName,
          dateHired,
          employmentStatus: matchedStatus,
          employmentType: matchedType,
          departmentId,
          positionId,
          email,
          contactNumber: raw['Contact Number'] || raw['contactNumber'] || '',
          address: raw['Address'] || raw['address'] || '',
          tin: raw['TIN'] || raw['tin'] || '',
          sssNumber: raw['SSS Number'] || raw['sssNumber'] || '',
          philHealthNumber: raw['PhilHealth Number'] || raw['philHealthNumber'] || '',
          pagIbigNumber: raw['Pag-IBIG Number'] || raw['pagIbigNumber'] || '',
          bankName: raw['Bank Name'] || raw['bankName'] || '',
          bankAccount: raw['Bank Account'] || raw['bankAccount'] || '',
          dailyRate,
          monthlyRate,
          payType,
          payFrequency: 'Semi-Monthly',
        };
      }

      parsedRows.push({
        rowNumber: rowNum,
        raw,
        normalized,
        errors,
        isValid,
      });
    }

    const validRows = parsedRows.filter((r) => r.isValid).length;
    const invalidRows = parsedRows.filter((r) => !r.isValid).length;

    return {
      totalRows: parsedRows.length,
      validRows,
      invalidRows,
      rows: parsedRows,
    };
  }

  /**
   * Commit valid rows to database with audit log
   */
  public async executeImport(
    validInputs: CreateEmployeeInput[],
    companyId: string,
    userId = 'user_admin'
  ): Promise<{ importedCount: number; employees: Employee[] }> {
    const createdList: Employee[] = [];

    for (const input of validInputs) {
      const created = await employeeService.createEmployee(input, userId);
      createdList.push(created);
    }

    await auditService.logAction({
      userId,
      companyId,
      action: 'IMPORT',
      entityType: 'Employee',
      entityId: 'batch_import',
      description: `Imported ${createdList.length} employee records via CSV/File batch upload`,
    });

    return {
      importedCount: createdList.length,
      employees: createdList,
    };
  }

  /**
   * Generate CSV format for download
   */
  public generateExportCSV(
    employees: Employee[],
    depts: { id: string; code: string; name: string }[],
    positions: { id: string; code: string; name: string }[],
    options: ExportOptions
  ): string {
    const headers = [
      'Employee Number',
      'First Name',
      'Middle Name',
      'Last Name',
      'Suffix',
      'Date Hired',
      'Employment Status',
      'Employment Type',
      'Department',
      'Position',
      'Location',
      'Contact Number',
      'Email',
    ];

    if (options.includeStatutory) {
      headers.push('TIN', 'SSS Number', 'PhilHealth Number', 'Pag-IBIG Number');
    }

    if (options.includeSalary) {
      headers.push('Pay Type', 'Daily Rate', 'Monthly Rate', 'Pay Frequency');
    }

    const rows: string[] = [headers.join(',')];

    for (const emp of employees) {
      const dept = depts.find((d) => d.id === emp.departmentId)?.code || '';
      const pos = positions.find((p) => p.id === emp.positionId)?.code || '';

      const line = [
        `"${emp.employeeNumber}"`,
        `"${emp.firstName}"`,
        `"${emp.middleName || ''}"`,
        `"${emp.lastName}"`,
        `"${emp.suffix || ''}"`,
        `"${emp.dateHired}"`,
        `"${emp.employmentStatus}"`,
        `"${emp.employmentType}"`,
        `"${dept}"`,
        `"${pos}"`,
        `"${emp.location || ''}"`,
        `"${emp.contactNumber || ''}"`,
        `"${emp.email || ''}"`,
      ];

      if (options.includeStatutory) {
        line.push(
          `"${emp.tin || ''}"`,
          `"${emp.sssNumber || ''}"`,
          `"${emp.philHealthNumber || ''}"`,
          `"${emp.pagIbigNumber || ''}"`
        );
      }

      if (options.includeSalary) {
        line.push(
          `"${emp.payType || 'Monthly'}"`,
          `"${emp.dailyRate || 0}"`,
          `"${emp.monthlyRate || 0}"`,
          `"${emp.payFrequency || 'Semi-Monthly'}"`
        );
      }

      rows.push(line.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Sample template generator for import
   */
  public generateSampleTemplateCSV(): string {
    const headers = [
      'Employee Number',
      'First Name',
      'Middle Name',
      'Last Name',
      'Date Hired',
      'Employment Status',
      'Employment Type',
      'Department',
      'Position',
      'Daily Rate',
      'Monthly Rate',
      'Email',
      'Contact Number',
      'TIN',
      'SSS Number',
      'PhilHealth Number',
      'Pag-IBIG Number',
    ];

    const sample1 = [
      'EMP-0101',
      'Juan',
      'Reyes',
      'dela Cruz',
      '2026-01-15',
      'Active',
      'Regular',
      'HR',
      'HR-MGR',
      '1800',
      '45000',
      'juan.delacruz@company.ph',
      '+63 917 111 2233',
      '123-456-789-000',
      '03-1234567-8',
      '12-345678901-2',
      '1234-5678-9012',
    ];

    const sample2 = [
      'EMP-0102',
      'Maria',
      'Santos',
      'Bautista',
      '2026-02-01',
      'Active',
      'Regular',
      'PROD',
      'PROD-SUP',
      '1400',
      '35000',
      'maria.bautista@company.ph',
      '+63 920 333 4455',
      '234-567-890-000',
      '03-2345678-9',
      '23-456789012-3',
      '2345-6789-0123',
    ];

    return [headers.join(','), sample1.join(','), sample2.join(',')].join('\n');
  }

  /**
   * Trigger browser file download
   */
  public triggerDownload(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;'): void {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const employeeImportExportService = new EmployeeImportExportService();

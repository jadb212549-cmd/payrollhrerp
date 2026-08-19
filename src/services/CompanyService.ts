/**
 * Company Service - Business & Domain Logic Layer
 * Validates entity constraints, manages transactions, enforces audit trails
 */

import { companyRepository, CompanyFilterCriteria } from '../repositories/CompanyRepository';
import { auditRepository } from '../repositories/AuditRepository';
import { Company, CompanyStatus, AuditLog } from '../db/schema';

export interface CreateCompanyInput {
  companyCode: string;
  legalName: string;
  tradeName?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  contactNumber?: string;
  email?: string;
  website?: string;
  tin?: string;
  rdoCode?: string;
  businessRegistrationNumber?: string;
  sssEmployerNumber?: string;
  philHealthEmployerNumber?: string;
  pagIbigEmployerNumber?: string;
}

export interface UpdateCompanyInput {
  companyCode?: string;
  legalName?: string;
  tradeName?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  contactNumber?: string;
  email?: string;
  website?: string;
  tin?: string;
  rdoCode?: string;
  businessRegistrationNumber?: string;
  sssEmployerNumber?: string;
  philHealthEmployerNumber?: string;
  pagIbigEmployerNumber?: string;
  status?: CompanyStatus;
}

export class CompanyService {
  private static instance: CompanyService | null = null;

  private constructor() {}

  public static getInstance(): CompanyService {
    if (!CompanyService.instance) {
      CompanyService.instance = new CompanyService();
    }
    return CompanyService.instance;
  }

  /**
   * Helper: Generate unique ID
   */
  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'cmp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  /**
   * Normalize company code
   */
  public normalizeCode(code: string): string {
    return code.trim().toUpperCase().replace(/\s+/g, '');
  }

  /**
   * Validate company input
   */
  private validateCompanyInput(input: { companyCode: string; legalName: string; email?: string }): void {
    const normalizedCode = this.normalizeCode(input.companyCode);
    if (!normalizedCode || normalizedCode.length < 2) {
      throw new Error('Company Code is required and must be at least 2 characters long.');
    }

    if (normalizedCode.length > 20) {
      throw new Error('Company Code cannot exceed 20 characters.');
    }

    if (!/^[A-Z0-9_-]+$/.test(normalizedCode)) {
      throw new Error('Company Code may only contain uppercase alphanumeric characters, hyphens, and underscores.');
    }

    if (!input.legalName || input.legalName.trim().length === 0) {
      throw new Error('Registered Legal Name is required.');
    }

    if (input.email && input.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.email.trim())) {
        throw new Error('Invalid email address format.');
      }
    }
  }

  /**
   * Create a new company
   */
  public async createCompany(input: CreateCompanyInput, currentUserId = 'usr_sys_admin'): Promise<Company> {
    this.validateCompanyInput(input);

    const normalizedCode = this.normalizeCode(input.companyCode);

    // Check duplicate code
    const existing = await companyRepository.findByCode(normalizedCode);
    if (existing) {
      throw new Error(`Company code "${normalizedCode}" already exists. Company codes must be unique.`);
    }

    const timestamp = new Date().toISOString();
    const newCompany: Company = {
      id: this.generateId(),
      companyCode: normalizedCode,
      legalName: input.legalName.trim(),
      tradeName: input.tradeName ? input.tradeName.trim() : undefined,
      address: input.address?.trim() || undefined,
      city: input.city?.trim() || undefined,
      province: input.province?.trim() || undefined,
      postalCode: input.postalCode?.trim() || undefined,
      country: input.country?.trim() || 'Philippines',
      contactNumber: input.contactNumber?.trim() || undefined,
      email: input.email?.trim() || undefined,
      website: input.website?.trim() || undefined,
      tin: input.tin?.trim() || undefined,
      rdoCode: input.rdoCode?.trim() || undefined,
      businessRegistrationNumber: input.businessRegistrationNumber?.trim() || undefined,
      sssEmployerNumber: input.sssEmployerNumber?.trim() || undefined,
      philHealthEmployerNumber: input.philHealthEmployerNumber?.trim() || undefined,
      pagIbigEmployerNumber: input.pagIbigEmployerNumber?.trim() || undefined,
      status: 'Active',
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
    };

    // Save company record
    await companyRepository.save(newCompany);

    // Create Audit Log
    const auditLog: AuditLog = {
      id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      timestamp,
      userId: currentUserId,
      companyId: newCompany.id,
      action: 'CREATE',
      entityType: 'Company',
      entityId: newCompany.id,
      description: `Registered new business entity ${newCompany.companyCode} (${newCompany.legalName})`,
      newValue: { ...newCompany } as unknown as Record<string, unknown>,
    };
    await auditRepository.log(auditLog);

    return newCompany;
  }

  /**
   * Update an existing company
   */
  public async updateCompany(
    id: string,
    input: UpdateCompanyInput,
    currentUserId = 'usr_sys_admin'
  ): Promise<Company> {
    const existing = await companyRepository.findById(id);
    if (!existing) {
      throw new Error(`Company with ID "${id}" not found.`);
    }

    if (input.companyCode !== undefined) {
      const normalized = this.normalizeCode(input.companyCode);
      if (normalized !== existing.companyCode) {
        // Validate and check duplicate
        this.validateCompanyInput({ companyCode: normalized, legalName: input.legalName || existing.legalName });
        const duplicate = await companyRepository.findByCode(normalized);
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Company code "${normalized}" is already in use by another entity.`);
        }
      }
    }

    if (input.email !== undefined && input.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.email.trim())) {
        throw new Error('Invalid email address format.');
      }
    }

    const timestamp = new Date().toISOString();
    const previousSnapshot = { ...existing };

    const updated: Company = {
      ...existing,
      companyCode: input.companyCode !== undefined ? this.normalizeCode(input.companyCode) : existing.companyCode,
      legalName: input.legalName !== undefined ? input.legalName.trim() : existing.legalName,
      tradeName: input.tradeName !== undefined ? input.tradeName.trim() : existing.tradeName,
      address: input.address !== undefined ? input.address.trim() : existing.address,
      city: input.city !== undefined ? input.city.trim() : existing.city,
      province: input.province !== undefined ? input.province.trim() : existing.province,
      postalCode: input.postalCode !== undefined ? input.postalCode.trim() : existing.postalCode,
      country: input.country !== undefined ? input.country.trim() : existing.country,
      contactNumber: input.contactNumber !== undefined ? input.contactNumber.trim() : existing.contactNumber,
      email: input.email !== undefined ? input.email.trim() : existing.email,
      website: input.website !== undefined ? input.website.trim() : existing.website,
      tin: input.tin !== undefined ? input.tin.trim() : existing.tin,
      rdoCode: input.rdoCode !== undefined ? input.rdoCode.trim() : existing.rdoCode,
      businessRegistrationNumber: input.businessRegistrationNumber !== undefined ? input.businessRegistrationNumber.trim() : existing.businessRegistrationNumber,
      sssEmployerNumber: input.sssEmployerNumber !== undefined ? input.sssEmployerNumber.trim() : existing.sssEmployerNumber,
      philHealthEmployerNumber: input.philHealthEmployerNumber !== undefined ? input.philHealthEmployerNumber.trim() : existing.philHealthEmployerNumber,
      pagIbigEmployerNumber: input.pagIbigEmployerNumber !== undefined ? input.pagIbigEmployerNumber.trim() : existing.pagIbigEmployerNumber,
      status: input.status !== undefined ? input.status : existing.status,
      updatedAt: timestamp,
    };

    await companyRepository.save(updated);

    // Audit log
    const auditLog: AuditLog = {
      id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      timestamp,
      userId: currentUserId,
      companyId: updated.id,
      action: 'UPDATE',
      entityType: 'Company',
      entityId: updated.id,
      description: `Updated profile details for company ${updated.companyCode}`,
      previousValue: previousSnapshot as unknown as Record<string, unknown>,
      newValue: { ...updated } as unknown as Record<string, unknown>,
    };
    await auditRepository.log(auditLog);

    return updated;
  }

  /**
   * Safe Archival of Company
   */
  public async archiveCompany(id: string, currentUserId = 'usr_sys_admin'): Promise<Company> {
    const existing = await companyRepository.findById(id);
    if (!existing) {
      throw new Error(`Company with ID "${id}" not found.`);
    }

    if (existing.status === 'Archived') {
      return existing;
    }

    const timestamp = new Date().toISOString();
    const previousSnapshot = { ...existing };

    const archived: Company = {
      ...existing,
      status: 'Archived',
      archivedAt: timestamp,
      updatedAt: timestamp,
    };

    await companyRepository.save(archived);

    // Audit log
    const auditLog: AuditLog = {
      id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      timestamp,
      userId: currentUserId,
      companyId: archived.id,
      action: 'ARCHIVE',
      entityType: 'Company',
      entityId: archived.id,
      description: `Archived business entity ${archived.companyCode} (${archived.legalName})`,
      previousValue: previousSnapshot as unknown as Record<string, unknown>,
      newValue: { ...archived } as unknown as Record<string, unknown>,
    };
    await auditRepository.log(auditLog);

    return archived;
  }

  /**
   * Restore an archived company
   */
  public async restoreCompany(id: string, currentUserId = 'usr_sys_admin'): Promise<Company> {
    const existing = await companyRepository.findById(id);
    if (!existing) {
      throw new Error(`Company with ID "${id}" not found.`);
    }

    const timestamp = new Date().toISOString();
    const previousSnapshot = { ...existing };

    const restored: Company = {
      ...existing,
      status: 'Active',
      archivedAt: null,
      updatedAt: timestamp,
    };

    await companyRepository.save(restored);

    // Audit log
    const auditLog: AuditLog = {
      id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      timestamp,
      userId: currentUserId,
      companyId: restored.id,
      action: 'RESTORE',
      entityType: 'Company',
      entityId: restored.id,
      description: `Restored archived business entity ${restored.companyCode} to Active status`,
      previousValue: previousSnapshot as unknown as Record<string, unknown>,
      newValue: { ...restored } as unknown as Record<string, unknown>,
    };
    await auditRepository.log(auditLog);

    return restored;
  }

  public async getCompany(id: string): Promise<Company | null> {
    return companyRepository.findById(id);
  }

  public async getCompanyByCode(code: string): Promise<Company | null> {
    return companyRepository.findByCode(code);
  }

  public async listCompanies(criteria: CompanyFilterCriteria = {}): Promise<Company[]> {
    return companyRepository.findWithFilter(criteria);
  }

  public async listActiveCompanies(): Promise<Company[]> {
    return companyRepository.findActive();
  }

  /**
   * Optional Development Seed helper for quick evaluation
   */
  public async seedDevelopmentCompanies(): Promise<Company[]> {
    const sampleCompanies: CreateCompanyInput[] = [
      {
        companyCode: 'CSCM',
        legalName: 'CSCM Cheese Manufacturing Corp.',
        tradeName: 'CSCM Cheese',
        address: 'Lot 4 Block 2, Laguna Technopark',
        city: 'Santa Rosa',
        province: 'Laguna',
        postalCode: '4026',
        country: 'Philippines',
        contactNumber: '+63 49 541 2000',
        email: 'payroll@cscmcheese.ph',
        tin: '008-129-450-000',
        rdoCode: '057 - San Pedro / Santa Rosa',
        sssEmployerNumber: '03-9128345-1',
        philHealthEmployerNumber: '00-200394812-4',
        pagIbigEmployerNumber: '2020-0039-4819',
      },
      {
        companyCode: 'JMDM',
        legalName: 'JMDM Precision Industrial Corp.',
        tradeName: 'JMDM Manufacturing',
        address: 'Cavite Economic Zone (CEZ)',
        city: 'Rosario',
        province: 'Cavite',
        postalCode: '4106',
        country: 'Philippines',
        contactNumber: '+63 46 437 1180',
        email: 'finance@jmdm.com.ph',
        tin: '009-482-193-000',
        rdoCode: '054B - Bacoor / Cavite',
        sssEmployerNumber: '03-8827164-9',
        philHealthEmployerNumber: '00-300481920-1',
        pagIbigEmployerNumber: '2020-0048-1920',
      },
      {
        companyCode: 'NAC',
        legalName: 'Northern Agri-Ventures Corp.',
        tradeName: 'Northern Agri Corp',
        address: 'Hacienda Luisita Industrial Park',
        city: 'Tarlac City',
        province: 'Tarlac',
        postalCode: '2300',
        country: 'Philippines',
        contactNumber: '+63 45 982 3344',
        email: 'hr@northernagri.ph',
        tin: '010-384-912-000',
        rdoCode: '017 - Tarlac',
        sssEmployerNumber: '03-7718293-4',
        philHealthEmployerNumber: '00-400192837-8',
        pagIbigEmployerNumber: '2020-0077-1829',
      },
      {
        companyCode: 'MLOG',
        legalName: 'Metro Cargo & Logistics Inc.',
        tradeName: 'Metro Logistics',
        address: 'North Harbor Hub, Port Area',
        city: 'Manila',
        province: 'Metro Manila',
        postalCode: '1012',
        country: 'Philippines',
        contactNumber: '+63 2 8245 9000',
        email: 'ops@metrologistics.com',
        tin: '007-883-291-000',
        rdoCode: '033 - Intramuros / Port Area',
        sssEmployerNumber: '03-6629183-0',
        philHealthEmployerNumber: '00-500293847-2',
        pagIbigEmployerNumber: '2020-0066-2918',
      }
    ];

    const results: Company[] = [];
    for (const sample of sampleCompanies) {
      const existing = await companyRepository.findByCode(sample.companyCode);
      if (!existing) {
        const created = await this.createCompany(sample, 'usr_sys_admin');
        results.push(created);
      } else {
        results.push(existing);
      }
    }

    return results;
  }
}

export const companyService = CompanyService.getInstance();

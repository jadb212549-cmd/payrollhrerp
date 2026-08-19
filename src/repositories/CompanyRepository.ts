/**
 * Company Repository - Data Access Layer
 * Enforces company-scoped queries and direct database interaction
 */

import { dbEngine } from '../db/database';
import { Company, CompanyStatus } from '../db/schema';

export interface CompanyFilterCriteria {
  searchTerm?: string;
  status?: CompanyStatus | 'All';
  limit?: number;
  offset?: number;
}

export class CompanyRepository {
  private static instance: CompanyRepository | null = null;
  private readonly storeName = 'companies';

  private constructor() {}

  public static getInstance(): CompanyRepository {
    if (!CompanyRepository.instance) {
      CompanyRepository.instance = new CompanyRepository();
    }
    return CompanyRepository.instance;
  }

  public async findById(id: string): Promise<Company | null> {
    return dbEngine.get<Company>(this.storeName, id);
  }

  public async findByCode(code: string): Promise<Company | null> {
    const normalized = code.trim().toUpperCase();
    return dbEngine.getByIndex<Company>(this.storeName, 'companyCode', normalized);
  }

  public async findAll(): Promise<Company[]> {
    return dbEngine.getAll<Company>(this.storeName);
  }

  public async findActive(): Promise<Company[]> {
    return dbEngine.getAllByIndex<Company>(this.storeName, 'status', 'Active');
  }

  public async findWithFilter(criteria: CompanyFilterCriteria): Promise<Company[]> {
    const all = await this.findAll();

    let filtered = all;

    // Filter by status
    if (criteria.status && criteria.status !== 'All') {
      filtered = filtered.filter((c) => c.status === criteria.status);
    }

    // Filter by search term (code, legalName, tradeName, tin)
    if (criteria.searchTerm && criteria.searchTerm.trim() !== '') {
      const term = criteria.searchTerm.toLowerCase().trim();
      filtered = filtered.filter((c) => {
        const matchCode = c.companyCode.toLowerCase().includes(term);
        const matchLegal = c.legalName.toLowerCase().includes(term);
        const matchTrade = c.tradeName ? c.tradeName.toLowerCase().includes(term) : false;
        const matchTin = c.tin ? c.tin.toLowerCase().includes(term) : false;
        return matchCode || matchLegal || matchTrade || matchTin;
      });
    }

    // Sort by companyCode ascending
    filtered.sort((a, b) => a.companyCode.localeCompare(b.companyCode));

    return filtered;
  }

  public async save(company: Company): Promise<void> {
    await dbEngine.put<Company>(this.storeName, company);
  }

  public async delete(id: string): Promise<void> {
    await dbEngine.delete(this.storeName, id);
  }

  public async count(): Promise<number> {
    const all = await this.findAll();
    return all.length;
  }
}

export const companyRepository = CompanyRepository.getInstance();

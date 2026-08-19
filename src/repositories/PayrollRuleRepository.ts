/**
 * Payroll Rule Repository - Data Access Layer for Configurable and Versioned Rules
 */

import { dbEngine } from '../db/database';
import { PayrollRule, RuleCategory, RuleStatus } from '../db/schema';

const STORE_NAME = 'payroll_rules';

export class PayrollRuleRepository {
  private static instance: PayrollRuleRepository | null = null;

  private constructor() {}

  public static getInstance(): PayrollRuleRepository {
    if (!PayrollRuleRepository.instance) {
      PayrollRuleRepository.instance = new PayrollRuleRepository();
    }
    return PayrollRuleRepository.instance;
  }

  public async findById(id: string): Promise<PayrollRule | null> {
    return dbEngine.get<PayrollRule>(STORE_NAME, id);
  }

  public async findAll(): Promise<PayrollRule[]> {
    const list = await dbEngine.getAll<PayrollRule>(STORE_NAME);
    return list.sort((a, b) => a.priority - b.priority || a.ruleCode.localeCompare(b.ruleCode));
  }

  public async findByCompany(companyId: string | null): Promise<PayrollRule[]> {
    const all = await this.findAll();
    if (!companyId) return all;
    return all.filter((r) => r.companyId === companyId || r.companyId === null);
  }

  public async findByRuleCode(ruleCode: string): Promise<PayrollRule[]> {
    const all = await this.findAll();
    return all.filter((r) => r.ruleCode === ruleCode).sort((a, b) => b.version - a.version);
  }

  public async findByCategory(category: RuleCategory): Promise<PayrollRule[]> {
    const all = await this.findAll();
    return all.filter((r) => r.category === category);
  }

  public async create(rule: PayrollRule): Promise<PayrollRule> {
    await dbEngine.put<PayrollRule>(STORE_NAME, rule);
    return rule;
  }

  public async update(rule: PayrollRule): Promise<PayrollRule> {
    await dbEngine.put<PayrollRule>(STORE_NAME, rule);
    return rule;
  }

  public async delete(id: string): Promise<void> {
    await dbEngine.delete(STORE_NAME, id);
  }

  public async bulkPut(rules: PayrollRule[]): Promise<void> {
    for (const r of rules) {
      await dbEngine.put<PayrollRule>(STORE_NAME, r);
    }
  }
}

export const payrollRuleRepository = PayrollRuleRepository.getInstance();

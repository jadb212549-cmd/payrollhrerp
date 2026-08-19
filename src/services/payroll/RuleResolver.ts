/**
 * Rule Resolver - Resolves active payroll rules by hierarchy, company override, effective date, and version
 */

import { payrollRuleRepository } from '../../repositories/PayrollRuleRepository';
import { PayrollRule, RuleCategory } from '../../db/schema';
import { DEFAULT_PAYROLL_RULES } from './DefaultRules';

export class RuleResolver {
  private static instance: RuleResolver | null = null;
  private isBootstrapped = false;

  private constructor() {}

  public static getInstance(): RuleResolver {
    if (!RuleResolver.instance) {
      RuleResolver.instance = new RuleResolver();
    }
    return RuleResolver.instance;
  }

  /**
   * Ensure default rules are provisioned on first launch
   */
  public async ensureDefaults(): Promise<void> {
    if (this.isBootstrapped) return;
    const existing = await payrollRuleRepository.findAll();
    if (existing.length === 0) {
      await payrollRuleRepository.bulkPut(DEFAULT_PAYROLL_RULES);
    }
    this.isBootstrapped = true;
  }

  /**
   * Resolve single active rule for a specific ruleCode, company, and target date
   */
  public async resolveRule(
    ruleCode: string,
    companyId: string | null,
    asOfDate: string
  ): Promise<PayrollRule> {
    await this.ensureDefaults();

    const rules = await payrollRuleRepository.findByRuleCode(ruleCode);

    // 1. Filter by Active status and Date range
    const validRules = rules.filter((r) => {
      if (r.status !== 'Active') return false;
      if (r.effectiveDate > asOfDate) return false;
      if (r.endDate && r.endDate < asOfDate) return false;
      return true;
    });

    if (validRules.length === 0) {
      throw new Error(
        `[CRITICAL PAYROLL ENGINE ERROR] No active payroll rule found for '${ruleCode}' effective on date ${asOfDate}. Processing stopped to prevent unvetted defaults.`
      );
    }

    // 2. Look for Company Override first
    if (companyId) {
      const companyOverrides = validRules.filter((r) => r.companyId === companyId);
      if (companyOverrides.length > 0) {
        // Return latest version
        return companyOverrides.sort((a, b) => b.version - a.version)[0];
      }
    }

    // 3. Fallback to Global Rule (companyId === null)
    const globalRules = validRules.filter((r) => r.companyId === null);
    if (globalRules.length > 0) {
      return globalRules.sort((a, b) => b.version - a.version)[0];
    }

    // 4. If neither, return highest version among valid rules
    return validRules.sort((a, b) => b.version - a.version)[0];
  }

  /**
   * Resolve all active rules for a cutoff run
   */
  public async resolveAllActiveRules(
    companyId: string | null,
    asOfDate: string
  ): Promise<Record<string, PayrollRule>> {
    await this.ensureDefaults();

    const allRules = await payrollRuleRepository.findAll();
    const activeRules = allRules.filter((r) => {
      if (r.status !== 'Active') return false;
      if (r.effectiveDate > asOfDate) return false;
      if (r.endDate && r.endDate < asOfDate) return false;
      return true;
    });

    // Group by ruleCode
    const grouped = new Map<string, PayrollRule[]>();
    for (const r of activeRules) {
      const list = grouped.get(r.ruleCode) || [];
      list.push(r);
      grouped.set(r.ruleCode, list);
    }

    const resolved: Record<string, PayrollRule> = {};

    for (const [code, list] of grouped.entries()) {
      if (companyId) {
        const companyOverride = list
          .filter((r) => r.companyId === companyId)
          .sort((a, b) => b.version - a.version)[0];
        if (companyOverride) {
          resolved[code] = companyOverride;
          continue;
        }
      }

      const globalRule = list
        .filter((r) => r.companyId === null)
        .sort((a, b) => b.version - a.version)[0];

      if (globalRule) {
        resolved[code] = globalRule;
      } else {
        resolved[code] = list.sort((a, b) => b.version - a.version)[0];
      }
    }

    return resolved;
  }
}

export const ruleResolver = RuleResolver.getInstance();

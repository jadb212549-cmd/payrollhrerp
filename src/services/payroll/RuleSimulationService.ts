/**
 * Rule Simulation Service - Draft rule testing and scenario comparison engine
 */

import { PayrollRule, Employee } from '../../db/schema';
import { payrollEngine } from './PayrollEngine';
import { FormulaEvaluator } from './FormulaEvaluator';
import { ruleResolver } from './RuleResolver';
import { payrollRuleRepository } from '../../repositories/PayrollRuleRepository';
import { auditService } from '../AuditService';

export interface SimulationScenarioInput {
  ruleCode: string;
  draftFormula?: string;
  draftParameters?: Record<string, any>;
  testEmployee?: Partial<Employee>;
  testMonthlyRate: number;
  testDaysWorked: number;
  testOTHours: number;
  testNightHours: number;
  testLateMinutes: number;
  testUndertimeMinutes: number;
}

export interface SimulationComparisonResult {
  ruleCode: string;
  activeRule: PayrollRule;
  draftRule: {
    formula: string;
    parameters: Record<string, any>;
    version: number;
  };
  activeResult: number;
  simulatedResult: number;
  varianceAmount: number;
  variancePercent: number;
  activeTrace: any;
  simulatedTrace: any;
}

export class RuleSimulationService {
  private static instance: RuleSimulationService | null = null;

  private constructor() {}

  public static getInstance(): RuleSimulationService {
    if (!RuleSimulationService.instance) {
      RuleSimulationService.instance = new RuleSimulationService();
    }
    return RuleSimulationService.instance;
  }

  /**
   * Run side-by-side simulation comparing active production rule vs draft formula/parameters
   */
  public async runSimulation(input: SimulationScenarioInput): Promise<SimulationComparisonResult> {
    const today = new Date().toISOString().split('T')[0];
    const activeRule = await ruleResolver.resolveRule(input.ruleCode, null, today);

    // Mock employee for simulation
    const mockEmployee: Employee = {
      id: 'emp_sim_test',
      companyId: 'comp_default',
      employeeNumber: 'SIM-001',
      firstName: 'Scenario',
      lastName: 'Tester',
      payType: 'Monthly',
      monthlyRate: input.testMonthlyRate,
      employmentStatus: 'Active',
      employmentType: 'Regular',
      status: 'Active',
      dateHired: '2026-01-01',
      createdAt: today,
      updatedAt: today,
    };

    const mockPeriod: any = {
      id: 'period_sim',
      companyId: 'comp_default',
      periodCode: '2026-08-A',
      name: 'Simulation Test Cutoff',
      startDate: '2026-08-01',
      endDate: '2026-08-15',
      payoutDate: '2026-08-20',
      cutoffType: 'Semi-Monthly',
      status: 'Open',
    };

    const mockDTRs: any[] = [
      {
        id: 'dtr_sim_1',
        companyId: 'comp_default',
        employeeId: 'emp_sim_test',
        date: '2026-08-05',
        regularHours: 8,
        overtimeHours: input.testOTHours,
        nightHours: input.testNightHours,
        lateMinutes: input.testLateMinutes,
        undertimeMinutes: input.testUndertimeMinutes,
        status: 'Present',
      },
    ];

    // 1. Calculate with Active Production Rules
    const activeRes = await payrollEngine.calculateEmployeePayroll({
      employee: mockEmployee,
      period: mockPeriod,
      dtrLogs: mockDTRs,
    });

    // 2. Prepare Draft Rule Override
    const draftRule: PayrollRule = {
      ...activeRule,
      formula: input.draftFormula || activeRule.formula,
      parameters: input.draftParameters || activeRule.parameters,
      version: activeRule.version + 1,
      status: 'Draft',
    };

    const customRules = await ruleResolver.resolveAllActiveRules(null, today);
    customRules[input.ruleCode] = draftRule;

    // 3. Calculate with Simulated Draft Rules
    const simRes = await payrollEngine.calculateEmployeePayroll({
      employee: mockEmployee,
      period: mockPeriod,
      dtrLogs: mockDTRs,
      customRules,
    });

    // Extract target rule value
    const getTargetAmount = (slip: any) => {
      switch (input.ruleCode) {
        case 'RULE_REGULAR_OT':
          return slip.overtimePay;
        case 'RULE_NIGHT_DIFF':
          return slip.nightDiffPay;
        case 'RULE_LATE_DEDUCTION':
          return slip.lateDeduction;
        case 'RULE_SSS_CONTRIBUTION':
          return slip.sssEE;
        case 'RULE_PHILHEALTH_CONTRIBUTION':
          return slip.philHealthEE;
        case 'RULE_PAGIBIG_CONTRIBUTION':
          return slip.pagIbigEE;
        case 'RULE_WITHHOLDING_TAX':
          return slip.withholdingTax;
        default:
          return slip.basicPay;
      }
    };

    const activeVal = getTargetAmount(activeRes.payslip);
    const simVal = getTargetAmount(simRes.payslip);
    const varianceAmount = Number((simVal - activeVal).toFixed(2));
    const variancePercent = activeVal > 0 ? Number(((varianceAmount / activeVal) * 100).toFixed(2)) : 0;

    return {
      ruleCode: input.ruleCode,
      activeRule,
      draftRule: {
        formula: draftRule.formula,
        parameters: draftRule.parameters,
        version: draftRule.version,
      },
      activeResult: activeVal,
      simulatedResult: simVal,
      varianceAmount,
      variancePercent,
      activeTrace: activeRes.traces.find((t) => t.ruleCode === input.ruleCode),
      simulatedTrace: simRes.traces.find((t) => t.ruleCode === input.ruleCode),
    };
  }

  /**
   * Version bump & activate approved rule safely without modifying historical rules
   */
  public async activateNewRuleVersion(
    ruleCode: string,
    companyId: string | null,
    newFormula: string,
    newParameters: Record<string, any>,
    effectiveDate: string,
    approver = 'Admin Supervisor'
  ): Promise<PayrollRule> {
    const existingRules = await payrollRuleRepository.findByRuleCode(ruleCode);
    const highestVer = existingRules.length > 0 ? Math.max(...existingRules.map((r) => r.version)) : 0;
    const baseRule = existingRules[0];

    const now = new Date().toISOString();
    const newVersionRule: PayrollRule = {
      id: `rule_${ruleCode.toLowerCase()}_v${highestVer + 1}`,
      companyId,
      ruleCode,
      ruleName: baseRule ? baseRule.ruleName : ruleCode,
      category: baseRule ? baseRule.category : 'Overtime',
      description: baseRule ? baseRule.description : 'Updated calculation rule',
      formula: newFormula,
      parameters: newParameters,
      effectiveDate,
      endDate: '9999-12-31',
      version: highestVer + 1,
      priority: baseRule ? baseRule.priority : 20,
      status: 'Active',
      createdBy: approver,
      approvedBy: approver,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await payrollRuleRepository.create(newVersionRule);

    await auditService.logAction({
      userId: approver,
      companyId: companyId || 'GLOBAL',
      action: 'APPROVE',
      entityType: 'PayrollRule',
      entityId: newVersionRule.id,
      description: `Activated new Version ${newVersionRule.version} for '${ruleCode}' effective ${effectiveDate}`,
      newValue: {
        version: newVersionRule.version,
        parameters: newParameters,
        effectiveDate,
      },
    });

    return newVersionRule;
  }
}

export const ruleSimulationService = RuleSimulationService.getInstance();

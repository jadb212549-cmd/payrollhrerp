/**
 * Central Payroll Calculation Engine
 * Versioned, auditable, traceable, company-aware, effective-date aware
 */

import { Employee, DTRRecord, PayrollPeriod, PayrollRule, PayslipRecord, CalculationTraceStep, PayslipLineItem } from '../../db/schema';
import { ruleResolver } from './RuleResolver';
import { rateResolver, ResolvedEmployeeRates } from './RateResolver';
import { FormulaEvaluator } from './FormulaEvaluator';
import { statutoryEngine } from './StatutoryEngine';
import { dtrService } from '../DTRService';
import { employeeRepository } from '../../repositories/EmployeeRepository';
import { payrollRunRepository } from '../../repositories/PayrollRunRepository';
import { auditService } from '../AuditService';

export interface CalculationEngineInput {
  employee: Employee;
  period: PayrollPeriod;
  dtrLogs?: DTRRecord[];
  customRules?: Record<string, PayrollRule>; // optional override for simulation mode
}

export interface PayrollEngineResult {
  payslip: PayslipRecord;
  rates: ResolvedEmployeeRates;
  traces: CalculationTraceStep[];
}

export class PayrollEngine {
  private static instance: PayrollEngine | null = null;

  private constructor() {}

  public static getInstance(): PayrollEngine {
    if (!PayrollEngine.instance) {
      PayrollEngine.instance = new PayrollEngine();
    }
    return PayrollEngine.instance;
  }

  /**
   * Execute comprehensive calculation for a single employee in a period
   */
  public async calculateEmployeePayroll(input: CalculationEngineInput): Promise<PayrollEngineResult> {
    const { employee, period } = input;
    const now = new Date().toISOString();
    const traces: CalculationTraceStep[] = [];
    const lineItems: PayslipLineItem[] = [];
    const appliedRuleVersions: Record<string, number> = {};

    // 1. Resolve Active Rules for period cutoff date
    const rules = input.customRules || (await ruleResolver.resolveAllActiveRules(employee.companyId, period.endDate));

    // 2. Resolve Rates
    const rates = await rateResolver.resolveRates(employee);

    // 3. Resolve Attendance (DTR logs)
    let dtrs = input.dtrLogs;
    if (!dtrs) {
      dtrs = await dtrService.listDTRs({
        companyId: employee.companyId,
        employeeId: employee.id,
        startDate: period.startDate,
        endDate: period.endDate,
      });
    }

    // Aggregate Attendance metrics
    let daysWorked = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    let nightHours = 0;
    let lateMinutes = 0;
    let undertimeMinutes = 0;
    let absentDays = 0;

    for (const d of dtrs) {
      if (d.status === 'Present' || d.status === 'Late') {
        daysWorked++;
        regularHours += d.regularHours || 0;
      }
      overtimeHours += d.overtimeHours || 0;
      nightHours += d.nightHours || 0;
      lateMinutes += d.lateMinutes || 0;
      undertimeMinutes += d.undertimeMinutes || 0;
      if (d.status === 'Absent') {
        absentDays++;
      }
    }

    // Default to 10-11 days if no DTRs provided in semi-monthly salaried setup
    if (dtrs.length === 0 && rates.rateBasis === 'Monthly') {
      daysWorked = 11;
      regularHours = 88;
    }

    // Common standard variable scope
    const baseVariables: Record<string, number | string | boolean> = {
      monthlyRate: rates.monthlyRate,
      dailyRate: rates.dailyRate,
      hourlyRate: rates.hourlyRate,
      rateBasis: rates.rateBasis,
      daysWorked,
      regularHours,
      overtimeHours,
      nightHours,
      lateMinutes,
      undertimeMinutes,
      absentDays,
    };

    // ----------------------------------------------------
    // STEP 1: Basic Pay
    // ----------------------------------------------------
    const basicRule = rules['RULE_BASIC_PAY'];
    if (!basicRule) throw new Error("Missing required active rule: 'RULE_BASIC_PAY'");
    appliedRuleVersions[basicRule.ruleCode] = basicRule.version;

    let basicPay = 0;
    if (rates.rateBasis === 'Monthly') {
      basicPay = Number((rates.monthlyRate / (basicRule.parameters.semiMonthlyDivisor || 2)).toFixed(2));
    } else {
      basicPay = Number((rates.dailyRate * daysWorked).toFixed(2));
    }

    traces.push({
      stepName: 'Basic Pay Calculation',
      ruleCode: basicRule.ruleCode,
      ruleVersion: basicRule.version,
      formula: basicRule.formula,
      inputs: {
        rateBasis: rates.rateBasis,
        monthlyRate: `₱${rates.monthlyRate.toLocaleString()}`,
        dailyRate: `₱${rates.dailyRate.toLocaleString()}`,
        daysWorked,
      },
      parameters: basicRule.parameters,
      result: basicPay,
      description: `Basic pay computation for ${period.name}`,
      timestamp: now,
    });

    lineItems.push({
      code: 'EARN_BASIC',
      name: 'Semi-Monthly Basic Pay',
      category: 'Earning',
      amount: basicPay,
      isTaxable: true,
      ruleCode: basicRule.ruleCode,
      ruleVersion: basicRule.version,
      explanation: `${rates.rateBasis === 'Monthly' ? 'Half-month salary' : `${daysWorked} days @ ₱${rates.dailyRate}/day`}`,
    });

    // ----------------------------------------------------
    // STEP 2: Regular Overtime Pay
    // ----------------------------------------------------
    let overtimePay = 0;
    const otRule = rules['RULE_REGULAR_OT'];
    if (otRule && overtimeHours > 0) {
      appliedRuleVersions[otRule.ruleCode] = otRule.version;
      const multiplier = Number(otRule.parameters.regularOTMultiplier) || 1.25;
      overtimePay = Number((rates.hourlyRate * overtimeHours * multiplier).toFixed(2));

      traces.push({
        stepName: 'Overtime Pay Calculation',
        ruleCode: otRule.ruleCode,
        ruleVersion: otRule.version,
        formula: otRule.formula,
        inputs: {
          hourlyRate: `₱${rates.hourlyRate}`,
          overtimeHours,
          multiplier: `${(multiplier * 100).toFixed(0)}%`,
        },
        parameters: otRule.parameters,
        result: overtimePay,
        description: `Overtime pay for ${overtimeHours} approved hours`,
        timestamp: now,
      });

      lineItems.push({
        code: 'EARN_OT',
        name: `Regular Overtime (${(multiplier * 100).toFixed(0)}%)`,
        category: 'Earning',
        amount: overtimePay,
        isTaxable: true,
        ruleCode: otRule.ruleCode,
        ruleVersion: otRule.version,
        explanation: `${overtimeHours} hrs @ ₱${rates.hourlyRate}/hr × ${multiplier}`,
      });
    }

    // ----------------------------------------------------
    // STEP 3: Night Shift Differential
    // ----------------------------------------------------
    let nightDiffPay = 0;
    const ndRule = rules['RULE_NIGHT_DIFF'];
    if (ndRule && nightHours > 0) {
      appliedRuleVersions[ndRule.ruleCode] = ndRule.version;
      const ndRate = Number(ndRule.parameters.nightDiffRate) || 0.10;
      nightDiffPay = Number((rates.hourlyRate * nightHours * ndRate).toFixed(2));

      traces.push({
        stepName: 'Night Shift Differential',
        ruleCode: ndRule.ruleCode,
        ruleVersion: ndRule.version,
        formula: ndRule.formula,
        inputs: {
          hourlyRate: `₱${rates.hourlyRate}`,
          nightHours,
          rate: `${(ndRate * 100).toFixed(0)}%`,
        },
        parameters: ndRule.parameters,
        result: nightDiffPay,
        description: `Night differential for ${nightHours} night window hours`,
        timestamp: now,
      });

      lineItems.push({
        code: 'EARN_NIGHT_DIFF',
        name: `Night Shift Differential (${(ndRate * 100).toFixed(0)}%)`,
        category: 'Earning',
        amount: nightDiffPay,
        isTaxable: true,
        ruleCode: ndRule.ruleCode,
        ruleVersion: ndRule.version,
      });
    }

    // ----------------------------------------------------
    // STEP 4: Allowances
    // ----------------------------------------------------
    let nonTaxableAllowances = 0;
    let taxableAllowances = 0;
    const empAllowances = (employee as any).allowances;
    if (Array.isArray(empAllowances) && empAllowances.length > 0) {
      for (const alw of empAllowances) {
        const alwAmt = alw.frequency === 'Monthly' ? Number((alw.amount / 2).toFixed(2)) : alw.amount;
        if (alw.isTaxable) {
          taxableAllowances += alwAmt;
        } else {
          nonTaxableAllowances += alwAmt;
        }
        lineItems.push({
          code: `ALW_${alw.type?.toUpperCase() || 'CUSTOM'}`,
          name: `${alw.type || 'Standard'} Allowance`,
          category: 'Earning',
          amount: alwAmt,
          isTaxable: !!alw.isTaxable,
          explanation: alw.description || `${alw.frequency} allowance`,
        });
      }
    }

    // ----------------------------------------------------
    // STEP 5: Gross Pay
    // ----------------------------------------------------
    const grossPay = Number((basicPay + overtimePay + nightDiffPay + taxableAllowances + nonTaxableAllowances).toFixed(2));

    // ----------------------------------------------------
    // STEP 6: Attendance Deductions (Late & Undertime)
    // ----------------------------------------------------
    let lateDeduction = 0;
    const lateRule = rules['RULE_LATE_DEDUCTION'];
    if (lateRule && lateMinutes > 0) {
      appliedRuleVersions[lateRule.ruleCode] = lateRule.version;
      const penalty = Number(lateRule.parameters.latePenaltyMultiplier) || 1.0;
      lateDeduction = Number(((rates.hourlyRate / 60) * lateMinutes * penalty).toFixed(2));

      traces.push({
        stepName: 'Tardiness Deduction',
        ruleCode: lateRule.ruleCode,
        ruleVersion: lateRule.version,
        formula: lateRule.formula,
        inputs: {
          minuteRate: `₱${(rates.hourlyRate / 60).toFixed(4)}/min`,
          lateMinutes,
        },
        parameters: lateRule.parameters,
        result: lateDeduction,
        description: `Tardiness deduction for ${lateMinutes} minutes`,
        timestamp: now,
      });

      lineItems.push({
        code: 'DED_LATE',
        name: 'Tardiness / Late Deduction',
        category: 'Deduction',
        amount: lateDeduction,
        isTaxable: false,
        ruleCode: lateRule.ruleCode,
        ruleVersion: lateRule.version,
        explanation: `${lateMinutes} mins @ ₱${(rates.hourlyRate / 60).toFixed(2)}/min`,
      });
    }

    let undertimeDeduction = 0;
    const utRule = rules['RULE_UNDERTIME_DEDUCTION'];
    if (utRule && undertimeMinutes > 0) {
      appliedRuleVersions[utRule.ruleCode] = utRule.version;
      undertimeDeduction = Number(((rates.hourlyRate / 60) * undertimeMinutes).toFixed(2));

      lineItems.push({
        code: 'DED_UNDERTIME',
        name: 'Undertime Deduction',
        category: 'Deduction',
        amount: undertimeDeduction,
        isTaxable: false,
        ruleCode: utRule.ruleCode,
        ruleVersion: utRule.version,
      });
    }

    // ----------------------------------------------------
    // STEP 7 & 8: Centralized Statutory Engine (SSS, PhilHealth, Pag-IBIG, BIR Tax)
    // ----------------------------------------------------
    const monthlyComp = rates.monthlyRate; // Standard base for statutory MSC / brackets
    const grossTaxableEarnings = basicPay + overtimePay + nightDiffPay + taxableAllowances;
    const attendanceDeductions = lateDeduction + undertimeDeduction;

    const statutoryResult = await statutoryEngine.computeStatutoryAndTax({
      companyId: employee.companyId,
      asOfDate: period.endDate || period.startDate,
      payFrequency: (period.cutoffType === 'Monthly' ? 'Monthly' : 'Semi-Monthly'),
      monthlyCompensation: monthlyComp,
      grossTaxableEarnings,
      attendanceDeductions,
      customRules: rules,
    });

    const sssEE = statutoryResult.sss.employeeShare;
    const sssER = statutoryResult.sss.employerShare;
    const sssEC = statutoryResult.sss.ecContribution;
    const philHealthEE = statutoryResult.philHealth.employeeShare;
    const philHealthER = statutoryResult.philHealth.employerShare;
    const pagIbigEE = statutoryResult.pagIbig.employeeShare;
    const pagIbigER = statutoryResult.pagIbig.employerShare;
    const withholdingTax = statutoryResult.tax.withholdingTax;

    // Merge traces, line items, and applied rule versions
    traces.push(...statutoryResult.traces);
    lineItems.push(...statutoryResult.lineItems);
    Object.assign(appliedRuleVersions, statutoryResult.appliedRuleVersions);

    // ----------------------------------------------------
    // STEP 9: Total Deductions & Net Pay
    // ----------------------------------------------------
    const totalDeductions = Number(
      (lateDeduction + undertimeDeduction + sssEE + philHealthEE + pagIbigEE + withholdingTax).toFixed(2)
    );
    const netPay = Number((grossPay - totalDeductions).toFixed(2));

    const payslip: PayslipRecord = {
      id: 'slip_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      payrollRunId: 'run_active',
      payrollPeriodId: period.id,
      companyId: employee.companyId,
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      employeeName: `${employee.lastName}, ${employee.firstName}`,
      departmentName: employee.departmentId || 'General',
      positionTitle: employee.positionId || 'Staff',

      rateBasis: rates.rateBasis,
      monthlyRate: rates.monthlyRate,
      dailyRate: rates.dailyRate,
      hourlyRate: rates.hourlyRate,
      daysWorked,
      regularHours,
      overtimeHours,
      nightHours,
      lateMinutes,
      undertimeMinutes,
      absentDays,

      basicPay,
      overtimePay,
      nightDiffPay,
      holidayPay: 0,
      taxableAllowances,
      nonTaxableAllowances,
      grossPay,

      lateDeduction,
      undertimeDeduction,
      absentDeduction: 0,
      sssEE,
      sssER,
      sssEC,
      philHealthEE,
      philHealthER,
      pagIbigEE,
      pagIbigER,
      withholdingTax,
      loanDeductions: 0,
      otherDeductions: 0,
      totalDeductions,

      netPay,
      lineItems,
      appliedRuleVersions,
      calculationTrace: traces,
      snapshotTimestamp: now,
      status: 'Calculated',
      createdAt: now,
      updatedAt: now,
    };

    return {
      payslip,
      rates,
      traces,
    };
  }

  /**
   * Process a full company batch payroll run for a period
   */
  public async processCompanyPayrollRun(
    companyId: string,
    period: PayrollPeriod,
    runBy = 'Admin User'
  ): Promise<{ run: any; payslips: PayslipRecord[] }> {
    const employees = await employeeRepository.findByCompanyId(companyId);
    const activeEmps = employees.filter((e) => e.status === 'Active');

    if (activeEmps.length === 0) {
      throw new Error('No active employees found for the selected company.');
    }

    const calculatedSlips: PayslipRecord[] = [];
    const runId = 'run_' + Date.now().toString(36);

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalSssEE = 0;
    let totalSssER = 0;
    let totalPhEE = 0;
    let totalPhER = 0;
    let totalHdmfEE = 0;
    let totalHdmfER = 0;
    let totalWht = 0;

    for (const emp of activeEmps) {
      const res = await this.calculateEmployeePayroll({
        employee: emp,
        period,
      });

      const slip = {
        ...res.payslip,
        payrollRunId: runId,
      };

      calculatedSlips.push(slip);

      totalGross += slip.grossPay;
      totalDeductions += slip.totalDeductions;
      totalNet += slip.netPay;
      totalSssEE += slip.sssEE;
      totalSssER += slip.sssER;
      totalPhEE += slip.philHealthEE;
      totalPhER += slip.philHealthER;
      totalHdmfEE += slip.pagIbigEE;
      totalHdmfER += slip.pagIbigER;
      totalWht += slip.withholdingTax;
    }

    const runRecord = {
      id: runId,
      companyId,
      periodId: period.id,
      runDate: new Date().toISOString().split('T')[0],
      runBy,
      totalEmployees: activeEmps.length,
      totalGrossPay: Number(totalGross.toFixed(2)),
      totalDeductions: Number(totalDeductions.toFixed(2)),
      totalNetPay: Number(totalNet.toFixed(2)),
      totalSssEE: Number(totalSssEE.toFixed(2)),
      totalSssER: Number(totalSssER.toFixed(2)),
      totalPhilHealthEE: Number(totalPhEE.toFixed(2)),
      totalPhilHealthER: Number(totalPhER.toFixed(2)),
      totalPagIbigEE: Number(totalHdmfEE.toFixed(2)),
      totalPagIbigER: Number(totalHdmfER.toFixed(2)),
      totalWithholdingTax: Number(totalWht.toFixed(2)),
      status: 'Calculated' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await payrollRunRepository.createRun(runRecord);
    await payrollRunRepository.bulkSavePayslips(calculatedSlips);

    await auditService.logAction({
      userId: runBy,
      companyId,
      action: 'CALCULATE',
      entityType: 'PayrollRun',
      entityId: runId,
      description: `Calculated semi-monthly payroll batch for ${period.name} (${activeEmps.length} headcount, Gross: ₱${totalGross.toLocaleString()})`,
    });

    return {
      run: runRecord,
      payslips: calculatedSlips,
    };
  }
}

export const payrollEngine = PayrollEngine.getInstance();

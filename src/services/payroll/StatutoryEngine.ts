/**
 * Statutory Engine - Centralized Philippine Government Statutory & Tax Computation Engine
 * Governs SSS, PhilHealth, Pag-IBIG (HDMF), and BIR Withholding Tax calculations.
 * Completely configurable, versioned, effective-date aware, traceable, and DOLE/BIR compliant.
 */

import { PayrollRule, CalculationTraceStep, PayslipLineItem, PayFrequency } from '../../db/schema';
import { ruleResolver } from './RuleResolver';

export interface StatutoryEligibility {
  isSSSEligible?: boolean;
  isPhilHealthEligible?: boolean;
  isPagIbigEligible?: boolean;
  isTaxEligible?: boolean;
  isMinimumWageEarner?: boolean; // MWE exempt from income tax per RA 9504 & TRAIN Law
}

export interface StatutoryComputationInput {
  companyId: string | null;
  asOfDate: string;
  payFrequency: PayFrequency;
  monthlyCompensation: number; // Base rate for statutory MSC / brackets
  grossTaxableEarnings: number;
  attendanceDeductions: number; // Late + Undertime + Absences
  eligibility?: StatutoryEligibility;
  customRules?: Record<string, PayrollRule>; // Optional overrides for simulation / sandbox
}

export interface SSSResult {
  rule: PayrollRule;
  msc: number;
  employeeShare: number;
  employerShare: number;
  ecContribution: number;
  wispEE: number;
  wispER: number;
  totalContribution: number;
  sourceReference: string;
  trace: CalculationTraceStep;
}

export interface PhilHealthResult {
  rule: PayrollRule;
  cappedCompensation: number;
  totalPremium: number;
  employeeShare: number;
  employerShare: number;
  sourceReference: string;
  trace: CalculationTraceStep;
}

export interface PagIbigResult {
  rule: PayrollRule;
  employeeShare: number;
  employerShare: number;
  totalContribution: number;
  sourceReference: string;
  trace: CalculationTraceStep;
}

export interface WithholdingTaxResult {
  rule: PayrollRule;
  taxableIncome: number;
  withholdingTax: number;
  bracketMatched: any;
  excessAmount: number;
  isMWEExempt: boolean;
  sourceReference: string;
  trace: CalculationTraceStep;
}

export interface StatutoryEngineResult {
  sss: SSSResult;
  philHealth: PhilHealthResult;
  pagIbig: PagIbigResult;
  tax: WithholdingTaxResult;
  grossTaxableEarnings: number;
  attendanceDeductions: number;
  totalEmployeeStatutoryDeductions: number;
  taxableIncome: number;
  totalEmployerContributions: number;
  lineItems: PayslipLineItem[];
  traces: CalculationTraceStep[];
  appliedRuleVersions: Record<string, number>;
}

export interface StatutorySimulationInput {
  monthlyCompensation: number;
  grossTaxableEarnings: number;
  attendanceDeductions: number;
  payFrequency?: PayFrequency;
  eligibility?: StatutoryEligibility;
  activeRules: Record<string, PayrollRule>;
  draftRules: Partial<Record<string, PayrollRule>>;
}

export interface StatutorySimulationComparison {
  active: StatutoryEngineResult;
  simulated: StatutoryEngineResult;
  variance: {
    sssEE: number;
    sssER: number;
    philHealthEE: number;
    philHealthER: number;
    pagIbigEE: number;
    pagIbigER: number;
    withholdingTax: number;
    netEmployeeDeductions: number;
    totalEmployerCost: number;
  };
}

export interface DeMinimisAllowanceRule {
  code: string;
  name: string;
  monthlyLimit: number;
  semiMonthlyLimit: number;
  description: string;
  reference: string;
}

export const OFFICIAL_DEMINIMIS_RULES: DeMinimisAllowanceRule[] = [
  {
    code: 'RICE_SUBSIDY',
    name: 'Rice Subsidy / Allowance',
    monthlyLimit: 2000,
    semiMonthlyLimit: 1000,
    description: 'Up to ₱2,000.00/month or 1 sack of 50-kg rice',
    reference: 'RR 11-2018 / RR 8-2018',
  },
  {
    code: 'UNIFORM_ALLOWANCE',
    name: 'Uniform & Clothing Allowance',
    monthlyLimit: 500, // ₱6,000 per year / 12
    semiMonthlyLimit: 250,
    description: 'Up to ₱6,000.00 per annum (₱500/mo)',
    reference: 'RR 11-2018',
  },
  {
    code: 'LAUNDRY_ALLOWANCE',
    name: 'Laundry Allowance',
    monthlyLimit: 300,
    semiMonthlyLimit: 150,
    description: 'Up to ₱300.00 per month',
    reference: 'RR 11-2018',
  },
  {
    code: 'MEDICAL_CASH_ALLOWANCE',
    name: 'Medical Cash Allowance to Dependents',
    monthlyLimit: 250, // ₱1,500 per semester / 6
    semiMonthlyLimit: 125,
    description: 'Up to ₱1,500.00 per semester (₱250/mo)',
    reference: 'RR 11-2018',
  },
  {
    code: 'MEAL_ALLOWANCE_OT',
    name: 'Daily Meal Allowance for Overtime Work',
    monthlyLimit: 1500,
    semiMonthlyLimit: 750,
    description: 'Not exceeding 25% of the basic minimum wage per OT day',
    reference: 'RR 11-2018',
  },
];

export class StatutoryEngine {
  private static instance: StatutoryEngine | null = null;

  private constructor() {}

  public static getInstance(): StatutoryEngine {
    if (!StatutoryEngine.instance) {
      StatutoryEngine.instance = new StatutoryEngine();
    }
    return StatutoryEngine.instance;
  }

  /**
   * Evaluates allowance for De Minimis exemption limits.
   * Portion within limit is non-taxable; excess is taxable.
   */
  public evaluateAllowanceTaxability(
    allowanceCode: string,
    amount: number,
    payFrequency: PayFrequency = 'Semi-Monthly'
  ): {
    nonTaxableAmount: number;
    taxableAmount: number;
    isDeMinimis: boolean;
    limitApplied: number;
  } {
    const rule = OFFICIAL_DEMINIMIS_RULES.find(
      (r) => r.code === allowanceCode || r.name.toLowerCase().includes(allowanceCode.toLowerCase())
    );

    if (!rule) {
      // Not an official de minimis category: default to 100% taxable unless configured otherwise
      return {
        nonTaxableAmount: 0,
        taxableAmount: amount,
        isDeMinimis: false,
        limitApplied: 0,
      };
    }

    const limit = payFrequency === 'Semi-Monthly' ? rule.semiMonthlyLimit : rule.monthlyLimit;
    const nonTaxableAmount = Math.min(amount, limit);
    const taxableAmount = Math.max(0, amount - limit);

    return {
      nonTaxableAmount,
      taxableAmount,
      isDeMinimis: true,
      limitApplied: limit,
    };
  }

  /**
   * Validates that all statutory rules are active and ready for a given period.
   */
  public async validateStatutoryReadiness(
    companyId: string | null,
    asOfDate: string
  ): Promise<{ isValid: boolean; missingRules: string[] }> {
    const rules = await ruleResolver.resolveAllActiveRules(companyId, asOfDate);
    const requiredCodes = [
      'RULE_SSS_CONTRIBUTION',
      'RULE_PHILHEALTH_CONTRIBUTION',
      'RULE_PAGIBIG_CONTRIBUTION',
      'RULE_WITHHOLDING_TAX',
    ];

    const missingRules = requiredCodes.filter((code) => !rules[code] || rules[code].status !== 'Active');
    return {
      isValid: missingRules.length === 0,
      missingRules,
    };
  }

  /**
   * 1. SSS Mandatory Contribution Computation (RA 11199)
   */
  public computeSSS(
    monthlyComp: number,
    rule: PayrollRule | undefined,
    payFrequency: PayFrequency,
    asOfDate: string,
    eligibility?: StatutoryEligibility
  ): SSSResult {
    if (!rule || rule.status !== 'Active') {
      throw new Error(`[STATUTORY ENGINE ERROR] SSS rule is not configured or inactive for effective date ${asOfDate}.`);
    }

    // Check employee exemption/eligibility
    if (eligibility && eligibility.isSSSEligible === false) {
      return {
        rule,
        msc: 0,
        employeeShare: 0,
        employerShare: 0,
        ecContribution: 0,
        wispEE: 0,
        wispER: 0,
        totalContribution: 0,
        sourceReference: rule.sourceReference || 'RA 11199',
        trace: {
          stepName: 'SSS Statutory Contribution (Exempt)',
          ruleCode: rule.ruleCode,
          ruleVersion: rule.version,
          formula: '0 (Employee marked as SSS Exempt)',
          inputs: { monthlyCompensation: `₱${monthlyComp.toLocaleString()}` },
          parameters: rule.parameters,
          result: 0,
          description: 'Employee is exempt from SSS contributions',
          timestamp: new Date().toISOString(),
        },
      };
    }

    const isSemiMonthly = payFrequency === 'Semi-Monthly';
    const params = rule.parameters || {};
    const minMsc = Number(params.minMsc) || 4000;
    const maxMsc = Number(params.maxMsc) || 30000;
    const eeRate = Number(params.eeRate) || 0.045; // 4.5% standard
    const erRate = Number(params.erRate) || 0.095; // 9.5% standard
    const ecThreshold = Number(params.ecThreshold) || 15000;
    const ecLow = Number(params.ecLow) || 10;
    const ecHigh = Number(params.ecHigh) || 30;
    const wispThreshold = Number(params.wispThreshold) || 20000;

    // Monthly Salary Credit clamped between min and max brackets
    const msc = Math.min(maxMsc, Math.max(minMsc, monthlyComp));

    // Regular SSS base
    const regularMsc = Math.min(wispThreshold, msc);
    const fullMonthlyEE_regular = Number((regularMsc * eeRate).toFixed(2));
    const fullMonthlyER_regular = Number((regularMsc * erRate).toFixed(2));

    // WISP (Workers' Investment and Savings Program) for MSC > ₱20,000
    const wispMsc = Math.max(0, msc - wispThreshold);
    const fullMonthlyEE_wisp = Number((wispMsc * eeRate).toFixed(2));
    const fullMonthlyER_wisp = Number((wispMsc * erRate).toFixed(2));

    const totalFullMonthlyEE = fullMonthlyEE_regular + fullMonthlyEE_wisp;
    const totalFullMonthlyER = fullMonthlyER_regular + fullMonthlyER_wisp;

    // Employees' Compensation (EC) Fund (Employer-only)
    const monthlyEC = msc >= ecThreshold ? ecHigh : ecLow;

    // Split per cutoff
    const divisor = isSemiMonthly ? 2 : 1;
    const employeeShare = Number((totalFullMonthlyEE / divisor).toFixed(2));
    const employerShare = Number((totalFullMonthlyER / divisor).toFixed(2));
    const ecContribution = Number((monthlyEC / divisor).toFixed(2));
    const wispEE = Number((fullMonthlyEE_wisp / divisor).toFixed(2));
    const wispER = Number((fullMonthlyER_wisp / divisor).toFixed(2));
    const totalContribution = Number((employeeShare + employerShare + ecContribution).toFixed(2));

    const sourceRef = rule.sourceReference || 'Republic Act No. 11199 (Social Security Act of 2018) & SSS Circular 2024-001';

    const trace: CalculationTraceStep = {
      stepName: 'SSS Statutory Contribution',
      ruleCode: rule.ruleCode,
      ruleVersion: rule.version,
      formula: rule.formula || 'MSC * (EE Rate + ER Rate) + EC Fund',
      inputs: {
        monthlyCompensation: `₱${monthlyComp.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        clampedMSC: `₱${msc.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        payFrequency,
      },
      parameters: {
        eeRate: `${(eeRate * 100).toFixed(1)}%`,
        erRate: `${(erRate * 100).toFixed(1)}%`,
        minMsc,
        maxMsc,
        wispThreshold,
        ecLow,
        ecHigh,
        sourceReference: sourceRef,
      },
      result: employeeShare,
      description: `SSS Contribution under ${sourceRef} (EE Share: ₱${employeeShare.toFixed(2)} | ER Share: ₱${employerShare.toFixed(2)} | EC Fund: ₱${ecContribution.toFixed(2)})`,
      timestamp: new Date().toISOString(),
    };

    return {
      rule,
      msc,
      employeeShare,
      employerShare,
      ecContribution,
      wispEE,
      wispER,
      totalContribution,
      sourceReference: sourceRef,
      trace,
    };
  }

  /**
   * 2. PhilHealth Universal Healthcare Premium (RA 11223)
   */
  public computePhilHealth(
    monthlyComp: number,
    rule: PayrollRule | undefined,
    payFrequency: PayFrequency,
    asOfDate: string,
    eligibility?: StatutoryEligibility
  ): PhilHealthResult {
    if (!rule || rule.status !== 'Active') {
      throw new Error(`[STATUTORY ENGINE ERROR] PhilHealth rule is not configured or inactive for effective date ${asOfDate}.`);
    }

    if (eligibility && eligibility.isPhilHealthEligible === false) {
      return {
        rule,
        cappedCompensation: 0,
        totalPremium: 0,
        employeeShare: 0,
        employerShare: 0,
        sourceReference: rule.sourceReference || 'RA 11223',
        trace: {
          stepName: 'PhilHealth Universal Healthcare Premium (Exempt)',
          ruleCode: rule.ruleCode,
          ruleVersion: rule.version,
          formula: '0 (Employee marked as PhilHealth Exempt)',
          inputs: { monthlyCompensation: `₱${monthlyComp.toLocaleString()}` },
          parameters: rule.parameters,
          result: 0,
          description: 'Employee is exempt from PhilHealth premium',
          timestamp: new Date().toISOString(),
        },
      };
    }

    const isSemiMonthly = payFrequency === 'Semi-Monthly';
    const params = rule.parameters || {};
    const totalRate = Number(params.totalRate) || 0.05; // 5.0% Universal Health Care Act
    const incomeFloor = Number(params.incomeFloor) || 10000;
    const incomeCeiling = Number(params.incomeCeiling) || 100000;
    const eeSplit = Number(params.eeSplit) || 0.5; // 50% Employee share
    const erSplit = Number(params.erSplit) || 0.5; // 50% Employer share

    const cappedCompensation = Math.min(incomeCeiling, Math.max(incomeFloor, monthlyComp));
    const fullMonthlyPremium = Number((cappedCompensation * totalRate).toFixed(2));
    const fullMonthlyEE = Number((fullMonthlyPremium * eeSplit).toFixed(2));
    const fullMonthlyER = Number((fullMonthlyPremium * erSplit).toFixed(2));

    const divisor = isSemiMonthly ? 2 : 1;
    const employeeShare = Number((fullMonthlyEE / divisor).toFixed(2));
    const employerShare = Number((fullMonthlyER / divisor).toFixed(2));
    const totalPremium = Number((employeeShare + employerShare).toFixed(2));

    const sourceRef = rule.sourceReference || 'Republic Act No. 11223 (Universal Health Care Act)';

    const trace: CalculationTraceStep = {
      stepName: 'PhilHealth Universal Healthcare Premium',
      ruleCode: rule.ruleCode,
      ruleVersion: rule.version,
      formula: rule.formula || 'min(maxPremium, max(minPremium, monthlyCompensation * totalRate)) * eeSplit',
      inputs: {
        monthlyCompensation: `₱${monthlyComp.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        cappedCompensation: `₱${cappedCompensation.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        payFrequency,
      },
      parameters: {
        totalRate: `${(totalRate * 100).toFixed(1)}%`,
        incomeFloor,
        incomeCeiling,
        eeSplit: `${(eeSplit * 100).toFixed(0)}%`,
        erSplit: `${(erSplit * 100).toFixed(0)}%`,
        sourceReference: sourceRef,
      },
      result: employeeShare,
      description: `PhilHealth 5.0% Premium under ${sourceRef} (EE Share: ₱${employeeShare.toFixed(2)} | ER Share: ₱${employerShare.toFixed(2)})`,
      timestamp: new Date().toISOString(),
    };

    return {
      rule,
      cappedCompensation,
      totalPremium,
      employeeShare,
      employerShare,
      sourceReference: sourceRef,
      trace,
    };
  }

  /**
   * 3. Pag-IBIG / HDMF Mandatory Contribution (RA 9679 & Circular 460)
   */
  public computePagIbig(
    monthlyComp: number,
    rule: PayrollRule | undefined,
    payFrequency: PayFrequency,
    asOfDate: string,
    eligibility?: StatutoryEligibility
  ): PagIbigResult {
    if (!rule || rule.status !== 'Active') {
      throw new Error(`[STATUTORY ENGINE ERROR] Pag-IBIG rule is not configured or inactive for effective date ${asOfDate}.`);
    }

    if (eligibility && eligibility.isPagIbigEligible === false) {
      return {
        rule,
        employeeShare: 0,
        employerShare: 0,
        totalContribution: 0,
        sourceReference: rule.sourceReference || 'RA 9679',
        trace: {
          stepName: 'Pag-IBIG Mandatory Contribution (Exempt)',
          ruleCode: rule.ruleCode,
          ruleVersion: rule.version,
          formula: '0 (Employee marked as Pag-IBIG Exempt)',
          inputs: { monthlyCompensation: `₱${monthlyComp.toLocaleString()}` },
          parameters: rule.parameters,
          result: 0,
          description: 'Employee is exempt from Pag-IBIG contributions',
          timestamp: new Date().toISOString(),
        },
      };
    }

    const isSemiMonthly = payFrequency === 'Semi-Monthly';
    const params = rule.parameters || {};
    const eeRate = Number(params.eeRate) || 0.02; // 2%
    const erRate = Number(params.erRate) || 0.02; // 2%
    const maxEEContribution = Number(params.maxEEContribution) || 200; // ₱200 statutory cap
    const maxERContribution = Number(params.maxERContribution) || 200; // ₱200 statutory cap

    const fullMonthlyEE = Math.min(maxEEContribution, Number((monthlyComp * eeRate).toFixed(2)));
    const fullMonthlyER = Math.min(maxERContribution, Number((monthlyComp * erRate).toFixed(2)));

    const divisor = isSemiMonthly ? 2 : 1;
    const employeeShare = Number((fullMonthlyEE / divisor).toFixed(2));
    const employerShare = Number((fullMonthlyER / divisor).toFixed(2));
    const totalContribution = Number((employeeShare + employerShare).toFixed(2));

    const sourceRef = rule.sourceReference || 'Republic Act No. 9679 & HDMF Circular No. 460';

    const trace: CalculationTraceStep = {
      stepName: 'Pag-IBIG Mandatory Contribution',
      ruleCode: rule.ruleCode,
      ruleVersion: rule.version,
      formula: rule.formula || 'min(maxEEContribution, monthlyCompensation * eeRate)',
      inputs: {
        monthlyCompensation: `₱${monthlyComp.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        payFrequency,
      },
      parameters: {
        eeRate: `${(eeRate * 100).toFixed(1)}%`,
        erRate: `${(erRate * 100).toFixed(1)}%`,
        maxMonthlyEECap: `₱${maxEEContribution}`,
        maxMonthlyERCap: `₱${maxERContribution}`,
        sourceReference: sourceRef,
      },
      result: employeeShare,
      description: `Pag-IBIG Contribution under ${sourceRef} (EE Share: ₱${employeeShare.toFixed(2)} | ER Share: ₱${employerShare.toFixed(2)})`,
      timestamp: new Date().toISOString(),
    };

    return {
      rule,
      employeeShare,
      employerShare,
      totalContribution,
      sourceReference: sourceRef,
      trace,
    };
  }

  /**
   * 4. BIR Withholding Tax (TRAIN Law RA 10963 & RR 11-2018)
   */
  public computeWithholdingTax(
    taxableIncome: number,
    rule: PayrollRule | undefined,
    payFrequency: PayFrequency,
    asOfDate: string,
    eligibility?: StatutoryEligibility
  ): WithholdingTaxResult {
    if (!rule || rule.status !== 'Active') {
      throw new Error(`[STATUTORY ENGINE ERROR] BIR Withholding Tax rule is not configured or inactive for effective date ${asOfDate}.`);
    }

    const sourceRef = rule.sourceReference || 'Republic Act No. 10963 (TRAIN Law) & BIR RR 11-2018';

    // MWE (Minimum Wage Earner) exemption check (RA 9504 & TRAIN Law)
    if (eligibility && (eligibility.isMinimumWageEarner === true || eligibility.isTaxEligible === false)) {
      return {
        rule,
        taxableIncome,
        withholdingTax: 0,
        bracketMatched: { min: 0, max: 9999999, baseTax: 0, excessRate: 0, description: 'MWE Statutory Tax Exemption' },
        excessAmount: 0,
        isMWEExempt: true,
        sourceReference: sourceRef,
        trace: {
          stepName: 'BIR Withholding Tax (MWE Tax-Exempt)',
          ruleCode: rule.ruleCode,
          ruleVersion: rule.version,
          formula: '0 (Statutory Exemption under RA 9504 & TRAIN Law)',
          inputs: { taxableIncome: `₱${taxableIncome.toFixed(2)}`, isMinimumWageEarner: 'true' },
          parameters: rule.parameters,
          result: 0,
          description: 'Employee is classified as a Minimum Wage Earner (MWE) exempt from withholding tax',
          timestamp: new Date().toISOString(),
        },
      };
    }

    const params = rule.parameters || {};
    const brackets = (payFrequency === 'Monthly' ? params.monthlyBrackets : params.semiMonthlyBrackets) || [];

    if (!Array.isArray(brackets) || brackets.length === 0) {
      throw new Error(`[STATUTORY ENGINE ERROR] No tax brackets found in BIR Withholding Tax rule parameters.`);
    }

    let matchingBracket = brackets[0];
    for (const b of brackets) {
      if (taxableIncome >= b.min && taxableIncome <= b.max) {
        matchingBracket = b;
        break;
      }
    }

    let withholdingTax = 0;
    let excessAmount = 0;
    if (matchingBracket && matchingBracket.excessRate > 0) {
      excessAmount = Math.max(0, taxableIncome - (matchingBracket.min > 0 ? matchingBracket.min - 0.01 : 0));
      withholdingTax = Number((matchingBracket.baseTax + excessAmount * matchingBracket.excessRate).toFixed(2));
    }

    const trace: CalculationTraceStep = {
      stepName: 'BIR Withholding Tax Computation',
      ruleCode: rule.ruleCode,
      ruleVersion: rule.version,
      formula: rule.formula || 'taxableIncome <= bracketMin ? baseTax : (baseTax + (taxableIncome - bracketMin) * excessRate)',
      inputs: {
        taxableIncome: `₱${taxableIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        payFrequency,
      },
      parameters: {
        matchedBracketMin: `₱${matchingBracket?.min || 0}`,
        matchedBracketMax: `₱${matchingBracket?.max || 'No limit'}`,
        baseTax: `₱${matchingBracket?.baseTax || 0}`,
        excessRate: `${((matchingBracket?.excessRate || 0) * 100).toFixed(0)}%`,
        excessTaxableAmount: `₱${excessAmount.toFixed(2)}`,
        sourceReference: sourceRef,
      },
      result: withholdingTax,
      description: `BIR Graduated Withholding Tax under ${sourceRef} on taxable net income of ₱${taxableIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      timestamp: new Date().toISOString(),
    };

    return {
      rule,
      taxableIncome,
      withholdingTax,
      bracketMatched: matchingBracket,
      excessAmount,
      isMWEExempt: false,
      sourceReference: sourceRef,
      trace,
    };
  }

  /**
   * 5. Orchestrated Full Statutory & Tax Calculation Suite
   */
  public async computeStatutoryAndTax(
    input: StatutoryComputationInput
  ): Promise<StatutoryEngineResult> {
    const rules = input.customRules || (await ruleResolver.resolveAllActiveRules(input.companyId, input.asOfDate));

    const sssRule = rules['RULE_SSS_CONTRIBUTION'];
    const phRule = rules['RULE_PHILHEALTH_CONTRIBUTION'];
    const hdmfRule = rules['RULE_PAGIBIG_CONTRIBUTION'];
    const whtRule = rules['RULE_WITHHOLDING_TAX'];

    // 1. Calculate Statutory contributions with eligibility awareness
    const sss = this.computeSSS(input.monthlyCompensation, sssRule, input.payFrequency, input.asOfDate, input.eligibility);
    const philHealth = this.computePhilHealth(input.monthlyCompensation, phRule, input.payFrequency, input.asOfDate, input.eligibility);
    const pagIbig = this.computePagIbig(input.monthlyCompensation, hdmfRule, input.payFrequency, input.asOfDate, input.eligibility);

    const totalEmployeeStatutoryDeductions = Number(
      (sss.employeeShare + philHealth.employeeShare + pagIbig.employeeShare).toFixed(2)
    );

    // 2. Taxable Income: Gross Taxable Earnings - Attendance Deductions - Employee Statutory Contributions
    const taxableIncome = Math.max(
      0,
      Number((input.grossTaxableEarnings - input.attendanceDeductions - totalEmployeeStatutoryDeductions).toFixed(2))
    );

    // 3. Withholding Tax on Net Taxable Income
    const tax = this.computeWithholdingTax(taxableIncome, whtRule, input.payFrequency, input.asOfDate, input.eligibility);

    const totalEmployerContributions = Number(
      (sss.employerShare + sss.ecContribution + philHealth.employerShare + pagIbig.employerShare).toFixed(2)
    );

    // Line items for Payslip
    const lineItems: PayslipLineItem[] = [
      {
        code: 'STAT_SSS_EE',
        name: 'SSS Employee Contribution',
        category: 'Statutory',
        amount: sss.employeeShare,
        isTaxable: false,
        ruleCode: sss.rule.ruleCode,
        ruleVersion: sss.rule.version,
        explanation: `${sss.sourceReference} (MSC: ₱${sss.msc.toLocaleString()})`,
      },
      {
        code: 'STAT_PHILHEALTH_EE',
        name: 'PhilHealth Employee Premium',
        category: 'Statutory',
        amount: philHealth.employeeShare,
        isTaxable: false,
        ruleCode: philHealth.rule.ruleCode,
        ruleVersion: philHealth.rule.version,
        explanation: `${philHealth.sourceReference} (5.0% UHC Act)`,
      },
      {
        code: 'STAT_PAGIBIG_EE',
        name: 'Pag-IBIG Employee Contribution',
        category: 'Statutory',
        amount: pagIbig.employeeShare,
        isTaxable: false,
        ruleCode: pagIbig.rule.ruleCode,
        ruleVersion: pagIbig.rule.version,
        explanation: `${pagIbig.sourceReference} (HDMF Circular 460)`,
      },
    ];

    if (tax.withholdingTax > 0 || tax.isMWEExempt) {
      lineItems.push({
        code: 'TAX_WHT',
        name: tax.isMWEExempt ? 'BIR Withholding Tax (MWE Exempt)' : 'BIR Withholding Tax',
        category: 'Tax',
        amount: tax.withholdingTax,
        isTaxable: false,
        ruleCode: tax.rule.ruleCode,
        ruleVersion: tax.rule.version,
        explanation: tax.isMWEExempt 
          ? 'Minimum Wage Earner Tax Exemption (RA 9504)'
          : `${tax.sourceReference} on Taxable Income ₱${taxableIncome.toLocaleString()}`,
      });
    }

    const appliedRuleVersions: Record<string, number> = {
      [sss.rule.ruleCode]: sss.rule.version,
      [philHealth.rule.ruleCode]: philHealth.rule.version,
      [pagIbig.rule.ruleCode]: pagIbig.rule.version,
      [tax.rule.ruleCode]: tax.rule.version,
    };

    return {
      sss,
      philHealth,
      pagIbig,
      tax,
      grossTaxableEarnings: input.grossTaxableEarnings,
      attendanceDeductions: input.attendanceDeductions,
      totalEmployeeStatutoryDeductions,
      taxableIncome,
      totalEmployerContributions,
      lineItems,
      traces: [sss.trace, philHealth.trace, pagIbig.trace, tax.trace],
      appliedRuleVersions,
    };
  }

  /**
   * 6. Simulation / What-If Scenario Comparator for Draft Rules
   */
  public async simulateComparison(
    input: StatutorySimulationInput
  ): Promise<StatutorySimulationComparison> {
    const today = new Date().toISOString().split('T')[0];
    const frequency = input.payFrequency || 'Semi-Monthly';

    // Active baseline computation
    const activeResult = await this.computeStatutoryAndTax({
      companyId: null,
      asOfDate: today,
      payFrequency: frequency,
      monthlyCompensation: input.monthlyCompensation,
      grossTaxableEarnings: input.grossTaxableEarnings,
      attendanceDeductions: input.attendanceDeductions,
      eligibility: input.eligibility,
      customRules: input.activeRules,
    });

    // Merged rules for simulated scenario
    const mergedRules = { ...input.activeRules };
    for (const [code, draftRule] of Object.entries(input.draftRules)) {
      if (draftRule) {
        mergedRules[code] = {
          ...mergedRules[code],
          ...draftRule,
          status: 'Active', // temporary elevation for simulation sandbox only
        } as PayrollRule;
      }
    }

    const simulatedResult = await this.computeStatutoryAndTax({
      companyId: null,
      asOfDate: today,
      payFrequency: frequency,
      monthlyCompensation: input.monthlyCompensation,
      grossTaxableEarnings: input.grossTaxableEarnings,
      attendanceDeductions: input.attendanceDeductions,
      eligibility: input.eligibility,
      customRules: mergedRules,
    });

    const variance = {
      sssEE: Number((simulatedResult.sss.employeeShare - activeResult.sss.employeeShare).toFixed(2)),
      sssER: Number((simulatedResult.sss.employerShare - activeResult.sss.employerShare).toFixed(2)),
      philHealthEE: Number((simulatedResult.philHealth.employeeShare - activeResult.philHealth.employeeShare).toFixed(2)),
      philHealthER: Number((simulatedResult.philHealth.employerShare - activeResult.philHealth.employerShare).toFixed(2)),
      pagIbigEE: Number((simulatedResult.pagIbig.employeeShare - activeResult.pagIbig.employeeShare).toFixed(2)),
      pagIbigER: Number((simulatedResult.pagIbig.employerShare - activeResult.pagIbig.employerShare).toFixed(2)),
      withholdingTax: Number((simulatedResult.tax.withholdingTax - activeResult.tax.withholdingTax).toFixed(2)),
      netEmployeeDeductions: Number(
        ((simulatedResult.totalEmployeeStatutoryDeductions + simulatedResult.tax.withholdingTax) -
         (activeResult.totalEmployeeStatutoryDeductions + activeResult.tax.withholdingTax)).toFixed(2)
      ),
      totalEmployerCost: Number((simulatedResult.totalEmployerContributions - activeResult.totalEmployerContributions).toFixed(2)),
    };

    return {
      active: activeResult,
      simulated: simulatedResult,
      variance,
    };
  }
}

export const statutoryEngine = StatutoryEngine.getInstance();

/**
 * Default Philippine Payroll Calculation Rules (Version 1)
 * Standard Statutory tables and DOLE labor standards compliant
 * Based on official regulatory references: RA 11199, RA 11223, RA 9679, RA 10963
 */

import { PayrollRule } from '../../db/schema';

export const DEFAULT_PAYROLL_RULES: PayrollRule[] = [
  // 1. Basic Pay Rule
  {
    id: 'rule_basic_pay_v1',
    companyId: null, // Global default
    ruleCode: 'RULE_BASIC_PAY',
    ruleName: 'Standard Semi-Monthly Basic Pay',
    category: 'Basic Pay',
    description: 'Computes semi-monthly basic pay: Monthly Rate divided by semiMonthlyDivisor (2), or Daily Rate multiplied by Days Worked',
    formula: 'rateBasis === "Daily" ? (dailyRate * daysWorked) : (monthlyRate / semiMonthlyDivisor)',
    parameters: {
      semiMonthlyDivisor: 2,
    },
    sourceReference: 'DOLE Handbook on Statutory Monetary Benefits (2024 Edition)',
    effectiveDate: '2026-01-01',
    endDate: '9999-12-31',
    version: 1,
    priority: 10,
    status: 'Active',
    createdBy: 'System Provisioning',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },

  // 2. Regular Overtime Rule (DOLE 125%)
  {
    id: 'rule_reg_ot_v1',
    companyId: null,
    ruleCode: 'RULE_REGULAR_OT',
    ruleName: 'Standard Regular Overtime (125%)',
    category: 'Overtime',
    description: 'Overtime rendered on a regular working day: Hourly Rate × OT Hours × regularOTMultiplier (1.25)',
    formula: 'hourlyRate * overtimeHours * regularOTMultiplier',
    parameters: {
      regularOTMultiplier: 1.25, // 125% regular OT premium
    },
    sourceReference: 'Labor Code of the Philippines, Presidential Decree No. 442, Article 87',
    effectiveDate: '2026-01-01',
    endDate: '9999-12-31',
    version: 1,
    priority: 20,
    status: 'Active',
    createdBy: 'System Provisioning',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },

  // 3. Night Shift Differential (DOLE 10%)
  {
    id: 'rule_night_diff_v1',
    companyId: null,
    ruleCode: 'RULE_NIGHT_DIFF',
    ruleName: 'Night Shift Differential (10%)',
    category: 'Night Differential',
    description: 'Work performed between 10:00 PM and 6:00 AM: Hourly Rate × Night Hours × nightDiffRate (0.10)',
    formula: 'hourlyRate * nightHours * nightDiffRate',
    parameters: {
      nightDiffRate: 0.10, // 10% Night Diff rate
    },
    sourceReference: 'Labor Code of the Philippines, Presidential Decree No. 442, Article 86',
    effectiveDate: '2026-01-01',
    endDate: '9999-12-31',
    version: 1,
    priority: 30,
    status: 'Active',
    createdBy: 'System Provisioning',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },

  // 4. Late Deduction Rule
  {
    id: 'rule_late_deduct_v1',
    companyId: null,
    ruleCode: 'RULE_LATE_DEDUCTION',
    ruleName: 'Tardiness Deduction by Minute',
    category: 'Late',
    description: 'Tardiness deduction: (Hourly Rate / 60) × lateMinutes × latePenaltyMultiplier',
    formula: '(hourlyRate / 60) * lateMinutes * latePenaltyMultiplier',
    parameters: {
      latePenaltyMultiplier: 1.0,
      gracePeriodMinutes: 0,
    },
    sourceReference: 'DOLE Department Advisory No. 01 Series of 2014 & Company Policy Guidelines',
    effectiveDate: '2026-01-01',
    endDate: '9999-12-31',
    version: 1,
    priority: 40,
    status: 'Active',
    createdBy: 'System Provisioning',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },

  // 5. Undertime Deduction Rule
  {
    id: 'rule_undertime_deduct_v1',
    companyId: null,
    ruleCode: 'RULE_UNDERTIME_DEDUCTION',
    ruleName: 'Undertime Deduction by Minute',
    category: 'Undertime',
    description: 'Undertime deduction: (Hourly Rate / 60) × undertimeMinutes',
    formula: '(hourlyRate / 60) * undertimeMinutes',
    parameters: {},
    sourceReference: 'Labor Code of the Philippines, Article 88 (Undertime not offset by overtime)',
    effectiveDate: '2026-01-01',
    endDate: '9999-12-31',
    version: 1,
    priority: 45,
    status: 'Active',
    createdBy: 'System Provisioning',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },

  // 6. SSS Mandatory Contribution Schedule (RA 11199)
  {
    id: 'rule_sss_v1',
    companyId: null,
    ruleCode: 'RULE_SSS_CONTRIBUTION',
    ruleName: 'SSS Mandatory Contribution Schedule (RA 11199)',
    category: 'SSS',
    description: 'Computes Employee & Employer SSS contribution based on monthly salary credit brackets with 14% total rate (4.5% EE / 9.5% ER) and EC fund',
    formula: 'monthlyCompensation <= minMsc ? minEE : min(maxEE, monthlyCompensation * eeRate)',
    parameters: {
      minMsc: 4000,
      maxMsc: 30000,
      eeRate: 0.045, // 4.5% Employee Share
      erRate: 0.095, // 9.5% Employer Share
      ecThreshold: 15000,
      ecLow: 10, // ₱10 for MSC < 15,000
      ecHigh: 30, // ₱30 for MSC >= 15,000
      wispThreshold: 20000, // WISP applies for MSC > 20,000
    },
    sourceReference: 'Republic Act No. 11199 (Social Security Act of 2018) & SSS Circular No. 2024-001',
    effectiveDate: '2026-01-01',
    endDate: '9999-12-31',
    version: 1,
    priority: 50,
    status: 'Active',
    createdBy: 'System Provisioning',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },

  // 7. PhilHealth Universal Healthcare Premium (5.0% UHC Act)
  {
    id: 'rule_philhealth_v1',
    companyId: null,
    ruleCode: 'RULE_PHILHEALTH_CONTRIBUTION',
    ruleName: 'PhilHealth Universal Healthcare Premium (5.0%)',
    category: 'PhilHealth',
    description: 'Computes 5.0% monthly premium split 50-50 between Employee and Employer with ₱10,000 floor and ₱100,000 ceiling',
    formula: 'min(maxPremium, max(minPremium, monthlyCompensation * totalRate)) / 2',
    parameters: {
      totalRate: 0.05, // 5.0% total premium rate
      incomeFloor: 10000,
      incomeCeiling: 100000,
      minPremium: 500, // 10,000 * 0.05
      maxPremium: 5000, // 100,000 * 0.05
      eeSplit: 0.5, // 50% Employee share
      erSplit: 0.5, // 50% Employer share
    },
    sourceReference: 'Republic Act No. 11223 (Universal Health Care Act) & PhilHealth Circular No. 2024-0001',
    effectiveDate: '2026-01-01',
    endDate: '9999-12-31',
    version: 1,
    priority: 60,
    status: 'Active',
    createdBy: 'System Provisioning',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },

  // 8. Pag-IBIG / HDMF Mandatory Contribution (HDMF Circular 460 Standard)
  {
    id: 'rule_pagibig_v1',
    companyId: null,
    ruleCode: 'RULE_PAGIBIG_CONTRIBUTION',
    ruleName: 'Pag-IBIG / HDMF Mandatory Contribution (₱200 Statutory Cap)',
    category: 'Pag-IBIG',
    description: 'Standard 2% contribution with ₱200 statutory monthly cap for Employee and ₱200 for Employer under HDMF Circular 460',
    formula: 'min(maxEEContribution, monthlyCompensation * eeRate)',
    parameters: {
      eeRate: 0.02, // 2% Employee rate
      erRate: 0.02, // 2% Employer rate
      maxEEContribution: 200, // ₱200 statutory monthly cap
      maxERContribution: 200, // ₱200 statutory monthly cap
      salaryCapThreshold: 10000, // 2% of 10,000 = 200
    },
    sourceReference: 'Republic Act No. 9679 (HDMF Law of 2009) & HDMF Circular No. 460 (Feb 2024)',
    effectiveDate: '2026-01-01',
    endDate: '9999-12-31',
    version: 1,
    priority: 70,
    status: 'Active',
    createdBy: 'System Provisioning',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },

  // 9. BIR Revised Graduated Withholding Tax Table (TRAIN Law RR 11-2018)
  {
    id: 'rule_wht_v1',
    companyId: null,
    ruleCode: 'RULE_WITHHOLDING_TAX',
    ruleName: 'BIR Revised Withholding Tax Table (Semi-Monthly & Monthly)',
    category: 'Withholding Tax',
    description: 'Computes graduated withholding tax on taxable net income after statutory deductions pursuant to the TRAIN Law',
    formula: 'taxableIncome <= 10417 ? 0 : taxableIncome <= 16666 ? ((taxableIncome - 10417) * 0.15) : taxableIncome <= 33333 ? (937.5 + (taxableIncome - 16667) * 0.20) : taxableIncome <= 83333 ? (4270.83 + (taxableIncome - 33333) * 0.25) : taxableIncome <= 333333 ? (16770.83 + (taxableIncome - 83333) * 0.30) : (91770.83 + (taxableIncome - 333333) * 0.35)',
    parameters: {
      semiMonthlyBrackets: [
        { min: 0, max: 10417, baseTax: 0, excessRate: 0.0, description: '₱10,417 and below: 0.00' },
        { min: 10417.01, max: 16666, baseTax: 0, excessRate: 0.15, description: '₱10,417.01 - ₱16,666: 15% over ₱10,417' },
        { min: 16666.01, max: 33333, baseTax: 937.5, excessRate: 0.20, description: '₱16,666.01 - ₱33,333: ₱937.50 + 20% over ₱16,667' },
        { min: 33333.01, max: 83333, baseTax: 4270.83, excessRate: 0.25, description: '₱33,333.01 - ₱83,333: ₱4,270.83 + 25% over ₱33,333' },
        { min: 83333.01, max: 333333, baseTax: 16770.83, excessRate: 0.30, description: '₱83,333.01 - ₱333,333: ₱16,770.83 + 30% over ₱83,333' },
        { min: 333333.01, max: 99999999, baseTax: 91770.83, excessRate: 0.35, description: 'Over ₱333,333: ₱91,770.83 + 35% over ₱333,333' },
      ],
      monthlyBrackets: [
        { min: 0, max: 20833, baseTax: 0, excessRate: 0.0, description: '₱20,833 and below: 0.00' },
        { min: 20833.01, max: 33333, baseTax: 0, excessRate: 0.15, description: '₱20,833.01 - ₱33,333: 15% over ₱20,833' },
        { min: 33333.01, max: 66667, baseTax: 1875.00, excessRate: 0.20, description: '₱33,333.01 - ₱66,667: ₱1,875.00 + 20% over ₱33,333' },
        { min: 66667.01, max: 166667, baseTax: 8541.80, excessRate: 0.25, description: '₱66,667.01 - ₱166,667: ₱8,541.80 + 25% over ₱66,667' },
        { min: 166667.01, max: 666667, baseTax: 33541.80, excessRate: 0.30, description: '₱166,667.01 - ₱666,667: ₱33,541.80 + 30% over ₱166,667' },
        { min: 666667.01, max: 99999999, baseTax: 183541.80, excessRate: 0.35, description: 'Over ₱666,667: ₱183,541.80 + 35% over ₱666,667' },
      ],
    },
    sourceReference: 'Republic Act No. 10963 (TRAIN Law) & BIR Revenue Regulations No. 11-2018',
    effectiveDate: '2026-01-01',
    endDate: '9999-12-31',
    version: 1,
    priority: 80,
    status: 'Active',
    createdBy: 'System Provisioning',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

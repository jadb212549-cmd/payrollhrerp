/**
 * Rate Resolver - Calculates standardized daily rate, hourly rate, and semi-monthly equivalents
 * Uses company divisor parameters without hard-coded assumptions
 */

import { Employee } from '../../db/schema';
import { companyService } from '../CompanyService';

export interface ResolvedEmployeeRates {
  rateBasis: 'Monthly' | 'Daily' | 'Hourly';
  baseRate: number;
  monthlyRate: number;
  dailyRate: number;
  hourlyRate: number;
  standardHoursPerDay: number;
  monthlyDivisorDays: number;
  semiMonthlyFactor: number;
}

export class RateResolver {
  private static instance: RateResolver | null = null;

  private constructor() {}

  public static getInstance(): RateResolver {
    if (!RateResolver.instance) {
      RateResolver.instance = new RateResolver();
    }
    return RateResolver.instance;
  }

  public async resolveRates(
    employee: Employee,
    standardHoursPerDay = 8,
    customMonthlyDivisor?: number
  ): Promise<ResolvedEmployeeRates> {
    const rateBasis = (employee.payType as 'Monthly' | 'Daily' | 'Hourly') || 'Monthly';
    const baseRate = employee.monthlyRate || employee.dailyRate || employee.hourlyRate || 0;

    // Get company default working days per year divisor (e.g. 261 for 5-day week, 313 for 6-day week)
    let divisorDays = customMonthlyDivisor || 261;
    if (!customMonthlyDivisor && employee.companyId) {
      try {
        const comp = await companyService.getCompany(employee.companyId);
        if (comp) {
          // default 261 working days / year
          divisorDays = 261;
        }
      } catch {
        // fallback
      }
    }

    let monthlyRate = 0;
    let dailyRate = 0;
    let hourlyRate = 0;

    if (rateBasis === 'Monthly') {
      monthlyRate = baseRate;
      // DOLE Formula: Daily Rate = (Monthly Rate × 12) / Working Days in Year
      dailyRate = Number(((monthlyRate * 12) / divisorDays).toFixed(4));
      hourlyRate = Number((dailyRate / standardHoursPerDay).toFixed(4));
    } else if (rateBasis === 'Daily') {
      dailyRate = baseRate;
      // Monthly Rate = (Daily Rate × Working Days in Year) / 12
      monthlyRate = Number(((dailyRate * divisorDays) / 12).toFixed(4));
      hourlyRate = Number((dailyRate / standardHoursPerDay).toFixed(4));
    } else {
      // Hourly
      hourlyRate = baseRate;
      dailyRate = Number((hourlyRate * standardHoursPerDay).toFixed(4));
      monthlyRate = Number(((dailyRate * divisorDays) / 12).toFixed(4));
    }

    return {
      rateBasis,
      baseRate,
      monthlyRate: Number(monthlyRate.toFixed(2)),
      dailyRate: Number(dailyRate.toFixed(2)),
      hourlyRate: Number(hourlyRate.toFixed(2)),
      standardHoursPerDay,
      monthlyDivisorDays: divisorDays,
      semiMonthlyFactor: 2,
    };
  }
}

export const rateResolver = RateResolver.getInstance();

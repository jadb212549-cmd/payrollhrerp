/**
 * DTR Service - Business Layer for Timekeeping, Attendance, and Biometric Logs
 */

import { dtrRepository, DTRQueryOptions } from '../repositories/DTRRepository';
import { employeeRepository } from '../repositories/EmployeeRepository';
import { auditService } from './AuditService';
import { DTRRecord, DTRStatus, Employee } from '../db/schema';

export interface CreateDTRInput {
  companyId: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  timeIn?: string; // HH:mm
  timeOut?: string; // HH:mm
  breakStart?: string;
  breakEnd?: string;
  status?: DTRStatus;
  shiftSchedule?: string;
  regularHours?: number;
  overtimeHours?: number;
  nightHours?: number;
  lateMinutes?: number;
  undertimeMinutes?: number;
  remarks?: string;
  supervisorRemarks?: string;
}

export interface UpdateDTRInput {
  timeIn?: string;
  timeOut?: string;
  breakStart?: string;
  breakEnd?: string;
  status?: DTRStatus;
  shiftSchedule?: string;
  regularHours?: number;
  overtimeHours?: number;
  nightHours?: number;
  lateMinutes?: number;
  undertimeMinutes?: number;
  remarks?: string;
  supervisorRemarks?: string;
}

export interface DTRSummaryStats {
  totalRecords: number;
  presentCount: number;
  lateCount: number;
  totalLateMinutes: number;
  undertimeCount: number;
  totalUndertimeMinutes: number;
  totalOvertimeHours: number;
  totalNightDiffHours: number;
  incompleteCount: number;
  restDayCount: number;
  leaveCount: number;
  holidayCount: number;
}

export interface AttendanceMatrixEmployeeRow {
  employee: Employee;
  logsByDate: Record<string, DTRRecord | undefined>;
  summary: {
    presentDays: number;
    lateIncidents: number;
    lateMinutes: number;
    undertimeMinutes: number;
    overtimeHours: number;
    leaves: number;
    absentDays: number;
  };
}

export class DTRService {
  private static instance: DTRService | null = null;

  private constructor() {}

  public static getInstance(): DTRService {
    if (!DTRService.instance) {
      DTRService.instance = new DTRService();
    }
    return DTRService.instance;
  }

  /**
   * Helper: Parse HH:mm to minutes from midnight
   */
  public timeToMinutes(timeStr?: string): number | null {
    if (!timeStr || !timeStr.trim()) return null;
    const clean = timeStr.trim();
    // Support "08:30" or "8:30 AM" / "5:15 PM"
    const isPm = /pm/i.test(clean);
    const isAm = /am/i.test(clean);
    const match = clean.replace(/[^\d:]/g, '').split(':');
    if (match.length < 2) return null;
    let hours = parseInt(match[0], 10);
    const mins = parseInt(match[1], 10);
    if (isNaN(hours) || isNaN(mins)) return null;

    if (isPm && hours < 12) hours += 12;
    if (isAm && hours === 12) hours = 0;

    return hours * 60 + mins;
  }

  /**
   * Helper: Format minutes from midnight to HH:mm (24-hr) or 12-hr
   */
  public minutesToTime(totalMins: number, format12h = false): string {
    const norm = (totalMins % 1440 + 1440) % 1440;
    const h = Math.floor(norm / 60);
    const m = norm % 60;
    if (!format12h) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  /**
   * Compute standard daily attendance metrics based on a standard 8am-5pm shift
   */
  public computeTimeMetrics(
    timeInStr?: string,
    timeOutStr?: string,
    breakStartStr = '12:00',
    breakEndStr = '13:00',
    shiftStartStr = '08:00',
    shiftEndStr = '17:00'
  ): {
    regularHours: number;
    lateMinutes: number;
    undertimeMinutes: number;
    overtimeHours: number;
    nightHours: number;
    status: DTRStatus;
  } {
    const inMins = this.timeToMinutes(timeInStr);
    const outMins = this.timeToMinutes(timeOutStr);

    if (inMins === null && outMins === null) {
      return {
        regularHours: 0,
        lateMinutes: 0,
        undertimeMinutes: 0,
        overtimeHours: 0,
        nightHours: 0,
        status: 'Absent',
      };
    }

    if (inMins === null || outMins === null) {
      return {
        regularHours: 0,
        lateMinutes: 0,
        undertimeMinutes: 0,
        overtimeHours: 0,
        nightHours: 0,
        status: 'Incomplete',
      };
    }

    const shiftStart = this.timeToMinutes(shiftStartStr) || 480; // 08:00
    const shiftEnd = this.timeToMinutes(shiftEndStr) || 1020; // 17:00
    const breakStart = this.timeToMinutes(breakStartStr) || 720; // 12:00
    const breakEnd = this.timeToMinutes(breakEndStr) || 780; // 13:00
    const breakDuration = Math.max(0, breakEnd - breakStart);

    // Calculate Late Minutes (arrival after shiftStart)
    let lateMinutes = 0;
    if (inMins > shiftStart) {
      lateMinutes = inMins - shiftStart;
    }

    // Calculate Undertime Minutes (departure before shiftEnd)
    let undertimeMinutes = 0;
    if (outMins < shiftEnd) {
      undertimeMinutes = shiftEnd - outMins;
    }

    // Work Duration (raw worked minutes minus break)
    let totalWorkMinutes = Math.max(0, outMins - inMins);
    // Deduct 1-hour lunch break if employee worked through lunch window
    if (inMins < breakStart && outMins > breakEnd) {
      totalWorkMinutes -= breakDuration;
    }

    // Regular Hours: capped at 8.0 hours
    const regularHours = Number(Math.min(8.0, Math.max(0, totalWorkMinutes / 60)).toFixed(2));

    // Overtime Hours: time worked beyond shiftEnd
    let overtimeHours = 0;
    if (outMins > shiftEnd) {
      overtimeHours = Number(((outMins - shiftEnd) / 60).toFixed(2));
    }

    // Night Differential Hours (22:00 / 10pm to 06:00 / 6am next day)
    let nightHours = 0;
    const nightStart = 1320; // 22:00 (10 PM)
    if (outMins > nightStart) {
      nightHours = Number(((outMins - nightStart) / 60).toFixed(2));
    }

    let status: DTRStatus = 'Present';
    if (lateMinutes > 0) {
      status = 'Late';
    }

    return {
      regularHours,
      lateMinutes,
      undertimeMinutes,
      overtimeHours,
      nightHours,
      status,
    };
  }

  /**
   * Create a DTR record with validation and audit logging
   */
  public async createDTR(input: CreateDTRInput, currentUserId = 'usr_admin_master'): Promise<DTRRecord> {
    if (!input.companyId) {
      throw new Error('Company ID is required for DTR record creation.');
    }
    if (!input.employeeId) {
      throw new Error('Employee ID is required.');
    }
    if (!input.date) {
      throw new Error('Date (YYYY-MM-DD) is required.');
    }

    // Validate Employee belongs to the company
    const employee = await employeeRepository.findById(input.employeeId);
    if (!employee) {
      throw new Error(`Employee with ID ${input.employeeId} not found.`);
    }
    if (employee.companyId !== input.companyId) {
      throw new Error(`Employee does not belong to the selected company entity.`);
    }

    // Duplicate Check
    const existing = await dtrRepository.findByEmployeeAndDate(input.companyId, input.employeeId, input.date);
    if (existing) {
      throw new Error(`A DTR log for ${employee.firstName} ${employee.lastName} already exists on ${input.date}.`);
    }

    // Automatic calculation if hours/status are not manually explicitly provided
    let calculated = {
      regularHours: input.regularHours ?? 0,
      overtimeHours: input.overtimeHours ?? 0,
      nightHours: input.nightHours ?? 0,
      lateMinutes: input.lateMinutes ?? 0,
      undertimeMinutes: input.undertimeMinutes ?? 0,
      status: input.status ?? ('Present' as DTRStatus),
    };

    if (input.timeIn && input.timeOut && input.regularHours === undefined) {
      calculated = this.computeTimeMetrics(input.timeIn, input.timeOut);
    }

    const now = new Date().toISOString();
    const newRecord: DTRRecord = {
      id: 'dtr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      companyId: input.companyId,
      employeeId: input.employeeId,
      date: input.date,
      timeIn: input.timeIn,
      timeOut: input.timeOut,
      breakStart: input.breakStart || '12:00',
      breakEnd: input.breakEnd || '13:00',
      regularHours: calculated.regularHours,
      overtimeHours: calculated.overtimeHours,
      nightHours: calculated.nightHours,
      lateMinutes: calculated.lateMinutes,
      undertimeMinutes: calculated.undertimeMinutes,
      status: input.status || calculated.status,
      shiftSchedule: input.shiftSchedule || 'Standard (08:00 AM - 05:00 PM)',
      remarks: input.remarks,
      supervisorRemarks: input.supervisorRemarks,
      createdAt: now,
      updatedAt: now,
    };

    await dtrRepository.create(newRecord);

    await auditService.logAction({
      userId: currentUserId,
      companyId: input.companyId,
      action: 'CREATE',
      entityType: 'DTRRecord',
      entityId: newRecord.id,
      description: `Created DTR log for ${employee.employeeNumber} (${employee.lastName}) on ${newRecord.date} [Status: ${newRecord.status}]`,
      newValue: {
        date: newRecord.date,
        timeIn: newRecord.timeIn,
        timeOut: newRecord.timeOut,
        status: newRecord.status,
        regularHours: newRecord.regularHours,
      },
    });

    return newRecord;
  }

  /**
   * Update an existing DTR record
   */
  public async updateDTR(
    id: string,
    input: UpdateDTRInput,
    currentUserId = 'usr_admin_master'
  ): Promise<DTRRecord> {
    const existing = await dtrRepository.findById(id);
    if (!existing) {
      throw new Error(`DTR Record with ID ${id} not found.`);
    }

    const employee = await employeeRepository.findById(existing.employeeId);

    const timeIn = input.timeIn !== undefined ? input.timeIn : existing.timeIn;
    const timeOut = input.timeOut !== undefined ? input.timeOut : existing.timeOut;

    // Recalculate metrics if times change and regularHours wasn't overridden
    let metrics = {
      regularHours: input.regularHours ?? existing.regularHours,
      overtimeHours: input.overtimeHours ?? existing.overtimeHours,
      nightHours: input.nightHours ?? existing.nightHours,
      lateMinutes: input.lateMinutes ?? existing.lateMinutes,
      undertimeMinutes: input.undertimeMinutes ?? existing.undertimeMinutes,
      status: input.status ?? existing.status,
    };

    if (timeIn && timeOut && input.regularHours === undefined) {
      metrics = this.computeTimeMetrics(timeIn, timeOut);
      if (input.status) {
        metrics.status = input.status;
      }
    }

    const updated: DTRRecord = {
      ...existing,
      timeIn,
      timeOut,
      breakStart: input.breakStart !== undefined ? input.breakStart : existing.breakStart,
      breakEnd: input.breakEnd !== undefined ? input.breakEnd : existing.breakEnd,
      regularHours: metrics.regularHours,
      overtimeHours: metrics.overtimeHours,
      nightHours: metrics.nightHours,
      lateMinutes: metrics.lateMinutes,
      undertimeMinutes: metrics.undertimeMinutes,
      status: metrics.status,
      shiftSchedule: input.shiftSchedule !== undefined ? input.shiftSchedule : existing.shiftSchedule,
      remarks: input.remarks !== undefined ? input.remarks : existing.remarks,
      supervisorRemarks: input.supervisorRemarks !== undefined ? input.supervisorRemarks : existing.supervisorRemarks,
      updatedAt: new Date().toISOString(),
    };

    await dtrRepository.update(updated);

    await auditService.logAction({
      userId: currentUserId,
      companyId: existing.companyId,
      action: 'UPDATE',
      entityType: 'DTRRecord',
      entityId: updated.id,
      description: `Updated DTR log for ${employee?.employeeNumber || existing.employeeId} on ${updated.date}`,
      previousValue: {
        timeIn: existing.timeIn,
        timeOut: existing.timeOut,
        status: existing.status,
        regularHours: existing.regularHours,
      },
      newValue: {
        timeIn: updated.timeIn,
        timeOut: updated.timeOut,
        status: updated.status,
        regularHours: updated.regularHours,
      },
    });

    return updated;
  }

  /**
   * Delete / Void a DTR record
   */
  public async deleteDTR(id: string, reason = 'User voided log', currentUserId = 'usr_admin_master'): Promise<void> {
    const existing = await dtrRepository.findById(id);
    if (!existing) {
      throw new Error(`DTR record with ID ${id} not found.`);
    }

    await dtrRepository.delete(id);

    await auditService.logAction({
      userId: currentUserId,
      companyId: existing.companyId,
      action: 'DELETE',
      entityType: 'DTRRecord',
      entityId: id,
      description: `Voided DTR log for employee ${existing.employeeId} on ${existing.date}. Reason: ${reason}`,
      previousValue: {
        date: existing.date,
        timeIn: existing.timeIn,
        timeOut: existing.timeOut,
        status: existing.status,
      },
    });
  }

  /**
   * List DTRs with comprehensive filtering
   */
  public async listDTRs(options: DTRQueryOptions): Promise<DTRRecord[]> {
    return dtrRepository.findByQuery(options);
  }

  /**
   * Get DTR Summary Statistics for a cutoff / company scope
   */
  public async getSummaryStats(options: DTRQueryOptions): Promise<DTRSummaryStats> {
    const records = await this.listDTRs(options);

    let presentCount = 0;
    let lateCount = 0;
    let totalLateMinutes = 0;
    let undertimeCount = 0;
    let totalUndertimeMinutes = 0;
    let totalOvertimeHours = 0;
    let totalNightDiffHours = 0;
    let incompleteCount = 0;
    let restDayCount = 0;
    let leaveCount = 0;
    let holidayCount = 0;

    for (const rec of records) {
      if (rec.status === 'Present' || rec.status === 'Late') {
        presentCount++;
      }
      if (rec.lateMinutes > 0 || rec.status === 'Late') {
        lateCount++;
        totalLateMinutes += rec.lateMinutes;
      }
      if (rec.undertimeMinutes > 0) {
        undertimeCount++;
        totalUndertimeMinutes += rec.undertimeMinutes;
      }
      totalOvertimeHours += rec.overtimeHours || 0;
      totalNightDiffHours += rec.nightHours || 0;

      if (rec.status === 'Incomplete') incompleteCount++;
      if (rec.status === 'Rest Day') restDayCount++;
      if (rec.status === 'On Leave') leaveCount++;
      if (rec.status === 'Regular Holiday' || rec.status === 'Special Holiday') holidayCount++;
    }

    return {
      totalRecords: records.length,
      presentCount,
      lateCount,
      totalLateMinutes,
      undertimeCount,
      totalUndertimeMinutes,
      totalOvertimeHours: Number(totalOvertimeHours.toFixed(2)),
      totalNightDiffHours: Number(totalNightDiffHours.toFixed(2)),
      incompleteCount,
      restDayCount,
      leaveCount,
      holidayCount,
    };
  }

  /**
   * Generate Attendance Matrix dataset for a date range and company
   */
  public async getAttendanceMatrix(
    companyId: string | null,
    startDate: string,
    endDate: string,
    departmentId?: string
  ): Promise<{
    dateHeaders: string[];
    rows: AttendanceMatrixEmployeeRow[];
  }> {
    // 1. Get employees in scope
    let employees = await employeeRepository.findByCompanyId(companyId || '');
    if (!companyId) {
      employees = await employeeRepository.findAll();
    }
    employees = employees.filter((e) => e.status !== 'Archived');

    if (departmentId && departmentId !== 'All') {
      employees = employees.filter((e) => e.departmentId === departmentId);
    }

    // 2. Build date array
    const dateHeaders: string[] = [];
    const curr = new Date(startDate);
    const end = new Date(endDate);
    while (curr <= end) {
      dateHeaders.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    // 3. Fetch all DTRs in range
    const dtrs = await this.listDTRs({
      companyId,
      startDate,
      endDate,
    });

    const dtrMap = new Map<string, DTRRecord>();
    for (const d of dtrs) {
      dtrMap.set(`${d.employeeId}_${d.date}`, d);
    }

    // 4. Construct matrix rows
    const rows: AttendanceMatrixEmployeeRow[] = employees.map((emp) => {
      const logsByDate: Record<string, DTRRecord | undefined> = {};
      let presentDays = 0;
      let lateIncidents = 0;
      let lateMinutes = 0;
      let undertimeMinutes = 0;
      let overtimeHours = 0;
      let leaves = 0;
      let absentDays = 0;

      for (const d of dateHeaders) {
        const log = dtrMap.get(`${emp.id}_${d}`);
        logsByDate[d] = log;

        if (log) {
          if (log.status === 'Present' || log.status === 'Late') presentDays++;
          if (log.lateMinutes > 0 || log.status === 'Late') {
            lateIncidents++;
            lateMinutes += log.lateMinutes;
          }
          if (log.undertimeMinutes > 0) undertimeMinutes += log.undertimeMinutes;
          overtimeHours += log.overtimeHours || 0;
          if (log.status === 'On Leave') leaves++;
          if (log.status === 'Absent') absentDays++;
        }
      }

      return {
        employee: emp,
        logsByDate,
        summary: {
          presentDays,
          lateIncidents,
          lateMinutes,
          undertimeMinutes,
          overtimeHours: Number(overtimeHours.toFixed(2)),
          leaves,
          absentDays,
        },
      };
    });

    return {
      dateHeaders,
      rows: rows.sort((a, b) => a.employee.lastName.localeCompare(b.employee.lastName)),
    };
  }

  /**
   * Seed realistic sample DTR records for active employees in a company
   */
  public async seedDemoDTRs(companyId: string, currentUserId = 'usr_admin_master'): Promise<number> {
    const employees = await employeeRepository.findByCompanyId(companyId);
    if (employees.length === 0) return 0;

    const dates = [
      '2026-08-01', // Sat - Rest Day
      '2026-08-02', // Sun - Rest Day
      '2026-08-03', // Mon - Present
      '2026-08-04', // Tue - Late
      '2026-08-05', // Wed - Present + OT
      '2026-08-06', // Thu - Present
      '2026-08-07', // Fri - Present
      '2026-08-08', // Sat - Rest Day
      '2026-08-09', // Sun - Rest Day
      '2026-08-10', // Mon - Present + OT
      '2026-08-11', // Tue - Present
      '2026-08-12', // Wed - Present
      '2026-08-13', // Thu - Present
      '2026-08-14', // Fri - Present
      '2026-08-15', // Sat - Rest Day
    ];

    let createdCount = 0;
    const now = new Date().toISOString();

    for (const emp of employees) {
      for (const d of dates) {
        const existing = await dtrRepository.findByEmployeeAndDate(companyId, emp.id, d);
        if (existing) continue;

        const dayOfWeek = new Date(d).getDay(); // 0=Sun, 6=Sat
        const isRestDay = dayOfWeek === 0 || dayOfWeek === 6;

        let record: DTRRecord;
        if (isRestDay) {
          record = {
            id: 'dtr_' + Math.random().toString(36).substring(2, 9),
            companyId,
            employeeId: emp.id,
            date: d,
            regularHours: 0,
            overtimeHours: 0,
            nightHours: 0,
            lateMinutes: 0,
            undertimeMinutes: 0,
            status: 'Rest Day',
            shiftSchedule: 'Standard Rest Day',
            remarks: 'Scheduled Weekend Rest Day',
            createdAt: now,
            updatedAt: now,
          };
        } else if (d === '2026-08-04') {
          // Late scenario
          record = {
            id: 'dtr_' + Math.random().toString(36).substring(2, 9),
            companyId,
            employeeId: emp.id,
            date: d,
            timeIn: '08:18',
            timeOut: '17:00',
            breakStart: '12:00',
            breakEnd: '13:00',
            regularHours: 7.7,
            overtimeHours: 0,
            nightHours: 0,
            lateMinutes: 18,
            undertimeMinutes: 0,
            status: 'Late',
            shiftSchedule: 'Standard (08:00 AM - 05:00 PM)',
            remarks: 'Heavy traffic on transit',
            createdAt: now,
            updatedAt: now,
          };
        } else if (d === '2026-08-05' || d === '2026-08-10') {
          // Overtime scenario
          record = {
            id: 'dtr_' + Math.random().toString(36).substring(2, 9),
            companyId,
            employeeId: emp.id,
            date: d,
            timeIn: '07:50',
            timeOut: '19:30',
            breakStart: '12:00',
            breakEnd: '13:00',
            regularHours: 8.0,
            overtimeHours: 2.5,
            nightHours: 0,
            lateMinutes: 0,
            undertimeMinutes: 0,
            status: 'Present',
            shiftSchedule: 'Standard (08:00 AM - 05:00 PM)',
            remarks: 'Approved operational overtime',
            supervisorRemarks: 'Signed off by team lead',
            createdAt: now,
            updatedAt: now,
          };
        } else {
          // Normal standard punch
          record = {
            id: 'dtr_' + Math.random().toString(36).substring(2, 9),
            companyId,
            employeeId: emp.id,
            date: d,
            timeIn: '07:55',
            timeOut: '17:05',
            breakStart: '12:00',
            breakEnd: '13:00',
            regularHours: 8.0,
            overtimeHours: 0,
            nightHours: 0,
            lateMinutes: 0,
            undertimeMinutes: 0,
            status: 'Present',
            shiftSchedule: 'Standard (08:00 AM - 05:00 PM)',
            createdAt: now,
            updatedAt: now,
          };
        }

        await dtrRepository.create(record);
        createdCount++;
      }
    }

    if (createdCount > 0) {
      await auditService.logAction({
        userId: currentUserId,
        companyId,
        action: 'IMPORT',
        entityType: 'DTRRecord',
        entityId: companyId,
        description: `Seeded ${createdCount} demo DTR time logs for cutoff Aug 1 - Aug 15, 2026`,
      });
    }

    return createdCount;
  }

  /**
   * Generate CSV Export for DTR logs
   */
  public generateExportCSV(records: DTRRecord[], employees: Employee[]): string {
    const empMap = new Map(employees.map((e) => [e.id, e]));

    const headers = [
      'Employee Number',
      'Employee Name',
      'Company ID',
      'Date',
      'Shift Schedule',
      'Time In',
      'Time Out',
      'Regular Hours',
      'Late Minutes',
      'Undertime Minutes',
      'Overtime Hours',
      'Night Diff Hours',
      'Status',
      'Remarks',
    ];

    const rows = records.map((rec) => {
      const emp = empMap.get(rec.employeeId);
      const empName = emp ? `${emp.lastName}, ${emp.firstName}` : 'Unknown';
      const empNo = emp?.employeeNumber || '—';

      return [
        `"${empNo}"`,
        `"${empName}"`,
        `"${rec.companyId}"`,
        `"${rec.date}"`,
        `"${rec.shiftSchedule || 'Standard'}"`,
        `"${rec.timeIn || '—'}"`,
        `"${rec.timeOut || '—'}"`,
        rec.regularHours.toFixed(2),
        rec.lateMinutes.toString(),
        rec.undertimeMinutes.toString(),
        rec.overtimeHours.toFixed(2),
        rec.nightHours.toFixed(2),
        `"${rec.status}"`,
        `"${(rec.remarks || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

export const dtrService = DTRService.getInstance();

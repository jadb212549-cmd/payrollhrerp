import React from 'react';
import { WindowInstance } from '../../types';
import { Company, Employee } from '../../db/schema';
import { 
  CompanyListWindow, 
  AddCompanyWindow, 
  CompanySettingsWindow,
  CompanyProfileWindow 
} from '../windows/CompanyWindows';
import { 
  EmployeeListWindow, 
  AddEmployeeWindow, 
  EmployeeProfileWindow,
  DepartmentsWindow, 
  PositionsWindow, 
  EmployeeImportWindow,
  EmployeeDocumentsWindow 
} from '../windows/EmployeeWindows';
import { employeeImportExportService } from '../../services/EmployeeImportExportService';
import { employeeService } from '../../services/EmployeeService';
import { departmentService } from '../../services/DepartmentService';
import { positionService } from '../../services/PositionService';
import { DTRWindow, AttendanceMatrixWindow, OvertimeWindow, LateUndertimeWindow } from '../windows/TimekeepingWindows';
import { PayrollRulesWindow } from '../windows/PayrollRulesWindows';
import { StatutoryRulesWindow } from '../windows/StatutoryRulesWindow';
import { PayrollPeriodsWindow, PayrollProcessingWindow } from '../windows/PayrollProcessingWindows';
import { LeaveRequestsWindow, LeaveBalancesWindow } from '../windows/LeaveWindows';
import { CreatePayrollWindow, PayslipsWindow } from '../windows/PayrollWindows';
import { LoanListWindow, LoanAmortizationWindow } from '../windows/LoanWindows';
import { AllowanceListWindow } from '../windows/AllowanceWindows';
import { 
  ReportCenterWindow,
  PayrollRegisterWindow,
  PayrollSummaryWindow,
  EmployeePayrollReportWindow,
  DeductionsReportWindow,
  OvertimeReportWindow,
  AttendanceReportWindow,
  LeaveReportWindow,
  LoanReportWindow,
  AllowanceReportWindow,
  StatutoryReportWindow,
  PayrollHistoryWindow,
  AuditReportWindow
} from '../windows/ReportWindows';
import { GeneralSettingsWindow, AppearanceSettingsWindow, AboutWindow } from '../windows/SettingWindows';
import { UsersAccessWindow } from '../windows/UsersAccessWindow';
import { BackupRestoreWindow } from '../windows/BackupRestoreWindow';
import { AuditLogsWindow } from '../windows/AuditLogsWindow';
import { SoftwareUpdatesWindow } from '../windows/SoftwareUpdatesWindow';
import { SystemHealthWindow } from '../windows/SystemHealthWindow';
import { DiagnosticsLogsWindow } from '../windows/DiagnosticsLogsWindow';
import { PayrollQADashboardWindow } from '../windows/PayrollQADashboardWindow';
import { PerformanceDiagnosticsWindow } from '../windows/PerformanceDiagnosticsWindow';
import { UATSignoffDashboardWindow } from '../windows/UATSignoffDashboardWindow';
import { DashboardView } from '../windows/DashboardView';

interface WindowContentDispatcherProps {
  window: WindowInstance;
  salaryPrivacy: boolean;
  onOpenWindow: (menuItemId: string, metadata?: Record<string, unknown>) => void;
}

export const WindowContentDispatcher: React.FC<WindowContentDispatcherProps> = ({
  window: win,
  salaryPrivacy,
  onOpenWindow,
}) => {
  switch (win.menuItemId) {
    // Dashboard
    case 'dashboard_overview':
    case 'dashboard_activity':
      return (
        <DashboardView
          onOpenWindow={onOpenWindow}
          salaryPrivacy={salaryPrivacy}
        />
      );

    // Companies
    case 'company_list':
      return (
        <CompanyListWindow
          onOpenAddCompany={() => onOpenWindow('add_company')}
          onOpenCompanyProfile={(company: Company) =>
            onOpenWindow('company_profile', { companyId: company.id, companyCode: company.companyCode, legalName: company.legalName })
          }
          onOpenCompanySettings={() => onOpenWindow('company_settings')}
        />
      );

    case 'company_profile':
      return (
        <CompanyProfileWindow
          companyId={win.metadata?.companyId as string | undefined}
        />
      );

    case 'add_company':
      return (
        <AddCompanyWindow
          onSuccess={(company: Company) => {
            onOpenWindow('company_profile', { companyId: company.id, companyCode: company.companyCode, legalName: company.legalName });
          }}
        />
      );

    case 'company_settings':
    case 'company_holidays':
    case 'company_users':
      return <CompanySettingsWindow />;

    case 'company_payroll_params':
    case 'payroll_rules':
    case 'rule_simulation':
      return <PayrollRulesWindow />;

    // Employees
    case 'employee_list':
      return (
        <EmployeeListWindow
          salaryPrivacy={salaryPrivacy}
          onOpenAddEmployee={() => onOpenWindow('add_employee')}
          onOpenEmployeeProfile={(employee: Employee) =>
            onOpenWindow('employee_profile', {
              employeeId: employee.id,
              employeeNumber: employee.employeeNumber,
              fullName: `${employee.firstName} ${employee.lastName}`,
            })
          }
          onOpenImport={() => onOpenWindow('employee_import')}
          onOpenExport={async () => {
            const list = await employeeService.listEmployees({ status: 'All' });
            const depts = await departmentService.listDepartments();
            const pos = await positionService.listPositions();
            const csv = employeeImportExportService.generateExportCSV(
              list.employees,
              depts,
              pos,
              { includeSalary: !salaryPrivacy, includeStatutory: true }
            );
            employeeImportExportService.triggerDownload(csv, `employee_masterlist_${new Date().toISOString().split('T')[0]}.csv`);
          }}
        />
      );

    case 'employee_profile':
      return (
        <EmployeeProfileWindow
          employeeId={win.metadata?.employeeId as string | undefined}
          salaryPrivacy={salaryPrivacy}
          onOpenEdit={(employee: Employee) =>
            onOpenWindow('edit_employee', {
              employeeId: employee.id,
              employeeNumber: employee.employeeNumber,
              fullName: `${employee.firstName} ${employee.lastName}`,
            })
          }
        />
      );

    case 'add_employee':
      return (
        <AddEmployeeWindow
          salaryPrivacy={salaryPrivacy}
          onSuccess={(employee: Employee) => {
            onOpenWindow('employee_profile', {
              employeeId: employee.id,
              employeeNumber: employee.employeeNumber,
              fullName: `${employee.firstName} ${employee.lastName}`,
            });
          }}
        />
      );

    case 'edit_employee':
      return (
        <AddEmployeeWindow
          salaryPrivacy={salaryPrivacy}
          employeeIdToEdit={win.metadata?.employeeId as string | undefined}
          onSuccess={(employee: Employee) => {
            onOpenWindow('employee_profile', {
              employeeId: employee.id,
              employeeNumber: employee.employeeNumber,
              fullName: `${employee.firstName} ${employee.lastName}`,
            });
          }}
        />
      );

    case 'employee_import':
      return <EmployeeImportWindow />;

    case 'employee_export':
      return (
        <EmployeeListWindow
          salaryPrivacy={salaryPrivacy}
          onOpenAddEmployee={() => onOpenWindow('add_employee')}
          onOpenEmployeeProfile={(employee: Employee) =>
            onOpenWindow('employee_profile', {
              employeeId: employee.id,
              employeeNumber: employee.employeeNumber,
              fullName: `${employee.firstName} ${employee.lastName}`,
            })
          }
          onOpenImport={() => onOpenWindow('employee_import')}
        />
      );

    case 'departments':
      return <DepartmentsWindow />;

    case 'positions':
      return <PositionsWindow />;

    case 'employee_documents':
      return <EmployeeDocumentsWindow />;

    // Timekeeping
    case 'dtr':
    case 'timekeeping_import':
    case 'timekeeping_export':
      return <DTRWindow />;
    case 'late_undertime':
      return <LateUndertimeWindow />;
    case 'attendance_matrix':
      return <AttendanceMatrixWindow />;
    case 'overtime':
      return <OvertimeWindow />;

    // Leave
    case 'leave_requests':
    case 'leave_types':
    case 'leave_calendar':
      return <LeaveRequestsWindow />;
    case 'leave_balances':
      return <LeaveBalancesWindow />;

    // Payroll
    case 'payroll_periods':
    case 'finalized_payroll':
    case 'payroll_adjustments':
      return <PayrollPeriodsWindow salaryPrivacy={salaryPrivacy} />;
    case 'create_payroll':
      return <CreatePayrollWindow />;
    case 'payroll_processing':
      return <PayrollProcessingWindow salaryPrivacy={salaryPrivacy} />;
    case 'payslips':
    case 'bank_advice':
    case 'bir_1601c':
    case 'sss_r3':
    case 'philhealth_rf1':
    case 'pagibig_mcrf':
    case 'thirteenth_month':
      return <PayslipsWindow salaryPrivacy={salaryPrivacy} />;

    // Loans
    case 'loan_list':
      return <LoanListWindow />;
    case 'loan_amortization':
      return <LoanAmortizationWindow />;

    // Allowances
    case 'allowances':
      return <AllowanceListWindow />;

    // Reports
    case 'report_center':
      return <ReportCenterWindow />;
    case 'payroll_summary':
      return <PayrollSummaryWindow salaryPrivacy={salaryPrivacy} />;
    case 'payroll_register':
    case 'payroll_reports':
    case 'payroll_register_report':
      return <PayrollRegisterWindow salaryPrivacy={salaryPrivacy} />;
    case 'employee_payroll':
    case 'employee_reports':
    case 'headcount_summary':
      return <EmployeePayrollReportWindow />;
    case 'deductions_report':
      return <DeductionsReportWindow />;
    case 'overtime_report':
      return <OvertimeReportWindow />;
    case 'attendance_report':
    case 'attendance_reports':
      return <AttendanceReportWindow />;
    case 'leave_report':
    case 'leave_reports':
      return <LeaveReportWindow />;
    case 'loan_report':
    case 'loan_reports':
      return <LoanReportWindow />;
    case 'allowance_report':
    case 'allowance_reports':
      return <AllowanceReportWindow />;
    case 'statutory_report':
    case 'statutory_reports':
    case 'tax_reports':
    case 'tax_withholding_report':
    case 'statutory_remittance_report':
      return <StatutoryReportWindow />;
    case 'payroll_history':
      return <PayrollHistoryWindow />;
    case 'audit_report':
    case 'audit_logs':
      return <AuditLogsWindow />;

    // Settings
    case 'statutory_rules':
    case 'tax_tables':
      return <StatutoryRulesWindow />;
    case 'users_roles':
    case 'security_settings':
      return <UsersAccessWindow />;
    case 'uat_signoff':
    case 'signoff':
      return <UATSignoffDashboardWindow />;
    case 'qa_testing':
    case 'payroll_testing':
      return <PayrollQADashboardWindow />;
    case 'performance_diagnostics':
    case 'performance':
      return <PerformanceDiagnosticsWindow />;
    case 'updates':
      return <SoftwareUpdatesWindow />;
    case 'system_health':
      return <SystemHealthWindow />;
    case 'diagnostics_logs':
      return <DiagnosticsLogsWindow />;
    case 'backup_restore':
    case 'database_settings':
      return <BackupRestoreWindow />;
    case 'general_settings':
      return <GeneralSettingsWindow />;
    case 'appearance_settings':
      return <AppearanceSettingsWindow />;
    case 'about_system':
      return <AboutWindow />;

    default:
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-[#f8fafc]">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
            {win.iconName}
          </div>
          <h3 className="text-sm font-bold text-slate-800">{win.title}</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Module window active. Feature operations will be connected in subsequent phases.
          </p>
        </div>
      );
  }
};

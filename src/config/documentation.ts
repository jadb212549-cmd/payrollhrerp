/**
 * Production System Documentation & Disaster Recovery Manual - Phase 14
 */

export interface DocSection {
  id: string;
  title: string;
  category: string;
  content: string;
}

export const PRODUCTION_DOCUMENTATION: DocSection[] = [
  {
    id: 'install_setup',
    title: '1. Clean Installation & First-Run Setup',
    category: 'Installation & Deployment',
    content: `
### Clean Installation Guide
The Multi-Company Payroll Management System is packaged as a zero-dependency Tauri Windows Portable Executable (.exe).
- **Executable File**: \`PayrollMasterERP_v1.0.0_x64.exe\`
- **Runtime Environment**: Windows 10/11 64-bit (No Node.js, Python, or local server required).
- **Storage Location**: Local application directory (\`./data\`, \`./backups\`, \`./logs\`).

### First-Run Setup Steps
1. Launch \`PayrollMasterERP_v1.0.0_x64.exe\`.
2. The initial setup wizard initializes the local IndexedDB schema (Schema v4).
3. Log in with the default Super Admin credentials (\`admin\` / \`admin123\`).
4. Immediately navigate to **Settings -> Users & Roles** to change the default password.
    `.trim(),
  },
  {
    id: 'company_employee',
    title: '2. Multi-Company & Employee Onboarding',
    category: 'Administration',
    content: `
### Company Setup & Data Isolation
- Navigate to **Companies -> Company Directory**.
- Click **Add Company** to enter Company Code, Legal Name, TIN, SSS Employer #, PhilHealth #, and Pag-IBIG Employer #.
- Multi-company data isolation is strictly enforced at the data layer. Users assigned to Company A cannot view or modify Company B data unless explicitly granted Super Admin access.

### Employee Management
- Navigate to **Employees -> Employee Directory**.
- Enter Employee Number, Name, Date Hired, Employment Status, Department, Position, and Salary Basis (Daily, Monthly, Hourly).
- Salary Rate History is snapshot-versioned for historic auditability.
    `.trim(),
  },
  {
    id: 'timekeeping_dtr',
    title: '3. Timekeeping & DTR Processing',
    category: 'Operations',
    content: `
### DTR Import & Attendance Matrix
- Navigate to **Timekeeping -> Daily Time Record (DTR)**.
- Import attendance records via CSV/Excel or manually enter Time-In and Time-Out timestamps.
- The engine calculates Late Minutes, Undertime Minutes, Overtime Hours (Regular 125%, Rest Day 130%, Regular Holiday 200%), and Night Differential (10:00 PM - 6:00 AM).
    `.trim(),
  },
  {
    id: 'payroll_processing',
    title: '4. Payroll Processing & Statutory Engine',
    category: 'Payroll Operations',
    content: `
### Payroll Approval Lifecycle
1. **Draft**: Create a new payroll batch by selecting Company and Cutoff Period.
2. **Calculated**: Run the Versioned Statutory Engine to compute Basic Pay, OT, Night Diff, Statutory Deductions (SSS 2026, PhilHealth 5%, Pag-IBIG ₱100 cap), BIR TRAIN Withholding Tax, Loans, and Net Pay.
3. **Approved**: Reviewers inspect calculations and approve the batch.
4. **Finalized**: Finalizing locks the payroll run. Calculations become permanently immutable. Reopening requires Super Admin authorization with mandatory audit justification.
    `.trim(),
  },
  {
    id: 'backup_recovery',
    title: '5. Encrypted Backup & Disaster Recovery',
    category: 'Maintenance & Security',
    content: `
### Encrypted Database Backup
- Navigate to **Settings -> Backup & Restore**.
- Click **Create Encrypted Backup**. The system generates a AES/JSON payload with SHA-256 checksum validation.
- Store backup files in a secure offline location.

### Disaster Recovery
- To restore state, click **Restore From File**, select a verified backup file, and confirm authorization.
- The system validates checksum integrity before replacing local stores.
    `.trim(),
  },
];

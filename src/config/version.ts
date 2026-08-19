/**
 * Centralized Application Versioning & Release Specification - Phase 11
 */

export type ReleaseChannel = 'Stable' | 'Beta' | 'Development';

export interface ReleaseNote {
  version: string;
  buildNumber: number;
  date: string;
  channel: ReleaseChannel;
  title: string;
  summary: string;
  newFeatures: string[];
  improvements: string[];
  bugFixes: string[];
  breakingChanges: string[];
  requiredUpdate: boolean;
  minSupportedAppVersion?: string;
}

export interface AppVersionInfo {
  version: string;
  buildNumber: number;
  releaseDate: string;
  releaseChannel: ReleaseChannel;
  appName: string;
  dbSchemaVersion: number;
  tauriPortableTarget: string;
}

export const CURRENT_APP_VERSION: AppVersionInfo = {
  version: '1.0.0',
  buildNumber: 100,
  releaseDate: '2026-08-18',
  releaseChannel: 'Stable',
  appName: 'Multi-Company Payroll Management System',
  dbSchemaVersion: 4,
  tauriPortableTarget: 'x86_64-pc-windows-msvc-portable',
};

export const RELEASE_HISTORY: ReleaseNote[] = [
  {
    version: '1.0.0',
    buildNumber: 100,
    date: '2026-08-18',
    channel: 'Stable',
    title: 'Production Release & System Architecture Hardening',
    summary: 'Full Multi-Company Payroll Management System production release with versioned statutory engine, role-based access control, encrypted backups, and system diagnostics.',
    newFeatures: [
      'Production Release & Update Management Center',
      'System Health Diagnostics & Data Integrity Scanner',
      'Immutable Audit Trail Inspector & Reopen Authorization',
      'Encrypted Database Backups with SHA-256 Checksum Validation',
      'Tauri Portable EXE Deployment Configuration'
    ],
    improvements: [
      'Optimized IndexedDB query indexing for 1,000+ employee scale',
      'Enhanced salary privacy masking across all windows',
      'Hardened statutory formula snapshotting for historic auditability'
    ],
    bugFixes: [
      'Resolved cutoff period date boundary overlaps',
      'Fixed PhilHealth tiered contribution capping for high earners'
    ],
    breakingChanges: [],
    requiredUpdate: false,
  },
  {
    version: '0.9.0',
    buildNumber: 90,
    date: '2026-08-10',
    channel: 'Beta',
    title: 'Phase 10 Security & User Management Beta',
    summary: 'Role-based permissions matrix, salted password hashing, and user account management.',
    newFeatures: ['Users & Access Control Matrix', 'Audit Trail Engine'],
    improvements: ['Improved company isolation guards'],
    bugFixes: [],
    breakingChanges: [],
    requiredUpdate: false,
  }
];

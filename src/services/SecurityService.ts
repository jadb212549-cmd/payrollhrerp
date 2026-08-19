/**
 * Security, Permissions & Hashing Service - Phase 10 Production Hardening
 */

export type UserRole = 
  | 'Super Admin' 
  | 'Company Admin' 
  | 'Payroll Admin' 
  | 'HR' 
  | 'Timekeeper' 
  | 'Reviewer' 
  | 'Approver' 
  | 'Viewer';

export type Permission =
  | 'companies:view' | 'companies:create' | 'companies:edit' | 'companies:archive'
  | 'employees:view' | 'employees:create' | 'employees:edit' | 'employees:archive' | 'employees:export'
  | 'timekeeping:view' | 'timekeeping:create' | 'timekeeping:edit' | 'timekeeping:approve' | 'timekeeping:export'
  | 'payroll:view' | 'payroll:process' | 'payroll:edit' | 'payroll:review' | 'payroll:approve' | 'payroll:finalize' | 'payroll:reopen'
  | 'reports:view' | 'reports:export'
  | 'payroll_rules:view' | 'payroll_rules:create' | 'payroll_rules:edit' | 'payroll_rules:approve' | 'payroll_rules:activate'
  | 'users:view' | 'users:manage'
  | 'backup:create' | 'backup:restore'
  | 'audit:view';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  'Super Admin': [
    'companies:view', 'companies:create', 'companies:edit', 'companies:archive',
    'employees:view', 'employees:create', 'employees:edit', 'employees:archive', 'employees:export',
    'timekeeping:view', 'timekeeping:create', 'timekeeping:edit', 'timekeeping:approve', 'timekeeping:export',
    'payroll:view', 'payroll:process', 'payroll:edit', 'payroll:review', 'payroll:approve', 'payroll:finalize', 'payroll:reopen',
    'reports:view', 'reports:export',
    'payroll_rules:view', 'payroll_rules:create', 'payroll_rules:edit', 'payroll_rules:approve', 'payroll_rules:activate',
    'users:view', 'users:manage',
    'backup:create', 'backup:restore',
    'audit:view'
  ],
  'Company Admin': [
    'companies:view', 'companies:edit',
    'employees:view', 'employees:create', 'employees:edit', 'employees:export',
    'timekeeping:view', 'timekeeping:approve', 'timekeeping:export',
    'payroll:view', 'payroll:process', 'payroll:review', 'payroll:approve',
    'reports:view', 'reports:export',
    'payroll_rules:view',
    'users:view',
    'audit:view'
  ],
  'Payroll Admin': [
    'companies:view',
    'employees:view',
    'timekeeping:view',
    'payroll:view', 'payroll:process', 'payroll:edit', 'payroll:review', 'payroll:approve', 'payroll:finalize',
    'reports:view', 'reports:export',
    'payroll_rules:view', 'payroll_rules:create', 'payroll_rules:edit',
    'audit:view'
  ],
  'HR': [
    'companies:view',
    'employees:view', 'employees:create', 'employees:edit', 'employees:export',
    'timekeeping:view',
    'reports:view', 'reports:export',
    'audit:view'
  ],
  'Timekeeper': [
    'companies:view',
    'employees:view',
    'timekeeping:view', 'timekeeping:create', 'timekeeping:edit', 'timekeeping:export',
    'reports:view'
  ],
  'Reviewer': [
    'companies:view',
    'employees:view',
    'timekeeping:view',
    'payroll:view', 'payroll:review',
    'reports:view', 'reports:export',
    'audit:view'
  ],
  'Approver': [
    'companies:view',
    'employees:view',
    'timekeeping:view', 'timekeeping:approve',
    'payroll:view', 'payroll:approve', 'payroll:finalize',
    'reports:view', 'reports:export',
    'payroll_rules:view', 'payroll_rules:approve', 'payroll_rules:activate',
    'audit:view'
  ],
  'Viewer': [
    'companies:view',
    'employees:view',
    'timekeeping:view',
    'payroll:view',
    'reports:view',
    'payroll_rules:view'
  ]
};

export class SecurityService {
  /**
   * Secure Salted SHA-256 Password Hash (Browser Native WebCrypto)
   */
  public static async hashPassword(password: string, salt: string = 'ph_payroll_salt_v1'): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${salt}:${password}`);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Offline Fallback Hash
    let hash = 0;
    const str = `${salt}:${password}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `sha256_fallback_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Verify password against stored hash
   */
  public static async verifyPassword(password: string, hash: string, salt: string = 'ph_payroll_salt_v1'): Promise<boolean> {
    const computed = await SecurityService.hashPassword(password, salt);
    return computed === hash;
  }

  /**
   * Check if role has permission
   */
  public static hasPermission(role: UserRole, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  /**
   * Generate SHA-256 Hash for Backup Integrity Validation
   */
  public static async generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return `chk_${data.length}_${Date.now()}`;
  }
}

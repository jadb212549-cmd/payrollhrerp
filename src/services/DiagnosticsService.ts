/**
 * Safe Application Diagnostics & System Logging Engine - Phase 11
 */

export type DiagnosticLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type DiagnosticCategory = 
  | 'SYSTEM' 
  | 'DATABASE' 
  | 'UPDATE' 
  | 'MIGRATION' 
  | 'BACKUP' 
  | 'RESTORE' 
  | 'AUTH' 
  | 'PAYROLL';

export interface DiagnosticLogEntry {
  id: string;
  timestamp: string;
  level: DiagnosticLogLevel;
  category: DiagnosticCategory;
  message: string;
  module?: string;
  errorCode?: string;
  stackTrace?: string;
}

const STORAGE_KEY = 'payroll_diagnostics_logs';
const MAX_LOG_ENTRIES = 500;

export class DiagnosticsService {
  private static instance: DiagnosticsService | null = null;
  private logsMemory: DiagnosticLogEntry[] = [];

  private constructor() {
    this.loadLogsFromStorage();
  }

  public static getInstance(): DiagnosticsService {
    if (!DiagnosticsService.instance) {
      DiagnosticsService.instance = new DiagnosticsService();
    }
    return DiagnosticsService.instance;
  }

  private loadLogsFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.logsMemory = JSON.parse(raw);
        }
      }
    } catch {
      this.logsMemory = [];
    }
  }

  private saveLogsToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logsMemory.slice(-MAX_LOG_ENTRIES)));
      }
    } catch {
      // Storage quota or error fallback
    }
  }

  /**
   * Sanitizes message to prevent sensitive data leak (passwords, bank numbers, salary details)
   */
  private sanitizeMessage(text: string): string {
    if (!text) return '';
    return text
      .replace(/password\s*[:=]\s*[^\s,]+/gi, 'password: [REDACTED]')
      .replace(/token\s*[:=]\s*[^\s,]+/gi, 'token: [REDACTED]')
      .replace(/hash\s*[:=]\s*[^\s,]+/gi, 'hash: [REDACTED]')
      .replace(/\b\d{10,16}\b/g, '************[ACCOUNT_REDACTED]');
  }

  public log(
    level: DiagnosticLogLevel,
    category: DiagnosticCategory,
    message: string,
    options?: { module?: string; errorCode?: string; stackTrace?: string }
  ): DiagnosticLogEntry {
    const entry: DiagnosticLogEntry = {
      id: `diag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message: this.sanitizeMessage(message),
      module: options?.module,
      errorCode: options?.errorCode,
      stackTrace: options?.stackTrace ? this.sanitizeMessage(options.stackTrace) : undefined,
    };

    this.logsMemory.push(entry);
    if (this.logsMemory.length > MAX_LOG_ENTRIES) {
      this.logsMemory = this.logsMemory.slice(-MAX_LOG_ENTRIES);
    }

    this.saveLogsToStorage();

    if (level === 'ERROR' || level === 'CRITICAL') {
      console.error(`[ERP DIAGNOSTICS] [${category}] ${entry.message}`);
    }

    return entry;
  }

  public getLogs(): DiagnosticLogEntry[] {
    return [...this.logsMemory].reverse();
  }

  public clearLogs() {
    this.logsMemory = [];
    this.saveLogsToStorage();
  }

  public generateDiagnosticReport(): string {
    const header = `=== MULTI-COMPANY PAYROLL ERP DIAGNOSTIC REPORT ===\nGenerated: ${new Date().toISOString()}\nTotal Logs: ${this.logsMemory.length}\n\n`;
    const logLines = this.logsMemory
      .map(l => `[${l.timestamp}] [${l.level}] [${l.category}] ${l.module ? `(${l.module}) ` : ''}${l.message}${l.errorCode ? ` (Code: ${l.errorCode})` : ''}`)
      .join('\n');
    return header + logLines;
  }
}

export const diagnosticsService = DiagnosticsService.getInstance();

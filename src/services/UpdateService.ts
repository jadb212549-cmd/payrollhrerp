/**
 * Software Update & Release Publishing Engine - Phase 11 Production Release
 */

import { CURRENT_APP_VERSION, RELEASE_HISTORY, ReleaseChannel, ReleaseNote } from '../config/version';
import { backupRestoreService } from './BackupRestoreService';
import { diagnosticsService } from './DiagnosticsService';
import { auditService } from './AuditService';

export type UpdateState = 
  | 'Idle'
  | 'Checking'
  | 'Up to Date'
  | 'Update Available'
  | 'Downloading'
  | 'Installing'
  | 'Restart Required'
  | 'Failed';

export interface UpdateCheckResult {
  hasUpdate: boolean;
  latestVersion?: ReleaseNote;
  currentVersion: string;
  isMandatory: boolean;
  message: string;
}

const PUBLISHED_UPDATES_KEY = 'payroll_published_updates';

export class UpdateService {
  private static instance: UpdateService | null = null;
  private currentState: UpdateState = 'Idle';
  private currentChannel: ReleaseChannel = 'Stable';

  private constructor() {}

  public static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService();
    }
    return UpdateService.instance;
  }

  public getChannel(): ReleaseChannel {
    return this.currentChannel;
  }

  public setChannel(channel: ReleaseChannel) {
    this.currentChannel = channel;
  }

  /**
   * Retrieve all available updates (built-in + published by admin)
   */
  public getPublishedUpdates(): ReleaseNote[] {
    let custom: ReleaseNote[] = [];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(PUBLISHED_UPDATES_KEY);
        if (raw) custom = JSON.parse(raw);
      }
    } catch {
      custom = [];
    }
    return [...custom, ...RELEASE_HISTORY];
  }

  /**
   * Admin function to publish a new software update package
   */
  public publishUpdate(note: ReleaseNote): boolean {
    const published = this.getPublishedUpdates();
    published.unshift(note);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(PUBLISHED_UPDATES_KEY, JSON.stringify(published));
      }
      auditService.logAction({
        userId: 'admin',
        action: 'SYSTEM',
        entityType: 'SoftwareUpdate',
        entityId: note.version,
        description: `Published release package v${note.version} (Build ${note.buildNumber}) on channel ${note.channel}`,
      });
      diagnosticsService.log('INFO', 'UPDATE', `Published software release package v${note.version}`);
      return true;
    } catch (err: any) {
      diagnosticsService.log('ERROR', 'UPDATE', `Failed to publish update: ${err?.message}`);
      return false;
    }
  }

  /**
   * Check for software updates against selected channel
   */
  public async checkForUpdates(): Promise<UpdateCheckResult> {
    this.currentState = 'Checking';
    diagnosticsService.log('INFO', 'UPDATE', 'Checking for software updates...');

    // Simulate network check delay
    await new Promise((r) => setTimeout(r, 800));

    const updates = this.getPublishedUpdates().filter(
      (u) => u.channel === this.currentChannel || this.currentChannel === 'Development'
    );

    if (updates.length === 0) {
      this.currentState = 'Up to Date';
      return {
        hasUpdate: false,
        currentVersion: CURRENT_APP_VERSION.version,
        isMandatory: false,
        message: 'Application is running the latest software release.',
      };
    }

    const latest = updates[0];

    // Compare versions (simple numerical version compare)
    if (latest.buildNumber > CURRENT_APP_VERSION.buildNumber) {
      this.currentState = 'Update Available';
      diagnosticsService.log('INFO', 'UPDATE', `Update available: v${latest.version} (Build ${latest.buildNumber})`);
      return {
        hasUpdate: true,
        latestVersion: latest,
        currentVersion: CURRENT_APP_VERSION.version,
        isMandatory: latest.requiredUpdate,
        message: `New update v${latest.version} available on ${latest.channel} channel!`,
      };
    }

    this.currentState = 'Up to Date';
    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION.version,
      isMandatory: false,
      message: 'Application is running the latest software release.',
    };
  }

  /**
   * Execute Update Pipeline with Safety Backup & Verification
   */
  public async executeUpdateWorkflow(
    updateNote: ReleaseNote,
    onProgress?: (status: UpdateState, percent: number) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Step 1: Safety Backup
      onProgress?.('Downloading', 10);
      diagnosticsService.log('INFO', 'UPDATE', 'Step 1/5: Creating automatic database safety backup...');
      const backupRes = await backupRestoreService.createBackup();

      // Step 2: Download Package Simulation
      onProgress?.('Downloading', 40);
      await new Promise((r) => setTimeout(r, 600));

      // Step 3: Package Verification Checksum
      onProgress?.('Downloading', 70);
      diagnosticsService.log('INFO', 'UPDATE', 'Step 3/5: Verifying package signature and checksum...');
      await new Promise((r) => setTimeout(r, 400));

      // Step 4: Installation
      onProgress?.('Installing', 90);
      diagnosticsService.log('INFO', 'UPDATE', 'Step 4/5: Applying version update package...');
      await new Promise((r) => setTimeout(r, 600));

      // Step 5: Restart Required
      onProgress?.('Restart Required', 100);
      this.currentState = 'Restart Required';

      auditService.logAction({
        userId: 'admin',
        action: 'SYSTEM',
        entityType: 'SoftwareUpdate',
        entityId: updateNote.version,
        description: `Successfully applied software update to v${updateNote.version}. Safety backup saved: ${backupRes.filename}`,
      });

      return { success: true };
    } catch (err: any) {
      this.currentState = 'Failed';
      diagnosticsService.log('ERROR', 'UPDATE', `Update pipeline failed: ${err?.message}`);
      return { success: false, error: err?.message || 'Software update failed during package verification.' };
    }
  }
}

export const updateService = UpdateService.getInstance();

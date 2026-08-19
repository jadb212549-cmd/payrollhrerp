import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Company } from '../db/schema';
import { companyService } from '../services/CompanyService';
import { migrationManager } from '../db/migrations';
import { settingsService } from '../services/SettingsService';

interface CompanyContextValue {
  currentCompany: Company | null;
  currentCompanyId: string | null;
  isAllCompanies: boolean;
  activeCompanies: Company[];
  isLoading: boolean;
  dbVersion: number;
  error: string | null;
  setCompany: (companyOrId: Company | string) => void;
  setAllCompanies: () => void;
  clearCompany: () => void;
  refreshCompanies: () => Promise<void>;
  seedDemoCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [isAllCompanies, setIsAllCompanies] = useState<boolean>(false);
  const [activeCompanies, setActiveCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbVersion, setDbVersion] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const refreshCompanies = useCallback(async () => {
    try {
      setError(null);
      const list = await companyService.listActiveCompanies();
      setActiveCompanies(list);

      // If current company was archived or deleted, reset or pick appropriate
      setCurrentCompany((prev) => {
        if (!prev) return null;
        const stillActive = list.find((c) => c.id === prev.id);
        return stillActive || null;
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to load company records');
    }
  }, []);

  // Initialize DB & load initial companies on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setIsLoading(true);
        // 1. Run migrations safely
        const { currentVersion } = await migrationManager.runMigrations();
        if (mounted) setDbVersion(currentVersion);

        // 2. Load settings for startup company
        const settings = await settingsService.getSettings();

        // 3. Load active companies
        const list = await companyService.listActiveCompanies();
        if (mounted) {
          setActiveCompanies(list);

          if (settings.startupCompanyId === 'ALL') {
            setIsAllCompanies(true);
            setCurrentCompany(null);
          } else if (settings.startupCompanyId && list.length > 0) {
            const found = list.find((c) => c.id === settings.startupCompanyId);
            if (found) {
              setCurrentCompany(found);
              setIsAllCompanies(false);
            } else if (list.length > 0) {
              setCurrentCompany(list[0]);
              setIsAllCompanies(false);
            }
          } else if (list.length > 0) {
            // Default to first active company
            setCurrentCompany(list[0]);
            setIsAllCompanies(false);
          } else {
            // No company configured yet
            setCurrentCompany(null);
            setIsAllCompanies(false);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Database initialization error');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const setCompany = useCallback(
    (companyOrId: Company | string) => {
      setIsAllCompanies(false);
      if (typeof companyOrId === 'string') {
        const found = activeCompanies.find((c) => c.id === companyOrId || c.companyCode === companyOrId);
        if (found) {
          setCurrentCompany(found);
        }
      } else {
        setCurrentCompany(companyOrId);
      }
    },
    [activeCompanies]
  );

  const setAllCompanies = useCallback(() => {
    setIsAllCompanies(true);
    setCurrentCompany(null);
  }, []);

  const clearCompany = useCallback(() => {
    setIsAllCompanies(false);
    setCurrentCompany(null);
  }, []);

  const seedDemoCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      await companyService.seedDevelopmentCompanies();
      await refreshCompanies();
      const active = await companyService.listActiveCompanies();
      if (active.length > 0) {
        setCurrentCompany(active[0]);
        setIsAllCompanies(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to seed sample companies');
    } finally {
      setIsLoading(false);
    }
  }, [refreshCompanies]);

  const value: CompanyContextValue = {
    currentCompany,
    currentCompanyId: isAllCompanies ? null : currentCompany?.id || null,
    isAllCompanies,
    activeCompanies,
    isLoading,
    dbVersion,
    error,
    setCompany,
    setAllCompanies,
    clearCompany,
    refreshCompanies,
    seedDemoCompanies,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};

export const useCompanyContext = (): CompanyContextValue => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompanyContext must be used within a CompanyProvider');
  }
  return context;
};

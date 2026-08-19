/**
 * Authentication & Security Context - Session & Access Control
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserStatus } from '../db/schema';
import { userRepository } from '../repositories/UserRepository';
import { SecurityService, UserRole, Permission } from '../services/SecurityService';
import { auditService } from '../services/AuditService';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  canAccessCompany: (companyId: string | null) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const defaultAdmin = await userRepository.ensureDefaultAdmin();
      // Auto-session initialize or load saved session
      const savedUserJson = sessionStorage.getItem('payroll_active_user');
      if (savedUserJson) {
        const parsed = JSON.parse(savedUserJson) as User;
        const fresh = await userRepository.findById(parsed.id);
        if (fresh && fresh.status === 'Active') {
          setCurrentUser(fresh);
        } else {
          setCurrentUser(defaultAdmin);
        }
      } else {
        setCurrentUser(defaultAdmin);
      }
    } catch (err) {
      console.error('Failed to initialize auth:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const user = await userRepository.findByUsername(username);
      if (!user) {
        return { success: false, error: 'Invalid username or password.' };
      }

      if (user.status !== 'Active') {
        return { success: false, error: 'Account is deactivated or inactive. Contact Super Admin.' };
      }

      const isValid = await SecurityService.verifyPassword(password, user.passwordHash);
      if (!isValid) {
        auditService.logAction({
          userId: username,
          action: 'SYSTEM',
          entityType: 'Auth',
          entityId: username,
          description: `Failed login attempt for username: ${username}`,
        });
        return { success: false, error: 'Invalid username or password.' };
      }

      user.lastLoginAt = new Date().toISOString();
      await userRepository.save(user);

      setCurrentUser(user);
      sessionStorage.setItem('payroll_active_user', JSON.stringify(user));

      auditService.logAction({
        userId: user.username,
        action: 'SYSTEM',
        entityType: 'Auth',
        entityId: user.id,
        description: `User ${user.displayName} logged in successfully`,
      });

      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: 'Authentication engine error.' };
    }
  };

  const logout = () => {
    if (currentUser) {
      auditService.logAction({
        userId: currentUser.username,
        action: 'SYSTEM',
        entityType: 'Auth',
        entityId: currentUser.id,
        description: `User ${currentUser.displayName} logged out`,
      });
    }
    setCurrentUser(null);
    sessionStorage.removeItem('payroll_active_user');
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!currentUser) return false;
    return SecurityService.hasPermission(currentUser.role, permission);
  };

  const canAccessCompany = (companyId: string | null): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'Super Admin') return true;
    if (!companyId) return true;
    if (currentUser.companyAccess.includes('*')) return true;
    return currentUser.companyAccess.includes(companyId);
  };

  const refreshUser = async () => {
    if (currentUser) {
      const fresh = await userRepository.findById(currentUser.id);
      if (fresh) setCurrentUser(fresh);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, hasPermission, canAccessCompany, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

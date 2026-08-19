export type WindowCategory = 
  | 'dashboard'
  | 'companies'
  | 'employees'
  | 'timekeeping'
  | 'leave'
  | 'payroll'
  | 'loans'
  | 'allowances'
  | 'reports'
  | 'settings';

export interface MenuItem {
  id: string;
  title: string;
  category: WindowCategory;
  description?: string;
  iconName: string;
  badge?: string;
  isDivider?: boolean;
}

export interface NavCategory {
  id: WindowCategory;
  label: string;
  iconName: string;
  items: MenuItem[];
  isDirectAction?: boolean; // For Dashboard
}

export interface WindowInstance {
  id: string;
  title: string;
  category: WindowCategory;
  iconName: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  minSize: { width: number; height: number };
  isMinimized: boolean;
  isMaximized: boolean;
  prevBounds?: { x: number; y: number; width: number; height: number };
  zIndex: number;
  menuItemId: string;
  metadata?: Record<string, unknown>;
}

export interface Company {
  id: string;
  name: string;
  code: string;
  tin?: string;
  activeEmployees: number;
  isDefault?: boolean;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'warning' | 'success';
}

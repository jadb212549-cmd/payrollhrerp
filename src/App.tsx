import React, { useState, useEffect, useCallback } from 'react';
import { 
  WindowInstance, 
  MenuItem, 
  WindowCategory, 
  SystemNotification 
} from './types';
import { 
  NAVIGATION_CATEGORIES 
} from './data/navigationMenu';
import { CompanyProvider } from './context/CompanyContext';
import { AuthProvider } from './context/AuthContext';
import { AppHeader } from './components/layout/AppHeader';
import { TopNavBar } from './components/layout/TopNavBar';
import { WorkspaceTabBar } from './components/layout/WorkspaceTabBar';
import { StatusBar } from './components/layout/StatusBar';
import { Workspace } from './components/workspace/Workspace';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';

const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'n1',
    title: 'Phase 2 Database & Multi-Company Foundation Ready',
    message: 'Local IndexedDB engine, schema migrations, and company isolation layers initialized.',
    timestamp: 'Just now',
    read: false,
    type: 'success',
  },
  {
    id: 'n2',
    title: 'Audit Logging Active',
    message: 'Entity creation, updates, and archival are tracked with immutable audit trails.',
    timestamp: '5m ago',
    read: false,
    type: 'info',
  },
  {
    id: 'n3',
    title: 'Multi-Tenant Architecture Compliant',
    message: 'All business entities and forthcoming data records are strictly scoped by companyId.',
    timestamp: '1h ago',
    read: true,
    type: 'info',
  },
];

function AppContent() {
  const [salaryPrivacy, setSalaryPrivacy] = useState<boolean>(true);
  const [windows, setWindows] = useState<WindowInstance[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>(INITIAL_NOTIFICATIONS);

  // Highest z-index tracker
  const [topZIndex, setTopZIndex] = useState(10);

  // Helper to find menuItem by id
  const findMenuItem = useCallback((menuItemId: string): MenuItem | undefined => {
    for (const category of NAVIGATION_CATEGORIES) {
      const found = category.items.find((i) => i.id === menuItemId);
      if (found) return found;
    }
    // Dynamic virtual menu items (e.g. company_profile, employee_profile)
    if (menuItemId === 'company_profile') {
      return {
        id: 'company_profile',
        title: 'Company Profile',
        category: 'companies',
        iconName: 'Building2',
        description: 'View and manage corporate entity registration and audit records',
      };
    }
    if (menuItemId === 'employee_profile') {
      return {
        id: 'employee_profile',
        title: 'Employee 201 Profile',
        category: 'employees',
        iconName: 'Contact2',
        description: 'Comprehensive 201 employee master profile',
      };
    }
    if (menuItemId === 'edit_employee') {
      return {
        id: 'edit_employee',
        title: 'Edit Employee',
        category: 'employees',
        iconName: 'Edit3',
        description: 'Update employee 201 records',
      };
    }
    return undefined;
  }, []);

  // Bring a window to front and focus
  const bringToFront = useCallback((id: string) => {
    setTopZIndex((prev) => {
      const nextZ = prev + 1;
      setWindows((curr) =>
        curr.map((w) => (w.id === id ? { ...w, zIndex: nextZ, isMinimized: false } : w))
      );
      return nextZ;
    });
    setActiveWindowId(id);
  }, []);

  // Open or focus an internal window (Duplicate prevention with metadata support)
  const openWindow = useCallback((itemOrId: MenuItem | string, metadata?: Record<string, unknown>) => {
    const item = typeof itemOrId === 'string' ? findMenuItem(itemOrId) : itemOrId;
    if (!item) return;

    // For company_profile, key on specific companyId if provided
    const matchCompanyId = metadata?.companyId;
    const existingIndex = windows.findIndex((w) => {
      if (w.menuItemId !== item.id) return false;
      if (matchCompanyId && w.metadata?.companyId) {
        return w.metadata.companyId === matchCompanyId;
      }
      return true;
    });

    if (existingIndex !== -1) {
      // Bring existing window forward & restore if minimized
      const existing = windows[existingIndex];
      bringToFront(existing.id);
      return;
    }

    // Determine sensible cascading coordinates
    const offsetIndex = windows.length % 8;
    const cascadeOffset = offsetIndex * 28;

    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    // Default window size: ~75% of screen
    const initialWidth = Math.max(700, Math.min(960, Math.round(screenWidth * 0.75)));
    const initialHeight = Math.max(460, Math.min(620, Math.round(screenHeight * 0.7)));

    const initialX = Math.max(20, Math.min(screenWidth - initialWidth - 40, 50 + cascadeOffset));
    const initialY = Math.max(20, Math.min(screenHeight - initialHeight - 100, 30 + cascadeOffset));

    const newWindowId = `win_${item.id}_${Date.now()}`;
    const newZIndex = topZIndex + 1;
    setTopZIndex(newZIndex);

    let windowTitle = item.title;
    if (item.id === 'company_profile' && metadata?.companyCode) {
      windowTitle = `${metadata.companyCode} - Company Profile`;
    }
    if (item.id === 'employee_profile' && metadata?.employeeNumber) {
      windowTitle = `${metadata.employeeNumber} - ${metadata.fullName || 'Employee Profile'}`;
    }
    if (item.id === 'edit_employee' && metadata?.employeeNumber) {
      windowTitle = `Edit - ${metadata.employeeNumber} (${metadata.fullName || ''})`;
    }

    const newWindow: WindowInstance = {
      id: newWindowId,
      title: windowTitle,
      category: item.category,
      iconName: item.iconName,
      position: { x: initialX, y: initialY },
      size: { width: initialWidth, height: initialHeight },
      minSize: { width: 700, height: 450 },
      isMinimized: false,
      isMaximized: false,
      zIndex: newZIndex,
      menuItemId: item.id,
      metadata,
    };

    setWindows((prev) => [...prev, newWindow]);
    setActiveWindowId(newWindowId);
  }, [bringToFront, findMenuItem, topZIndex, windows]);

  // Close window
  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const remaining = prev.filter((w) => w.id !== id);
      if (activeWindowId === id) {
        const nextActive = remaining.filter((w) => !w.isMinimized).sort((a, b) => b.zIndex - a.zIndex)[0];
        setActiveWindowId(nextActive ? nextActive.id : null);
      }
      return remaining;
    });
  }, [activeWindowId]);

  // Minimize window
  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w))
    );
    if (activeWindowId === id) {
      const nextActive = windows
        .filter((w) => w.id !== id && !w.isMinimized)
        .sort((a, b) => b.zIndex - a.zIndex)[0];
      setActiveWindowId(nextActive ? nextActive.id : null);
    }
  }, [activeWindowId, windows]);

  // Maximize / Restore Toggle
  const toggleMaximizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.isMaximized) {
          // Restore
          return {
            ...w,
            isMaximized: false,
            position: w.prevBounds ? { x: w.prevBounds.x, y: w.prevBounds.y } : w.position,
            size: w.prevBounds ? { width: w.prevBounds.width, height: w.prevBounds.height } : w.size,
          };
        } else {
          // Maximize
          return {
            ...w,
            isMaximized: true,
            prevBounds: {
              x: w.position.x,
              y: w.position.y,
              width: w.size.width,
              height: w.size.height,
            },
          };
        }
      })
    );
    bringToFront(id);
  }, [bringToFront]);

  // Update bounds from dragging or resizing
  const updateWindowBounds = useCallback(
    (id: string, bounds: { x: number; y: number; width: number; height: number }) => {
      setWindows((prev) =>
        prev.map((w) =>
          w.id === id
            ? {
                ...w,
                position: { x: bounds.x, y: bounds.y },
                size: { width: bounds.width, height: bounds.height },
              }
            : w
        )
      );
    },
    []
  );

  // Window Arrangement: Cascade
  const cascadeWindows = useCallback(() => {
    setWindows((prev) =>
      prev.map((w, idx) => ({
        ...w,
        isMaximized: false,
        isMinimized: false,
        position: { x: 30 + idx * 32, y: 25 + idx * 32 },
        size: { width: 800, height: 500 },
        zIndex: idx + 10,
      }))
    );
    if (windows.length > 0) {
      setActiveWindowId(windows[windows.length - 1].id);
    }
  }, [windows]);

  // Window Arrangement: Tile Horizontal (Side by Side)
  const tileHorizontal = useCallback(() => {
    const visible = windows.filter((w) => !w.isMinimized);
    if (visible.length === 0) return;

    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const workspaceHeight = (typeof window !== 'undefined' ? window.innerHeight : 800) - 100;
    const tileWidth = Math.floor(screenWidth / visible.length);

    setWindows((prev) =>
      prev.map((w) => {
        const visIndex = visible.findIndex((v) => v.id === w.id);
        if (visIndex === -1) return w;
        return {
          ...w,
          isMaximized: false,
          isMinimized: false,
          position: { x: visIndex * tileWidth, y: 0 },
          size: { width: tileWidth, height: workspaceHeight },
        };
      })
    );
  }, [windows]);

  // Window Arrangement: Tile Vertical / Grid
  const tileVertical = useCallback(() => {
    const visible = windows.filter((w) => !w.isMinimized);
    if (visible.length === 0) return;

    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const workspaceHeight = (typeof window !== 'undefined' ? window.innerHeight : 800) - 100;
    const cols = visible.length > 2 ? 2 : visible.length;
    const rows = Math.ceil(visible.length / cols);
    const tileWidth = Math.floor(screenWidth / cols);
    const tileHeight = Math.floor(workspaceHeight / rows);

    setWindows((prev) =>
      prev.map((w) => {
        const visIndex = visible.findIndex((v) => v.id === w.id);
        if (visIndex === -1) return w;
        const col = visIndex % cols;
        const row = Math.floor(visIndex / cols);
        return {
          ...w,
          isMaximized: false,
          isMinimized: false,
          position: { x: col * tileWidth, y: row * tileHeight },
          size: { width: tileWidth, height: tileHeight },
        };
      })
    );
  }, [windows]);

  // Minimize All
  const minimizeAll = useCallback(() => {
    setWindows((prev) => prev.map((w) => ({ ...w, isMinimized: true })));
    setActiveWindowId(null);
  }, []);

  // Close All
  const closeAll = useCallback(() => {
    setWindows([]);
    setActiveWindowId(null);
  }, []);

  // Global Keyboard Shortcuts (Ctrl+K, Alt+W, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K: Open Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }

      // Alt+W: Close active window
      if (e.altKey && e.key.toLowerCase() === 'w') {
        if (activeWindowId) {
          e.preventDefault();
          closeWindow(activeWindowId);
        }
      }

      // Alt+M: Minimize active window
      if (e.altKey && e.key.toLowerCase() === 'm') {
        if (activeWindowId) {
          e.preventDefault();
          minimizeWindow(activeWindowId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWindowId, closeWindow, minimizeWindow]);

  // Track categories with open windows
  const openCategories = new Set<WindowCategory>(
    windows.map((w) => w.category)
  );

  const activeWindow = windows.find((w) => w.id === activeWindowId);
  const activeCategory = activeWindow?.category;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#f8fafc] text-[#334155] font-sans select-none antialiased">
      {/* 1. Top Application Header */}
      <AppHeader
        salaryPrivacy={salaryPrivacy}
        onToggleSalaryPrivacy={() => setSalaryPrivacy(!salaryPrivacy)}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        onOpenWindow={openWindow}
        notifications={notifications}
        onClearNotifications={() => setNotifications([])}
      />

      {/* 2. Top Navigation Bar (NO SIDEBAR) */}
      <TopNavBar
        activeCategory={activeCategory}
        openCategories={openCategories}
        onSelectMenuItem={(item) => openWindow(item)}
      />

      {/* 3. Workspace Tab Bar for Multi-Window Mode */}
      <WorkspaceTabBar
        windows={windows}
        activeWindowId={activeWindowId}
        onActivateWindow={bringToFront}
        onCloseWindow={closeWindow}
        onCascadeWindows={cascadeWindows}
        onTileHorizontal={tileHorizontal}
        onTileVertical={tileVertical}
        onMinimizeAll={minimizeAll}
        onCloseAll={closeAll}
      />

      {/* 4. Main Internal Workspace (Canvas for Windows / Dashboard) */}
      <Workspace
        windows={windows}
        activeWindowId={activeWindowId}
        salaryPrivacy={salaryPrivacy}
        onFocusWindow={bringToFront}
        onCloseWindow={closeWindow}
        onMinimizeWindow={minimizeWindow}
        onMaximizeToggle={toggleMaximizeWindow}
        onUpdateBounds={updateWindowBounds}
        onOpenWindow={openWindow}
      />

      {/* 5. Desktop ERP Status Bar */}
      <StatusBar
        openWindowsCount={windows.length}
        salaryPrivacy={salaryPrivacy}
        activeWindowTitle={activeWindow?.title}
      />

      {/* 6. Global Search Modal (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onSelectMenuItem={(item) => openWindow(item)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <AppContent />
      </CompanyProvider>
    </AuthProvider>
  );
}

import React, { useRef, useEffect, useState } from 'react';
import { WindowInstance } from '../../types';
import { WindowContainer } from './WindowContainer';
import { WindowContentDispatcher } from './WindowContentDispatcher';
import { DashboardView } from '../windows/DashboardView';

interface WorkspaceProps {
  windows: WindowInstance[];
  activeWindowId: string | null;
  salaryPrivacy: boolean;
  onFocusWindow: (id: string) => void;
  onCloseWindow: (id: string) => void;
  onMinimizeWindow: (id: string) => void;
  onMaximizeToggle: (id: string) => void;
  onUpdateBounds: (id: string, bounds: { x: number; y: number; width: number; height: number }) => void;
  onOpenWindow: (menuItemId: string, metadata?: Record<string, unknown>) => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  windows,
  activeWindowId,
  salaryPrivacy,
  onFocusWindow,
  onCloseWindow,
  onMinimizeWindow,
  onMaximizeToggle,
  onUpdateBounds,
  onOpenWindow,
}) => {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [workspaceBounds, setWorkspaceBounds] = useState({ width: 1200, height: 800 });

  // Monitor workspace sizing dynamically
  useEffect(() => {
    const updateSize = () => {
      if (workspaceRef.current) {
        setWorkspaceBounds({
          width: workspaceRef.current.clientWidth,
          height: workspaceRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const visibleWindows = windows.filter((w) => !w.isMinimized);

  return (
    <div
      ref={workspaceRef}
      className="flex-1 relative overflow-hidden bg-[#f8fafc] flex flex-col"
    >
      {/* Background Dashboard: Shown if no windows are open or visible */}
      {visibleWindows.length === 0 && (
        <DashboardView
          onOpenWindow={onOpenWindow}
          salaryPrivacy={salaryPrivacy}
        />
      )}

      {/* Subtle desktop pattern background when windows are open */}
      {visibleWindows.length > 0 && (
        <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]" />
      )}

      {/* Open Internal Windows */}
      {windows.map((win) => {
        const isActive = win.id === activeWindowId;
        return (
          <WindowContainer
            key={win.id}
            window={win}
            isActive={isActive}
            onFocus={onFocusWindow}
            onClose={onCloseWindow}
            onMinimize={onMinimizeWindow}
            onMaximizeToggle={onMaximizeToggle}
            onUpdateBounds={onUpdateBounds}
            workspaceBounds={workspaceBounds}
          >
            <WindowContentDispatcher
              window={win}
              salaryPrivacy={salaryPrivacy}
              onOpenWindow={onOpenWindow}
            />
          </WindowContainer>
        );
      })}
    </div>
  );
};

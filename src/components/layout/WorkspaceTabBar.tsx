import React from 'react';
import { X, Layers, Grid2X2, SplitSquareVertical, Minus, Trash2 } from 'lucide-react';
import { WindowInstance } from '../../types';
import { IconResolver } from '../common/IconResolver';

interface WorkspaceTabBarProps {
  windows: WindowInstance[];
  activeWindowId: string | null;
  onActivateWindow: (id: string) => void;
  onCloseWindow: (id: string) => void;
  onCascadeWindows: () => void;
  onTileHorizontal: () => void;
  onTileVertical: () => void;
  onMinimizeAll: () => void;
  onCloseAll: () => void;
}

export const WorkspaceTabBar: React.FC<WorkspaceTabBarProps> = ({
  windows,
  activeWindowId,
  onActivateWindow,
  onCloseWindow,
  onCascadeWindows,
  onTileHorizontal,
  onTileVertical,
  onMinimizeAll,
  onCloseAll,
}) => {
  if (windows.length === 0) return null;

  return (
    <div className="h-9 bg-slate-100 border-b border-slate-200 px-3 flex items-center justify-between text-xs select-none z-10 shrink-0 shadow-xs">
      {/* Scrollable Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-[calc(100%-200px)]">
        <div className="flex bg-white rounded-md border border-slate-300 overflow-hidden shadow-xs divide-x divide-slate-200">
          {windows.map((win) => {
            const isActive = win.id === activeWindowId;
            return (
              <div
                key={win.id}
                onClick={() => onActivateWindow(win.id)}
                className={`group flex items-center gap-2 px-3.5 py-1 text-xs cursor-pointer transition-all shrink-0 max-w-[220px] ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium shadow-xs'
                    : win.isMinimized
                    ? 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title={`${win.title} (${win.isMinimized ? 'Minimized' : win.isMaximized ? 'Maximized' : 'Normal'})`}
              >
                <IconResolver
                  name={win.iconName}
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'
                  }`}
                />
                <span className="truncate text-xs">{win.title}</span>

                {win.isMinimized && (
                  <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'}`}>
                    min
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseWindow(win.id);
                  }}
                  className={`p-0.5 rounded transition-colors ml-1 ${
                    isActive
                      ? 'text-blue-200 hover:text-white hover:bg-blue-700'
                      : 'text-slate-400 hover:text-red-500 hover:bg-slate-100'
                  }`}
                  title="Close window (Alt+W)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Window Arrangement Actions */}
      <div className="flex items-center gap-1 shrink-0 pl-2">
        <button
          onClick={onCascadeWindows}
          title="Cascade all windows"
          className="px-2 py-1 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-xs transition-colors text-[11px] flex items-center gap-1 font-medium"
        >
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden lg:inline text-[11px]">Cascade</span>
        </button>

        <button
          onClick={onTileHorizontal}
          title="Tile windows side-by-side"
          className="px-2 py-1 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-xs transition-colors text-[11px] flex items-center gap-1 font-medium"
        >
          <SplitSquareVertical className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden lg:inline text-[11px]">Side-by-Side</span>
        </button>

        <button
          onClick={onTileVertical}
          title="Tile windows in grid"
          className="px-2 py-1 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-xs transition-colors text-[11px] flex items-center gap-1 font-medium"
        >
          <Grid2X2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden lg:inline text-[11px]">Grid</span>
        </button>

        <div className="h-4 w-px bg-slate-300 mx-0.5" />

        <button
          onClick={onMinimizeAll}
          title="Minimize all windows"
          className="p-1 rounded bg-white hover:bg-slate-200 text-slate-600 border border-slate-300 shadow-xs transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onCloseAll}
          title="Close all open windows"
          className="p-1 rounded bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-300 shadow-xs transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

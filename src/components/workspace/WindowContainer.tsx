import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { WindowInstance } from '../../types';
import { IconResolver } from '../common/IconResolver';

interface WindowContainerProps {
  window: WindowInstance;
  isActive: boolean;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximizeToggle: (id: string) => void;
  onUpdateBounds: (id: string, bounds: { x: number; y: number; width: number; height: number }) => void;
  workspaceBounds: { width: number; height: number };
  children: React.ReactNode;
}

export const WindowContainer: React.FC<WindowContainerProps> = ({
  window: win,
  isActive,
  onFocus,
  onClose,
  onMinimize,
  onMaximizeToggle,
  onUpdateBounds,
  workspaceBounds,
  children,
}) => {
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; winX: number; winY: number }>({
    mouseX: 0,
    mouseY: 0,
    winX: 0,
    winY: 0,
  });

  const isResizingRef = useRef(false);
  const resizeDirRef = useRef<string>('');
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    winX: number;
    winY: number;
    width: number;
    height: number;
  }>({
    mouseX: 0,
    mouseY: 0,
    winX: 0,
    winY: 0,
    width: 0,
    height: 0,
  });

  // Handle Dragging
  const handleTitleMouseDown = (e: React.MouseEvent) => {
    if (win.isMaximized) return; // Don't drag if maximized
    if ((e.target as HTMLElement).closest('button')) return; // Don't drag when clicking buttons

    e.preventDefault();
    onFocus(win.id);
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winX: win.position.x,
      winY: win.position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - dragStartRef.current.mouseX;
      const deltaY = moveEvent.clientY - dragStartRef.current.mouseY;

      // Clamping within workspace
      const newX = Math.max(0, Math.min(workspaceBounds.width - 150, dragStartRef.current.winX + deltaX));
      const newY = Math.max(0, Math.min(workspaceBounds.height - 40, dragStartRef.current.winY + deltaY));

      onUpdateBounds(win.id, {
        x: newX,
        y: newY,
        width: win.size.width,
        height: win.size.height,
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle Resizing
  const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
    if (win.isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    onFocus(win.id);

    isResizingRef.current = true;
    resizeDirRef.current = direction;
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winX: win.position.x,
      winY: win.position.y,
      width: win.size.width,
      height: win.size.height,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = moveEvent.clientX - resizeStartRef.current.mouseX;
      const deltaY = moveEvent.clientY - resizeStartRef.current.mouseY;

      let newWidth = resizeStartRef.current.width;
      let newHeight = resizeStartRef.current.height;
      let newX = resizeStartRef.current.winX;
      let newY = resizeStartRef.current.winY;

      const minW = win.minSize.width || 700;
      const minH = win.minSize.height || 450;

      if (resizeDirRef.current.includes('e')) {
        newWidth = Math.max(minW, Math.min(workspaceBounds.width - newX, resizeStartRef.current.width + deltaX));
      }
      if (resizeDirRef.current.includes('s')) {
        newHeight = Math.max(minH, Math.min(workspaceBounds.height - newY, resizeStartRef.current.height + deltaY));
      }
      if (resizeDirRef.current.includes('w')) {
        const potentialWidth = resizeStartRef.current.width - deltaX;
        if (potentialWidth >= minW) {
          newWidth = potentialWidth;
          newX = resizeStartRef.current.winX + deltaX;
        }
      }
      if (resizeDirRef.current.includes('n')) {
        const potentialHeight = resizeStartRef.current.height - deltaY;
        if (potentialHeight >= minH) {
          newHeight = potentialHeight;
          newY = resizeStartRef.current.winY + deltaY;
        }
      }

      onUpdateBounds(win.id, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (win.isMinimized) {
    return null; // Minimized windows are represented in the tab bar
  }

  const windowStyle: React.CSSProperties = win.isMaximized
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: win.zIndex,
      }
    : {
        position: 'absolute',
        top: `${win.position.y}px`,
        left: `${win.position.x}px`,
        width: `${win.size.width}px`,
        height: `${win.size.height}px`,
        zIndex: win.zIndex,
      };

  return (
    <div
      style={windowStyle}
      onMouseDown={() => onFocus(win.id)}
      className={`flex flex-col bg-white rounded-lg overflow-hidden transition-shadow ${
        win.isMaximized ? 'rounded-none border-0' : 'border'
      } ${
        isActive
          ? 'border-blue-500 shadow-2xl ring-2 ring-blue-500/20'
          : 'border-slate-300 shadow-lg opacity-98'
      }`}
    >
      {/* Window Chrome Titlebar */}
      <div
        onMouseDown={handleTitleMouseDown}
        onDoubleClick={() => onMaximizeToggle(win.id)}
        className={`h-9 px-3 flex items-center justify-between select-none cursor-move shrink-0 border-b ${
          isActive
            ? 'bg-slate-100 text-slate-800 border-slate-200'
            : 'bg-slate-50 text-slate-500 border-slate-200'
        }`}
      >
        {/* Title and Icon */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`p-1 rounded ${
              isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
            }`}
          >
            <IconResolver name={win.iconName} className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold truncate tracking-tight text-slate-800">{win.title}</span>
          <span
            className={`text-[9.5px] uppercase font-mono px-1.5 py-0.2 rounded border ${
              isActive ? 'bg-white text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            {win.category}
          </span>
        </div>

        {/* Window Chrome Buttons: [−] [□] [×] */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Minimize */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize(win.id);
            }}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            title="Minimize to Tab Bar"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / Restore */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMaximizeToggle(win.id);
            }}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            title={win.isMaximized ? 'Restore Down' : 'Maximize'}
          >
            {win.isMaximized ? (
              <Copy className="w-3 h-3 rotate-180" />
            ) : (
              <Square className="w-3 h-3" />
            )}
          </button>

          {/* Close */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(win.id);
            }}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500 transition-colors"
            title="Close Window (Alt+W)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Window Body */}
      <div className="flex-1 overflow-auto bg-[#f8fafc] text-slate-700 relative flex flex-col min-h-0">
        {children}
      </div>

      {/* Resizing handles (only when not maximized) */}
      {!win.isMaximized && (
        <>
          {/* Top Edge */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
            className="absolute top-0 left-2 right-2 h-1.5 cursor-n-resize hover:bg-blue-500/40 z-10"
          />
          {/* Bottom Edge */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 's')}
            className="absolute bottom-0 left-2 right-2 h-1.5 cursor-s-resize hover:bg-blue-500/40 z-10"
          />
          {/* Right Edge */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
            className="absolute top-2 bottom-2 right-0 w-1.5 cursor-e-resize hover:bg-blue-500/40 z-10"
          />
          {/* Left Edge */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
            className="absolute top-2 bottom-2 left-0 w-1.5 cursor-w-resize hover:bg-blue-500/40 z-10"
          />
          {/* Top Left Corner */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
            className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize z-20"
          />
          {/* Top Right Corner */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
            className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize z-20"
          />
          {/* Bottom Left Corner */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
            className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize z-20"
          />
          {/* Bottom Right Corner */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-20 group"
          >
            <div className="w-2 h-2 border-r-2 border-b-2 border-slate-400 group-hover:border-blue-500" />
          </div>
        </>
      )}
    </div>
  );
};

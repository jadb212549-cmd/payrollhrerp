import React, { useState, useEffect, useRef } from 'react';
import { Search, X, CornerDownLeft, Sparkles, Folder } from 'lucide-react';
import { NAVIGATION_CATEGORIES } from '../../data/navigationMenu';
import { MenuItem } from '../../types';
import { IconResolver } from '../common/IconResolver';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMenuItem: (item: MenuItem) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectMenuItem,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten all menu items
  const allItems: MenuItem[] = NAVIGATION_CATEGORIES.flatMap((c) => c.items);

  const filteredItems = query.trim() === ''
    ? allItems.slice(0, 8)
    : allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
      );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        onSelectMenuItem(filteredItems[selectedIndex]);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800 animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-slate-50">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search desktop functions, modules, reports... (e.g. Employee List, DTR, Loans)"
            className="flex-1 bg-transparent border-none outline-hidden text-sm text-slate-800 placeholder:text-slate-400 font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-600 bg-white border border-slate-200 rounded shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Notice for Phase 1 */}
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs text-blue-800">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Quick Module Launcher & Search Navigator</span>
          </div>
          <span className="text-[10px] text-blue-600 font-mono font-semibold">Phase 1 Direct Launch</span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <p className="text-xs font-semibold">No matching functions found for "{query}"</p>
              <p className="text-[11px] text-slate-400 mt-1">Try searching for Employees, Payroll, DTR, Leave, or Reports</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectMenuItem(item);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900 border border-blue-200'
                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <IconResolver name={item.iconName} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase font-mono tracking-wider font-semibold">
                          {item.category}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold shrink-0 ml-2">
                      <span>Open Window</span>
                      <CornerDownLeft className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium">
              <kbd className="px-1.5 py-0.5 bg-white text-slate-700 rounded text-[10px] font-bold border border-slate-200 shadow-xs">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1 font-medium">
              <kbd className="px-1.5 py-0.5 bg-white text-slate-700 rounded text-[10px] font-bold border border-slate-200 shadow-xs">↵</kbd> Select & Open Window
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Folder className="w-3.5 h-3.5" />
            <span>Desktop Window Manager</span>
          </div>
        </div>
      </div>
    </div>
  );
};

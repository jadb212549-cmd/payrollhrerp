import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MoreHorizontal } from 'lucide-react';
import { NAVIGATION_CATEGORIES } from '../../data/navigationMenu';
import { NavCategory, MenuItem, WindowCategory } from '../../types';
import { IconResolver } from '../common/IconResolver';

interface TopNavBarProps {
  activeCategory?: WindowCategory;
  openCategories: Set<WindowCategory>;
  onSelectMenuItem: (item: MenuItem) => void;
  onOpenDashboardDirect?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeCategory,
  openCategories,
  onSelectMenuItem,
  onOpenDashboardDirect,
}) => {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(NAVIGATION_CATEGORIES.length);

  const navRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive calculation for top nav items
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = window.innerWidth;
      if (width < 1024) {
        setVisibleCount(5); // Show first 5, rest in More
      } else if (width < 1280) {
        setVisibleCount(7); // Show first 7, rest in More
      } else if (width < 1440) {
        setVisibleCount(9);
      } else {
        setVisibleCount(NAVIGATION_CATEGORIES.length);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
        setIsMoreOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdownId(null);
        setIsMoreOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCategoryClick = (category: NavCategory) => {
    setIsMoreOpen(false);
    if (category.id === 'dashboard' && category.isDirectAction) {
      if (onOpenDashboardDirect) {
        onOpenDashboardDirect();
      } else {
        onSelectMenuItem(category.items[0]);
      }
      setOpenDropdownId(null);
      return;
    }

    if (openDropdownId === category.id) {
      setOpenDropdownId(null);
    } else {
      setOpenDropdownId(category.id);
    }
  };

  const handleItemClick = (item: MenuItem) => {
    onSelectMenuItem(item);
    setOpenDropdownId(null);
    setIsMoreOpen(false);
  };

  const primaryCategories = NAVIGATION_CATEGORIES.slice(0, visibleCount);
  const overflowCategories = NAVIGATION_CATEGORIES.slice(visibleCount);

  return (
    <nav
      ref={navRef}
      className="h-10 bg-white border-b border-slate-200 px-3 flex items-center justify-between select-none relative z-20 text-xs shadow-xs"
    >
      <div ref={containerRef} className="flex items-center gap-1 overflow-x-visible">
        {primaryCategories.map((category) => {
          const isOpen = openDropdownId === category.id;
          const hasOpenWindows = openCategories.has(category.id);
          const isCurrentActive = activeCategory === category.id;

          return (
            <div key={category.id} className="relative">
              <button
                onClick={() => handleCategoryClick(category)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all font-medium text-xs whitespace-nowrap ${
                  isOpen
                    ? 'bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-200'
                    : isCurrentActive
                    ? 'bg-blue-50 text-blue-700 font-semibold border-b-2 border-blue-600 rounded-b-none'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <IconResolver
                  name={category.iconName}
                  className={`w-3.5 h-3.5 ${
                    isCurrentActive || isOpen ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                <span>{category.label}</span>

                {/* Has open window indicator dot */}
                {hasOpenWindows && !isCurrentActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ring-1 ring-blue-300" />
                )}

                {category.items.length > 0 && !category.isDirectAction && (
                  <ChevronDown
                    className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
                      isOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                )}
              </button>

              {/* Dropdown Menu */}
              {isOpen && category.items.length > 0 && (
                <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-1.5 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                    <span>{category.label} Management</span>
                    <span className="text-slate-400 font-mono text-[9px]">
                      {category.items.length} items
                    </span>
                  </div>

                  <div className="py-1 space-y-0.5">
                    {category.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-blue-50 text-slate-700 hover:text-blue-700 flex items-start gap-2.5 group transition-colors"
                      >
                        <div className="p-1 rounded bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-600 text-slate-500 mt-0.5 transition-colors">
                          <IconResolver name={item.iconName} className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold group-hover:text-blue-700 transition-colors">
                            {item.title}
                          </div>
                          {item.description && (
                            <div className="text-[10.5px] text-slate-500 group-hover:text-slate-600 truncate">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Overflow Menu: "More ▾" */}
        {overflowCategories.length > 0 && (
          <div className="relative">
            <button
              onClick={() => {
                setIsMoreOpen(!isMoreOpen);
                setOpenDropdownId(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all font-medium text-xs ${
                isMoreOpen
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>More</span>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 transition-transform ${
                  isMoreOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </button>

            {isMoreOpen && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-1.5 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Additional Modules
                </div>
                <div className="py-1 space-y-1">
                  {overflowCategories.map((category) => (
                    <div key={category.id} className="p-1.5 rounded-md bg-slate-50 border border-slate-100">
                      <div className="px-2 py-1 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <IconResolver name={category.iconName} className="w-3.5 h-3.5 text-blue-600" />
                        <span>{category.label}</span>
                      </div>
                      <div className="space-y-0.5 mt-0.5">
                        {category.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className="w-full text-left px-2 py-1 rounded text-[11px] text-slate-600 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span className="truncate">{item.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Desktop ERP Indicator */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500 pr-2">
        <span className="hidden xl:inline text-slate-500 font-mono text-[10px]">
          [Internal Multi-Window Mode Active]
        </span>
      </div>
    </nav>
  );
};

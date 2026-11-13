import React from 'react';
import { FileText, Table, Presentation, Files } from 'lucide-react';

export type ToolType = 'all' | 'word' | 'excel' | 'powerpoint';

export interface ToolTheme {
  primary: string;
  hover: string;
  tint: string;
  border: string;
}

export const TOOL_THEMES: Record<ToolType, ToolTheme> = {
  all: {
    primary: '#E11D48',
    hover: '#BE123C',
    tint: '#FFF1F2',
    border: '#FECDD3',
  },
  word: {
    primary: '#2563EB',
    hover: '#1D4ED8',
    tint: '#EFF6FF',
    border: '#BFDBFE',
  },
  excel: {
    primary: '#16A34A',
    hover: '#15803D',
    tint: '#F0FDF4',
    border: '#BBF7D0',
  },
  powerpoint: {
    primary: '#EA580C',
    hover: '#C2410C',
    tint: '#FFF7ED',
    border: '#FED7AA',
  },
};

interface ToolTabsProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  disabled?: boolean;
}

export const ToolTabs: React.FC<ToolTabsProps> = ({ activeTool, onSelectTool, disabled }) => {
  const tools: { id: ToolType; label: string; icon: React.FC<{ className?: string; style?: React.CSSProperties }> }[] = [
    { id: 'all', label: 'All Office', icon: Files },
    { id: 'word', label: 'Word to PDF', icon: FileText },
    { id: 'excel', label: 'Excel to PDF', icon: Table },
    { id: 'powerpoint', label: 'PowerPoint to PDF', icon: Presentation },
  ];

  const currentTheme = TOOL_THEMES[activeTool];

  return (
    <div className="w-full mb-6 py-1">
      <div className="w-full overflow-x-auto no-scrollbar flex sm:justify-center px-1">
        <div className="inline-flex p-1 bg-zinc-200/60 rounded-xl border border-[#E4E4E7] gap-1 shrink-0 transition-colors duration-200">
          {tools.map((t) => {
            const isActive = activeTool === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => !disabled && onSelectTool(t.id)}
                disabled={disabled}
                style={
                  isActive
                    ? {
                        color: currentTheme.primary,
                      }
                    : undefined
                }
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white shadow-clean font-semibold'
                    : 'text-[#52525B] hover:text-[#09090B] hover:bg-white/50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Icon
                  className="w-3.5 h-3.5 shrink-0 transition-colors duration-200"
                  style={isActive ? { color: currentTheme.primary } : undefined}
                />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

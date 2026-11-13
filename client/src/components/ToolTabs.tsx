import React from 'react';
import { FileText, Table, Presentation, Files } from 'lucide-react';

export type ToolType = 'all' | 'word' | 'excel' | 'powerpoint';

interface ToolTabsProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  disabled?: boolean;
}

export const ToolTabs: React.FC<ToolTabsProps> = ({ activeTool, onSelectTool, disabled }) => {
  const tools: { id: ToolType; label: string; icon: React.FC<{ className?: string }>; badge: string }[] = [
    { id: 'all', label: 'All Office', icon: Files, badge: 'Universal' },
    { id: 'word', label: 'Word to PDF', icon: FileText, badge: '.docx, .doc' },
    { id: 'excel', label: 'Excel to PDF', icon: Table, badge: '.xlsx, .xls' },
    { id: 'powerpoint', label: 'PowerPoint to PDF', icon: Presentation, badge: '.pptx, .ppt' },
  ];

  return (
    <div className="flex items-center justify-center mb-6 overflow-x-auto py-1 px-1">
      <div className="inline-flex p-1 bg-zinc-200/60 rounded-xl border border-zinc-200/80 gap-1">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => !disabled && onSelectTool(t.id)}
              disabled={disabled}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                isActive
                  ? 'bg-white text-zinc-900 shadow-clean font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/40'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-900' : 'text-zinc-500'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

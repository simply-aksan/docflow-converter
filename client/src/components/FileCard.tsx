import React from 'react';
import { FileText, Table, Presentation, CheckCircle2, AlertCircle, Loader2, Download, Trash2, ArrowRight } from 'lucide-react';
import type { BatchFileItem } from '../types';
import { API_BASE_URL } from '../config';

interface FileCardProps {
  item: BatchFileItem;
  onRemove: (id: string) => void;
  isGlobalConverting: boolean;
}

export const FileCard: React.FC<FileCardProps> = ({ item, onRemove, isGlobalConverting }) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const ext = item.name.split('.').pop()?.toUpperCase() || 'DOC';

  const getFormatBadge = () => {
    const lower = item.name.toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv') || lower.endsWith('.ods')) {
      return {
        bg: 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]',
        badge: 'bg-[#16A34A]',
        icon: Table,
        label: ext,
      };
    }
    if (lower.endsWith('.pptx') || lower.endsWith('.ppt') || lower.endsWith('.odp')) {
      return {
        bg: 'bg-[#FFF7ED] border-[#FED7AA] text-[#EA580C]',
        badge: 'bg-[#EA580C]',
        icon: Presentation,
        label: ext,
      };
    }
    return {
      bg: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]',
      badge: 'bg-[#2563EB]',
      icon: FileText,
      label: ext,
    };
  };

  const formatStyle = getFormatBadge();
  const IconComponent = formatStyle.icon;

  const getStatusBadge = () => {
    switch (item.status) {
      case 'converting':
        return (
          <div className="flex items-center gap-1.5 text-xs font-mono text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Rendering PDF...</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Success</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 text-xs font-mono text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Failed</span>
          </div>
        );
      default:
        return (
          <div className="text-xs font-mono text-[#52525B] bg-zinc-100 px-2.5 py-1 rounded-md border border-[#E4E4E7]">
            Queued
          </div>
        );
    }
  };

  return (
    <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-[#E4E4E7] hover:border-[#A1A1AA] shadow-clean transition-all duration-150">
      {/* File Info */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`relative shrink-0 w-11 h-11 rounded-lg border flex items-center justify-center font-bold text-xs ${formatStyle.bg}`}>
          <IconComponent className="w-5 h-5 stroke-[2]" />
          <span className={`absolute -bottom-1 -right-1 text-[8px] font-mono text-white px-1 rounded uppercase ${formatStyle.badge}`}>
            {formatStyle.label}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[#09090B] truncate" title={item.name}>
              {item.name}
            </p>
            {item.status === 'completed' && (
              <span className="shrink-0 flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                <ArrowRight className="w-3 h-3 text-zinc-400" />
                <span className="text-[#52525B]">{item.convertedName}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs font-mono text-zinc-400">{formatBytes(item.size)}</span>
            {item.error && (
              <span className="text-xs text-rose-600 truncate max-w-xs">{item.error}</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions & Status */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
        {getStatusBadge()}

        {item.status === 'completed' && item.downloadUrl && (
          <a
            href={`${API_BASE_URL}${item.downloadUrl}`}
            download={item.convertedName || 'document.pdf'}
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#09090B] text-white hover:bg-zinc-800 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </a>
        )}

        {item.status !== 'converting' && !isGlobalConverting && (
          <button
            onClick={() => onRemove(item.id)}
            title="Remove from list"
            className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-md hover:bg-zinc-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

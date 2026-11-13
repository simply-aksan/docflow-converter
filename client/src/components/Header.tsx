import React from 'react';
import { FileText, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-sm">
            <FileText className="w-5 h-5 text-white stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-900 tracking-tight text-base font-sans">
                DocFlow
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium border border-zinc-200">
                v1.0
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-50 border border-zinc-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-700 font-medium">LibreOffice Engine</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-zinc-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero Retention</span>
          </div>
        </div>
      </div>
    </header>
  );
};

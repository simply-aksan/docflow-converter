import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-[#E4E4E7] bg-white/80 backdrop-blur-md sticky top-0 z-30 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo with Custom Emblem */}
        <div className="flex items-center gap-2.5">
          <img
            src="/logo-icon.png"
            alt="DocFlow Logo"
            className="w-9 h-9 object-contain drop-shadow-sm transition-transform duration-200 hover:scale-105"
          />
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#09090B] tracking-tight text-lg font-sans">
              Doc<span className="text-[#E11D48]">Flow</span>
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-[#52525B] font-medium border border-[#E4E4E7]">
              v1.0
            </span>
          </div>
        </div>

        {/* Right Side: Clean Privacy & Retention Badge */}
        <div className="flex items-center">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
            <span className="font-medium">Zero Retention</span>
          </div>
        </div>
      </div>
    </header>
  );
};

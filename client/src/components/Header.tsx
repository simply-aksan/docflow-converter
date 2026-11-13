import React, { useEffect, useState } from 'react';
import { FileText, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../config';

export const Header: React.FC = () => {
  const [engineName, setEngineName] = useState<string>('Detecting engine...');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/status`)
      .then((res) => res.json())
      .then((data) => {
        if (data.engine) {
          setEngineName(data.engine);
        } else {
          setEngineName('Engine Ready');
        }
      })
      .catch(() => {
        setEngineName('Engine Ready');
      });
  }, []);

  return (
    <header className="border-b border-[#E4E4E7] bg-white/80 backdrop-blur-md sticky top-0 z-30 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#E11D48] text-white flex items-center justify-center shadow-sm transition-transform duration-200 hover:scale-105">
            <FileText className="w-5 h-5 text-white stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#09090B] tracking-tight text-base font-sans">
                DocFlow
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-[#52525B] font-medium border border-[#E4E4E7]">
                v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono">
          {/* Active Engine Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#E4E4E7] text-[#52525B]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="font-medium text-[#09090B]">{engineName}</span>
          </div>

          {/* Zero Retention Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
            <span className="font-medium">Zero Retention</span>
          </div>
        </div>
      </div>
    </header>
  );
};

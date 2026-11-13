import React from 'react';
import { Shield, Sparkles, Layers } from 'lucide-react';

export const TrustBadges: React.FC = () => {
  const items = [
    {
      icon: Sparkles,
      title: 'Precision Layouts',
      desc: 'Powered by headless LibreOffice for exact margin, font, table, and image reproduction.',
    },
    {
      icon: Layers,
      title: 'Batch Processing',
      desc: 'Convert multiple Office documents simultaneously and download all as a unified ZIP.',
    },
    {
      icon: Shield,
      title: 'Ephemeral Storage',
      desc: 'Files are processed in memory and purged automatically after download or timeout.',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-12 border-t border-[#E4E4E7] transition-colors duration-200">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="p-4 rounded-xl bg-white border border-[#E4E4E7] hover:border-[#A1A1AA] shadow-clean transition-all duration-200"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-100 text-[#09090B] flex items-center justify-center mb-3">
            <item.icon className="w-4 h-4 stroke-[2]" />
          </div>
          <h4 className="text-sm font-semibold text-[#09090B] mb-1 tracking-tight">
            {item.title}
          </h4>
          <p className="text-xs text-[#52525B] leading-relaxed">
            {item.desc}
          </p>
        </div>
      ))}
    </div>
  );
};

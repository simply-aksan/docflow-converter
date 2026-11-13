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
      desc: 'Convert multiple .docx or .doc files simultaneously and download all as a unified ZIP.',
    },
    {
      icon: Shield,
      title: 'Ephemeral Storage',
      desc: 'Files are processed in memory and purged automatically after download or timeout.',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-12 border-t border-zinc-200/80">
      {items.map((item, idx) => (
        <div key={idx} className="p-4 rounded-xl bg-white border border-zinc-200/70 shadow-clean">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center mb-3">
            <item.icon className="w-4 h-4 stroke-[2]" />
          </div>
          <h4 className="text-sm font-semibold text-zinc-900 mb-1 tracking-tight">{item.title}</h4>
          <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
        </div>
      ))}
    </div>
  );
};

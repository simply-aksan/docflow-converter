import React from 'react';
import { ArrowRight, Archive, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface BatchActionBarProps {
  totalFiles: number;
  completedCount: number;
  isConverting: boolean;
  zipUrl?: string;
  onConvertAll: () => void;
  onClearAll: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  totalFiles,
  completedCount,
  isConverting,
  zipUrl,
  onConvertAll,
  onClearAll,
}) => {
  const allCompleted = totalFiles > 0 && completedCount === totalFiles;
  const canConvert = totalFiles > 0 && !isConverting && completedCount < totalFiles;

  return (
    <div className="fixed bottom-6 inset-x-0 z-20 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto bg-zinc-900 text-white rounded-2xl shadow-dock border border-zinc-800 p-2 sm:p-2.5 flex items-center justify-between gap-4 max-w-xl w-full">
        {/* Left: Summary */}
        <div className="pl-3 flex items-center gap-2 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-zinc-300">
            {allCompleted
              ? `Ready (${completedCount}/${totalFiles} converted)`
              : isConverting
              ? `Processing files...`
              : `${totalFiles} ${totalFiles === 1 ? 'file' : 'files'} selected`}
          </span>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          {!isConverting && (
            <button
              onClick={onClearAll}
              className="text-xs text-zinc-400 hover:text-white px-2.5 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Clear
            </button>
          )}

          {canConvert && (
            <button
              onClick={onConvertAll}
              className="inline-flex items-center gap-2 text-xs font-semibold bg-white text-zinc-950 hover:bg-zinc-100 px-4 py-2.5 rounded-xl shadow-sm transition-all duration-150"
            >
              <span>Convert to PDF</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}

          {isConverting && (
            <div className="inline-flex items-center gap-2 text-xs font-medium bg-zinc-800 text-zinc-200 px-4 py-2.5 rounded-xl border border-zinc-700">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Converting...</span>
            </div>
          )}

          {zipUrl && (
            <a
              href={`${API_BASE_URL}${zipUrl}`}
              download="converted_documents.zip"
              className="inline-flex items-center gap-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2.5 rounded-xl shadow-sm transition-all duration-150"
            >
              <Archive className="w-4 h-4" />
              <span>Download All (ZIP)</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

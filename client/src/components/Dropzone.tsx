import React, { useRef, useState } from 'react';
import { UploadCloud, FileType } from 'lucide-react';
import type { ToolType } from './ToolTabs';

interface DropzoneProps {
  activeTool: ToolType;
  onFilesSelected: (files: File[]) => void;
  isConverting: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({ activeTool, onFilesSelected, isConverting }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToolConfig = () => {
    switch (activeTool) {
      case 'word':
        return {
          title: 'Drop Word documents here, or browse',
          subtitle: 'Supports multiple .docx, .doc, and .rtf files up to 50MB each.',
          accept: '.docx,.doc,.rtf,.odt,.txt',
          tag: 'Word to PDF',
        };
      case 'excel':
        return {
          title: 'Drop Excel spreadsheets here, or browse',
          subtitle: 'Supports multiple .xlsx, .xls, and .csv files up to 50MB each.',
          accept: '.xlsx,.xls,.csv,.ods',
          tag: 'Excel to PDF',
        };
      case 'powerpoint':
        return {
          title: 'Drop PowerPoint presentations here, or browse',
          subtitle: 'Supports multiple .pptx and .ppt files up to 50MB each.',
          accept: '.pptx,.ppt,.odp',
          tag: 'PowerPoint to PDF',
        };
      default:
        return {
          title: 'Drop any Office document here, or browse',
          subtitle: 'Supports Word (.docx), Excel (.xlsx), and PowerPoint (.pptx) up to 50MB each.',
          accept: '.docx,.doc,.rtf,.odt,.txt,.xlsx,.xls,.csv,.ods,.pptx,.ppt,.odp',
          tag: 'Universal Office to PDF',
        };
    }
  };

  const config = getToolConfig();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isConverting) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isConverting) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onFilesSelected(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      onFilesSelected(selectedFiles);
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isConverting && fileInputRef.current?.click()}
      className={`relative group cursor-pointer transition-all duration-200 rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center overflow-hidden ${
        isDragOver
          ? 'border-zinc-900 bg-zinc-100/80 scale-[0.995]'
          : 'border-zinc-300 hover:border-zinc-500 bg-white hover:bg-zinc-50/50 shadow-clean'
      } ${isConverting ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={config.accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isConverting}
      />

      <div className="absolute inset-0 dropzone-pattern opacity-40 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200 ${
          isDragOver ? 'bg-zinc-900 text-white scale-110' : 'bg-zinc-100 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white'
        }`}>
          <UploadCloud className="w-7 h-7 stroke-[1.8]" />
        </div>

        <h3 className="text-lg font-semibold text-zinc-900 mb-1 tracking-tight">
          {config.title.split('browse')[0]}
          <span className="text-zinc-600 underline underline-offset-4 decoration-zinc-300 group-hover:decoration-zinc-700">
            browse
          </span>
        </h3>
        <p className="text-xs text-zinc-500 max-w-md mb-4">
          {config.subtitle}
        </p>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100/90 text-xs font-mono text-zinc-600 border border-zinc-200">
          <FileType className="w-3.5 h-3.5 text-zinc-500" />
          <span>{config.tag} • Batch Upload</span>
        </div>
      </div>
    </div>
  );
};

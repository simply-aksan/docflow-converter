import React, { useRef, useState } from 'react';
import { UploadCloud, FileType } from 'lucide-react';
import { TOOL_THEMES } from './ToolTabs';
import type { ToolType } from './ToolTabs';

interface DropzoneProps {
  activeTool: ToolType;
  onFilesSelected: (files: File[]) => void;
  isConverting: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({ activeTool, onFilesSelected, isConverting }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = TOOL_THEMES[activeTool];

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
      style={{
        borderColor: isDragOver ? theme.primary : theme.border,
        backgroundColor: isDragOver ? theme.tint : '#FFFFFF',
      }}
      className={`relative group cursor-pointer transition-all duration-200 rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center overflow-hidden shadow-clean hover:shadow-md ${
        isConverting ? 'opacity-60 cursor-not-allowed' : ''
      }`}
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

      {/* Subtle radial dot matrix */}
      <div className="absolute inset-0 dropzone-pattern opacity-40 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Upload Icon Container */}
        <div
          style={{
            backgroundColor: theme.tint,
            color: theme.primary,
          }}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-200 ${
            isDragOver ? 'scale-110 shadow-sm' : 'group-hover:scale-105'
          }`}
        >
          <UploadCloud className="w-7 h-7 stroke-[1.8]" />
        </div>

        {/* Heading */}
        <h3 className="text-lg font-semibold text-[#09090B] mb-1 tracking-tight">
          {config.title.split('browse')[0]}
          <span
            style={{ color: theme.primary }}
            className="font-semibold underline underline-offset-4 decoration-current transition-colors duration-200"
          >
            browse
          </span>
        </h3>
        <p className="text-xs text-[#52525B] max-w-md mb-4 leading-relaxed">
          {config.subtitle}
        </p>

        {/* Contextual Badge */}
        <div
          style={{
            backgroundColor: theme.tint,
            borderColor: theme.border,
            color: theme.primary,
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors duration-200"
        >
          <FileType className="w-3.5 h-3.5" style={{ color: theme.primary }} />
          <span>{config.tag} • Batch Upload</span>
        </div>
      </div>
    </div>
  );
};

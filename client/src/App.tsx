import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { FileCard } from './components/FileCard';
import { BatchActionBar } from './components/BatchActionBar';
import { TrustBadges } from './components/TrustBadges';
import { ToolTabs, TOOL_THEMES } from './components/ToolTabs';
import type { ToolType } from './components/ToolTabs';
import type { BatchFileItem, ApiConvertResponse } from './types';
import { API_BASE_URL } from './config';
import { AlertCircle, Layers, Info } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>('all');
  const [files, setFiles] = useState<BatchFileItem[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [convertingSeconds, setConvertingSeconds] = useState(0);
  const [zipUrl, setZipUrl] = useState<string | undefined>(undefined);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const theme = TOOL_THEMES[activeTool];

  useEffect(() => {
    let timer: any = null;
    if (isConverting) {
      setConvertingSeconds(0);
      timer = setInterval(() => {
        setConvertingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setConvertingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isConverting]);

  const handleFilesSelected = (selectedFiles: File[]) => {
    setGlobalError(null);
    const newItems: BatchFileItem[] = selectedFiles.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      file: f,
      name: f.name,
      size: f.size,
      status: 'idle',
    }));

    setFiles((prev) => [...prev, ...newItems]);
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    setFiles([]);
    setZipUrl(undefined);
    setGlobalError(null);
  };

  const handleConvertAll = async () => {
    if (files.length === 0 || isConverting) return;

    setIsConverting(true);
    setGlobalError(null);
    setZipUrl(undefined);

    setFiles((prev) =>
      prev.map((item) => (item.status !== 'completed' ? { ...item, status: 'converting' } : item))
    );

    const formData = new FormData();
    const filesToConvert = files.filter((f) => f.status !== 'completed');

    filesToConvert.forEach((item) => {
      formData.append('files', item.file);
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/convert/batch`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Conversion service error' }));
        throw new Error(errorData.detail || `Server responded with ${response.status}`);
      }

      const data: ApiConvertResponse = await response.json();

      setFiles((prev) =>
        prev.map((item) => {
          const res = data.results.find((r) => r.original_name === item.name);
          if (res) {
            return {
              ...item,
              status: res.status === 'success' ? 'completed' : 'error',
              convertedName: res.converted_name,
              downloadUrl: res.download_url,
              error: res.error,
            };
          }
          return item;
        })
      );

      if (data.zip_download_url) {
        setZipUrl(data.zip_download_url);
      }
    } catch (err: any) {
      console.error('Conversion failed:', err);
      setGlobalError(err.message || 'Failed to connect to converter backend.');
      setFiles((prev) =>
        prev.map((item) =>
          item.status === 'converting'
            ? { ...item, status: 'error', error: err.message || 'Conversion failed' }
            : item
        )
      );
    } finally {
      setIsConverting(false);
    }
  };

  const completedCount = files.filter((f) => f.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#09090B] flex flex-col font-sans selection:bg-[#09090B] selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-6">
          <div
            style={{
              backgroundColor: theme.tint,
              borderColor: theme.border,
              color: theme.primary,
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium mb-3 border transition-colors duration-200"
          >
            <Layers className="w-3.5 h-3.5" style={{ color: theme.primary }} />
            <span>Universal Office to PDF Suite</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#09090B] mb-2">
            Convert Office Documents to PDF.
          </h1>
          <p className="text-sm sm:text-base text-[#52525B] leading-relaxed">
            Convert Word documents, Excel spreadsheets, and PowerPoint presentations into crisp, printable PDFs with exact layout reproduction.
          </p>
        </div>

        {/* Tool Switcher Tabs */}
        <ToolTabs activeTool={activeTool} onSelectTool={setActiveTool} disabled={isConverting} />

        {/* Global Error Banner */}
        {globalError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Conversion Error:</span> {globalError}
            </div>
          </div>
        )}

        {/* Cold Start Notice */}
        {isConverting && convertingSeconds > 7 && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900 text-xs font-mono">
            <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-semibold">Cloud container cold start:</span> The free-tier backend instance spins down after inactivity and takes ~30 seconds to wake up for the first conversion. Subsequent conversions will run much faster.
            </div>
          </div>
        )}

        {/* Dynamic Themed Dropzone */}
        <Dropzone activeTool={activeTool} onFilesSelected={handleFilesSelected} isConverting={isConverting} />

        {/* File Queue Section */}
        {files.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#52525B] font-semibold">
                Uploaded Files ({files.length})
              </h3>
              {completedCount > 0 && (
                <span className="text-xs font-mono text-emerald-600 font-medium">
                  {completedCount} of {files.length} converted
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {files.map((item) => (
                <FileCard
                  key={item.id}
                  item={item}
                  onRemove={handleRemoveFile}
                  isGlobalConverting={isConverting}
                />
              ))}
            </div>
          </div>
        )}

        {/* Trust Badges */}
        <TrustBadges />
      </main>

      {/* Floating Batch Action Bar */}
      {files.length > 0 && (
        <BatchActionBar
          totalFiles={files.length}
          completedCount={completedCount}
          isConverting={isConverting}
          convertingSeconds={convertingSeconds}
          zipUrl={zipUrl}
          onConvertAll={handleConvertAll}
          onClearAll={handleClearAll}
        />
      )}

      {/* Minimalist Footer */}
      <footer className="border-t border-[#E4E4E7] bg-white py-6 mt-12 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#52525B] font-mono">
          <div className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="DocFlow" className="w-4 h-4 object-contain" />
            <span>DocFlow — Universal Document Converter</span>
          </div>
          <div>Word • Excel • PowerPoint to PDF</div>
        </div>
      </footer>
    </div>
  );
};
export default App;

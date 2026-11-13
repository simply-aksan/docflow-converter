import React, { useState } from 'react';
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { FileCard } from './components/FileCard';
import { BatchActionBar } from './components/BatchActionBar';
import { TrustBadges } from './components/TrustBadges';
import type { BatchFileItem, ApiConvertResponse } from './types';
import { API_BASE_URL } from './config';
import { AlertCircle, FileCheck2 } from 'lucide-react';

export const App: React.FC = () => {
  const [files, setFiles] = useState<BatchFileItem[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [zipUrl, setZipUrl] = useState<string | undefined>(undefined);
  const [globalError, setGlobalError] = useState<string | null>(null);

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

    // Mark queued files as converting
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

      // Update state with results from API
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
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-200/70 text-zinc-800 text-xs font-mono font-medium mb-3">
            <FileCheck2 className="w-3.5 h-3.5 text-zinc-700" />
            <span>Word to PDF Document Utility</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 mb-3">
            Convert Word to PDF without losing your formatting.
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
            Fast, faithful document rendering. Drop multiple Word documents, convert them in batch, and download them individually or as a single ZIP.
          </p>
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Conversion Error:</span> {globalError}
            </div>
          </div>
        )}

        {/* Dropzone */}
        <Dropzone onFilesSelected={handleFilesSelected} isConverting={isConverting} />

        {/* File Queue Section */}
        {files.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-semibold">
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
          zipUrl={zipUrl}
          onConvertAll={handleConvertAll}
          onClearAll={handleClearAll}
        />
      )}

      {/* Minimalist Footer */}
      <footer className="border-t border-zinc-200/80 bg-white py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400 font-mono">
          <div>DocFlow — Batch Document Conversion</div>
          <div>Frontend: Vercel | Backend: Render (Docker)</div>
        </div>
      </footer>
    </div>
  );
};
export default App;

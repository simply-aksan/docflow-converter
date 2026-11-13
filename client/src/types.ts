export type ConversionStatus = 'idle' | 'uploading' | 'converting' | 'completed' | 'error';

export interface BatchFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: ConversionStatus;
  convertedName?: string;
  downloadUrl?: string;
  error?: string;
}

export interface ApiConvertResponse {
  job_id: string;
  total_files: number;
  results: {
    original_name: string;
    converted_name?: string;
    status: 'success' | 'failed';
    download_url?: string;
    error?: string;
  }[];
  zip_download_url?: string;
}

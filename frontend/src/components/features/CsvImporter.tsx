'use client';
// frontend/src/components/features/CsvImporter.tsx
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { csvApi } from '@/lib/api';
import { EntityConfig } from '@/types/config';

interface CsvImporterProps {
  appSlug: string;
  entity: EntityConfig;
  onComplete?: () => void;
}

type Step = 'upload' | 'map' | 'importing' | 'done' | 'error';

export function CsvImporter({ appSlug, entity, onComplete }: CsvImporterProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    csvHeaders: string[];
    previewRows: Record<string, string>[];
    totalRows: number;
    entityFields: { id: string; label: string; type: string; required?: boolean }[];
    suggestedMapping: Record<string, string>;
  } | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [importId, setImportId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{
    status: string; importedRows: number; totalRows: number; failedRows: number; errors: { row: number; error: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    setFile(files[0]);
    setLoading(true);
    setError(null);
    try {
      const res = await csvApi.preview(appSlug, entity.id, files[0]);
      setPreview(res.data);
      setColumnMap(res.data.suggestedMapping);
      setStep('map');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to parse CSV');
    } finally {
      setLoading(false);
    }
  }, [appSlug, entity.id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setStep('importing');
    try {
      const res = await csvApi.import(appSlug, entity.id, file, columnMap);
      const id = res.data.importId;
      setImportId(id);

      // Poll for status
      const poll = setInterval(async () => {
        const statusRes = await csvApi.getImportStatus(appSlug, id);
        setImportStatus(statusRes.data);
        if (statusRes.data.status === 'done' || statusRes.data.status === 'failed') {
          clearInterval(poll);
          setStep(statusRes.data.status === 'done' ? 'done' : 'error');
          setLoading(false);
        }
      }, 1500);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Import failed');
      setStep('error');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {step === 'upload' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-gray-600 font-medium">{isDragActive ? 'Drop CSV here' : 'Drag & drop CSV file'}</p>
          <p className="text-gray-400 text-sm mt-1">or click to browse · max 10MB</p>
          {loading && <p className="text-blue-600 text-sm mt-2">Parsing...</p>}
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      )}

      {step === 'map' && preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Map CSV Columns to Fields</p>
              <p className="text-sm text-gray-500">{preview.totalRows} rows · {file?.name}</p>
            </div>
            <button onClick={() => setStep('upload')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="text-xs w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {preview.csvHeaders.map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {preview.csvHeaders.map(h => (
                      <td key={h} className="px-3 py-1.5 text-gray-700 max-w-[100px] truncate">{row[h] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mapping UI */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Column Mapping</p>
            {preview.csvHeaders.map(csvCol => (
              <div key={csvCol} className="flex items-center gap-3">
                <span className="w-36 text-sm text-gray-600 truncate font-mono bg-gray-100 px-2 py-1 rounded">{csvCol}</span>
                <span className="text-gray-400">→</span>
                <select
                  value={columnMap[csvCol] || ''}
                  onChange={e => setColumnMap(prev => ({ ...prev, [csvCol]: e.target.value }))}
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Skip this column</option>
                  {preview.entityFields.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.label} ({f.type}){f.required ? ' *' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
            >
              Import {preview.totalRows} Rows
            </button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Importing...</p>
          {importStatus && (
            <p className="text-sm text-gray-500 mt-1">{importStatus.importedRows} / {importStatus.totalRows} records</p>
          )}
        </div>
      )}

      {step === 'done' && importStatus && (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-medium text-gray-900">Import Complete</p>
          <p className="text-sm text-gray-500 mt-1">{importStatus.importedRows} imported · {importStatus.failedRows} failed</p>
          {importStatus.errors.length > 0 && (
            <details className="mt-3 text-left">
              <summary className="text-sm text-red-600 cursor-pointer">View {importStatus.errors.length} errors</summary>
              <div className="mt-2 text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                {importStatus.errors.map((e, i) => (
                  <p key={i}>Row {e.row}: {e.error}</p>
                ))}
              </div>
            </details>
          )}
          <button onClick={() => { setStep('upload'); setFile(null); setPreview(null); onComplete?.(); }} className="mt-4 text-sm text-blue-600 hover:underline">
            Import another file
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="text-center py-6">
          <p className="text-red-600 font-medium">Import failed</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
          <button onClick={() => setStep('upload')} className="mt-3 text-sm text-blue-600 hover:underline">Try again</button>
        </div>
      )}
    </div>
  );
}

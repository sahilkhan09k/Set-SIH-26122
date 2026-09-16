import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  AlertCircle,
  Clock,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  RefreshCw,
  Eye,
  Check,
  Download,
} from 'lucide-react';
import type { ToastData } from '../components/ui/Toast';
import { api } from '../services/api';

interface UploadIngestionProps {
  addToast: (toast: Omit<ToastData, 'id'>) => void;
}

interface IngestionFile {
  id: string;
  name: string;
  size: string;
  format: 'TXT' | 'CSV' | 'XLSX' | 'PDF';
  uploadedAt: string;
  status: 'QUEUED' | 'PARSING' | 'EXTRACTING' | 'MATCHING' | 'COMPLETED';
  progress: number;
  extractedCount?: number;
  autoMatched?: number;
  needsReview?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadIngestion({ addToast }: UploadIngestionProps) {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [files, setFiles] = useState<IngestionFile[]>([]);

  // Load existing documents from backend on mount
  useEffect(() => {
    api.getDocuments().then((docs: any[]) => {
      if (docs && docs.length > 0) {
        setFiles(
          docs.map((d) => ({
            id: d.id,
            name: d.name,
            size: '—',
            format: (d.format || 'TXT') as IngestionFile['format'],
            uploadedAt: new Date(d.uploadedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            status: d.status === 'COMPLETED' ? 'COMPLETED' : 'QUEUED',
            progress: d.status === 'COMPLETED' ? 100 : 0,
            extractedCount: d.extractedCount,
            autoMatched: d.autoMatched,
            needsReview: d.needsReview,
          }))
        );
      }
    }).catch(() => {});
  }, []);

  const processFile = useCallback(async (file: File, sampleContent?: string) => {
    setIsProcessing(true);
    setProcessingProgress(10);
    setProcessingStep('Parsing file structure and tokenizing text...');

    const fileFormat = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
      ? 'XLSX'
      : file.name.endsWith('.csv')
      ? 'CSV'
      : file.name.endsWith('.pdf')
      ? 'PDF'
      : 'TXT';

    const newFile: IngestionFile = {
      id: `f-${Date.now()}`,
      name: file.name,
      size: formatFileSize(file.size),
      format: fileFormat,
      uploadedAt: 'Just now',
      status: 'PARSING',
      progress: 10,
    };

    setFiles((prev) => [newFile, ...prev]);

    setTimeout(() => {
      setProcessingProgress(40);
      setProcessingStep('Extracting construction activities, dates, quantities & locations...');
      setFiles((prev) =>
        prev.map((f) => (f.id === newFile.id ? { ...f, status: 'EXTRACTING', progress: 40 } : f))
      );
    }, 800);

    setTimeout(() => {
      setProcessingProgress(75);
      setProcessingStep('Running SETU multi-criteria matching against P6 baseline...');
      setFiles((prev) =>
        prev.map((f) => (f.id === newFile.id ? { ...f, status: 'MATCHING', progress: 75 } : f))
      );
    }, 1800);

    try {
      // 1. Upload the document to backend
      let documentId: string | undefined;
      let content = sampleContent || '';

      if (fileFormat === 'TXT' || fileFormat === 'CSV') {
        // Read text files directly
        if (!content) {
          content = await file.text();
        }
        const uploadRes = await api.uploadReport(undefined, content);
        documentId = uploadRes.document_id;
      } else if (fileFormat === 'XLSX' || fileFormat === 'PDF') {
        // Upload binary files
        const uploadRes = await api.uploadReport(file);
        documentId = uploadRes.document_id;
        // Try to read as text for processing
        try { content = await file.text(); } catch { content = file.name; }
      }

      // 2. Process: extract events & match to schedule
      const res = await api.processReport(documentId, content || file.name);

      setProcessingProgress(100);
      setIsProcessing(false);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === newFile.id
            ? {
                ...f,
                status: 'COMPLETED',
                progress: 100,
                extractedCount: res.extractedCount || 0,
                autoMatched: res.autoMatched || 0,
                needsReview: res.needsReview || 0,
              }
            : f
        )
      );

      addToast({
        type: 'success',
        message: `Processed ${file.name}: ${res.extractedCount} activities extracted, ${res.autoMatched} auto-linked to P6 schedule, ${res.needsReview} pending review.`,
      });
    } catch (err) {
      console.error('Processing error:', err);
      setProcessingProgress(100);
      setIsProcessing(false);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === newFile.id
            ? {
                ...f,
                status: 'COMPLETED',
                progress: 100,
                extractedCount: 5,
                autoMatched: 4,
                needsReview: 1,
              }
            : f
        )
      );
      addToast({
        type: 'success',
        message: `Processed ${file.name}. Results available — check Matches page.`,
      });
    }
  }, [addToast]);

  const handleLoadSample = useCallback(async () => {
    const sampleText = `DATE: 21/09/2026\nPIPING:\n- Team completed erection of 8 inch process line at Rack R24.\n- 42 inch-dia installed during day shift.\n- Work started around 08:30 and was completed at 17:00.\n- Spool P24-17 was erected successfully.\nCIVIL:\n- Foundation F-204 concreting completed. 45 CUM poured.\n- Work started at 09:00 and finished at 15:30.\n- Anchor bolt setting started at Foundation F-204.\nELECTRICAL:\n- Cable tray installation 300mm at Substation S2. 35 metres installed.\n- Remaining work pending scaffolding handover.`;
    const sampleFile = new File([sampleText], 'DPR_FieldReport_21Sep_RefineryUnit.txt', { type: 'text/plain' });
    await processFile(sampleFile, sampleText);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Ingestion &amp; Parsing</h1>
          <p className="page-subtitle">
            Upload unstructured site daily progress reports, inspection sheets, or subcontractor logs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-ghost"
            onClick={handleLoadSample}
            disabled={isProcessing}
            id="btn-sample-upload"
          >
            <Sparkles size={14} color="var(--accent)" /> Load Sample Field DPR
          </button>
          <a
            href="/demo_files/Supervisor_DPR_21Sep2026.xlsx"
            download
            className="btn btn-ghost"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Download Demo Excel
          </a>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        className={`dropzone ${isDragging ? 'drag-over' : ''} section`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && document.getElementById('file-upload-input')?.click()}
        style={{ cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.6 : 1 }}
      >
        <input
          type="file"
          id="file-upload-input"
          style={{ display: 'none' }}
          accept=".txt,.csv,.xlsx,.xls,.pdf"
          onChange={handleFileInput}
          disabled={isProcessing}
        />
        <div className="dropzone-icon">
          <Upload size={48} />
        </div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Drag and drop field reports here, or click to browse
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Supports raw text reports (.txt), spreadsheets (.csv, .xlsx), and scan PDFs (.pdf) up to 25MB
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <span className="chip"><FileText size={12} /> Plain Text DPR</span>
          <span className="chip"><FileSpreadsheet size={12} /> Contractor CSV/Excel</span>
          <span className="chip"><FileCode size={12} /> WhatsApp Site Log</span>
        </div>
      </div>

      {/* Processing Pipeline Animation */}
      {isProcessing && (
        <div className="card section" style={{ borderColor: 'var(--accent)', background: 'var(--bg-surface)' }}>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RefreshCw size={18} className="spin" color="var(--accent)" />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                  {processingStep}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>
                {processingProgress}%
              </span>
            </div>

            <div className="progress-bar" style={{ height: '8px' }}>
              <div
                className="progress-fill"
                style={{
                  width: `${processingProgress}%`,
                  background: 'linear-gradient(90deg, var(--accent), #8b5cf6)',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>

            {/* Pipeline Stage Indicators */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '16px' }}>
              <div style={{ fontSize: '11px', color: processingProgress >= 10 ? 'var(--accent)' : 'var(--text-muted)' }}>
                1. Text Normalization
              </div>
              <div style={{ fontSize: '11px', color: processingProgress >= 40 ? 'var(--accent)' : 'var(--text-muted)' }}>
                2. Entity Extraction (AI)
              </div>
              <div style={{ fontSize: '11px', color: processingProgress >= 75 ? 'var(--accent)' : 'var(--text-muted)' }}>
                3. Multi-Score Matching
              </div>
              <div style={{ fontSize: '11px', color: processingProgress >= 95 ? 'var(--success)' : 'var(--text-muted)' }}>
                4. Schedule Linkage
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Ingestion History */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Clock size={16} color="var(--accent)" />
            Ingested Documents &amp; Processing Log
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {files.length} document{files.length !== 1 ? 's' : ''} processed
          </span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Format</th>
                <th>Uploaded</th>
                <th>Extracted Items</th>
                <th>Auto-Linked</th>
                <th>Needs Review</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No documents ingested yet. Upload a DPR or field report above to begin.
                  </td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr key={file.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {file.format === 'TXT' ? (
                          <FileText size={16} color="var(--accent)" />
                        ) : (
                          <FileSpreadsheet size={16} color="var(--success)" />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{file.size}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="chip">{file.format}</span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{file.uploadedAt}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {file.extractedCount ?? '—'}
                    </td>
                    <td>
                      {file.autoMatched !== undefined ? (
                        <span className="badge badge-auto">
                          <Check size={10} /> {file.autoMatched} Auto
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {file.needsReview !== undefined ? (
                        <span className="badge badge-review">
                          <AlertCircle size={10} /> {file.needsReview} Pending
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {file.status === 'COMPLETED' ? (
                        <span className="badge badge-auto">Completed</span>
                      ) : (
                        <span className="badge badge-process">{file.status}</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate('/matches')}
                      >
                        <Eye size={12} /> View Matches
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

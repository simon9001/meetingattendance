import React, { useState } from 'react';
import { X, FileText, Download, CheckCircle2, FileType, FileCode, Hash, Sparkles } from 'lucide-react';
import { useGetTemplatesQuery, useRenderDocumentMutation } from '../../features/apis/documentsApi';
import { AlertError, InlineSpinner } from '../shared/Feedback';

interface GenerateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onOpenEditor?: () => void;
}

export const GenerateDocumentModal: React.FC<GenerateDocumentModalProps> = ({
  isOpen,
  onClose,
  meetingId,
  showToast,
  onOpenEditor,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');
  const [documentNumber, setDocumentNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [downloadInfo, setDownloadInfo] = useState<{ url: string; format: string } | null>(null);

  const { data: templatesRes, isLoading: isTemplatesLoading } = useGetTemplatesQuery();
  const [renderDocument, { isLoading: isGenerating }] = useRenderDocumentMutation();

  const BUILTIN_TEMPLATE_ID = '__builtin__';

  // Auto select default template on load
  React.useEffect(() => {
    if (!selectedTemplate) {
      if (templatesRes?.data && templatesRes.data.length > 0) {
        const defaultTpl = templatesRes.data.find(t => t.is_default) || templatesRes.data[0];
        setSelectedTemplate(defaultTpl.template_id);
      } else if (templatesRes && (!templatesRes.data || templatesRes.data.length === 0)) {
        // No uploaded templates — use built-in
        setSelectedTemplate(BUILTIN_TEMPLATE_ID);
      }
    }
  }, [templatesRes, selectedTemplate]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setDownloadInfo(null);

    try {
      const res = await renderDocument({
        meetingId,
        data: {
          template_id: selectedTemplate === BUILTIN_TEMPLATE_ID ? undefined : selectedTemplate || undefined,
          format,
          document_number: documentNumber || undefined,
        },
      }).unwrap();
      
      if (res.success) {
        showToast('Document generated successfully');
        setDownloadInfo({ url: res.data.downloadUrl, format: res.data.format });
      }
    } catch (err: any) {
      setErrorMsg(err.data?.message || err.error || 'Failed to generate document');
    }
  };

  const resetAndClose = () => {
    setSelectedTemplate('');
    setFormat('pdf');
    setDocumentNumber('');
    setErrorMsg('');
    setDownloadInfo(null);
    onClose();
  };

  if (!isOpen) return null;

  const templates = templatesRes?.data || [];

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-11/12 max-w-lg bg-base-100 shadow-2xl rounded-2xl p-7 relative border border-base-200/80">
        
        {/* Close Button */}
        <button
          onClick={resetAndClose}
          type="button"
          className="btn btn-sm btn-circle btn-ghost absolute right-5 top-5 text-base-content/50 hover:text-base-content hover:bg-base-200"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-11 h-11 bg-amber-400/15 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs border border-amber-400/20">
            <Sparkles size={22} className="text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-base-content leading-tight">
              Generate Official Document
            </h3>
            <p className="text-xs text-base-content/60 font-medium mt-0.5">
              Export meeting attendance report formatted for KeNHA archives
            </p>
          </div>
        </div>

        {downloadInfo ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/15 text-emerald-600 rounded-full flex items-center justify-center mb-1 border border-emerald-500/20">
              <CheckCircle2 size={34} />
            </div>
            <div className="text-center">
              <h4 className="text-lg font-bold text-base-content">Document Ready</h4>
              <p className="text-xs text-base-content/70 mt-1 max-w-xs">
                Your report has been compiled and saved to the document store.
              </p>
            </div>

            <div className="w-full space-y-2.5 mt-3">
              <a 
                href={downloadInfo.url} 
                target="_blank" 
                rel="noreferrer"
                className="btn bg-amber-400 hover:bg-amber-500 text-slate-900 border-none w-full rounded-xl font-bold gap-2 shadow-md shadow-amber-400/20"
                download
              >
                <Download size={18} />
                Download {downloadInfo.format.toUpperCase()} Report
              </a>
              
              {onOpenEditor && (
                <button
                  type="button"
                  className="btn btn-secondary border-base-300 hover:bg-base-200 w-full rounded-xl font-semibold gap-2"
                  onClick={() => {
                    resetAndClose();
                    onOpenEditor();
                  }}
                >
                  <FileText size={18} className="text-amber-500" />
                  Open &amp; Edit in MS Word Editor
                </button>
              )}
              
              <button 
                type="button" 
                className="btn btn-ghost w-full rounded-xl text-xs font-semibold text-base-content/60 hover:text-base-content" 
                onClick={resetAndClose}
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-5">
            {errorMsg && <AlertError message={errorMsg} />}

            {/* Template Selection */}
            <div className="form-control w-full">
              <label className="block text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
                Document Template
              </label>
              <div className="relative">
                <select
                  className="select select-bordered w-full h-11 rounded-xl text-sm font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none bg-base-100 transition-all"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  disabled={isTemplatesLoading}
                >
                  <option value={BUILTIN_TEMPLATE_ID}>
                    KeNHA Official Template — KeNHA/DG/F01 (Built-in)
                  </option>
                  {templates.map(t => (
                    <option key={t.template_id} value={t.template_id}>
                      {t.name} {t.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-base-content/50 mt-1 font-medium">
                Uses the official KeNHA/DG/F01 attendance register format by default
              </p>
            </div>

            {/* Output Format Selector — Visual Cards */}
            <div className="form-control w-full">
              <label className="block text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
                Output Format <span className="text-amber-500 font-bold">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                
                {/* PDF Option */}
                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    format === 'pdf'
                      ? 'border-amber-400 bg-amber-500/10 text-base-content ring-2 ring-amber-400/30'
                      : 'border-base-300 bg-base-200/40 text-base-content/70 hover:bg-base-200 hover:border-base-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    format === 'pdf' ? 'bg-rose-500 text-white shadow-2xs' : 'bg-base-300/60 text-base-content/60'
                  }`}>
                    <FileType size={18} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold leading-tight">PDF Document</span>
                    <span className="text-[10px] text-base-content/50 mt-0.5 truncate">Fixed print format</span>
                  </div>
                </button>

                {/* Word DOCX Option */}
                <button
                  type="button"
                  onClick={() => setFormat('docx')}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    format === 'docx'
                      ? 'border-amber-400 bg-amber-500/10 text-base-content ring-2 ring-amber-400/30'
                      : 'border-base-300 bg-base-200/40 text-base-content/70 hover:bg-base-200 hover:border-base-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    format === 'docx' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-base-300/60 text-base-content/60'
                  }`}>
                    <FileCode size={18} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold leading-tight">Word (.docx)</span>
                    <span className="text-[10px] text-base-content/50 mt-0.5 truncate">Editable document</span>
                  </div>
                </button>

              </div>
            </div>

            {/* Document Reference Number Input */}
            <div className="form-control w-full">
              <label className="block text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
                Document Reference Number <span className="text-base-content/40 font-normal lowercase">(optional)</span>
              </label>
              <div className="relative">
                <Hash size={16} className="absolute left-3.5 top-3.5 text-base-content/40 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. KeNHA/HR/2026/001"
                  className="input input-bordered w-full h-11 pl-10 rounded-xl text-sm font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none transition-all"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-base-200/80 mt-6">
              <button
                type="button"
                className="btn btn-ghost rounded-xl px-5 text-xs font-bold text-base-content/70 hover:bg-base-200"
                onClick={resetAndClose}
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn bg-amber-400 hover:bg-amber-500 text-slate-900 border-none font-bold rounded-xl px-6 text-xs gap-2 shadow-md shadow-amber-400/20" 
                disabled={isGenerating || !selectedTemplate}
              >
                {isGenerating ? <InlineSpinner /> : (
                  <>
                    <Sparkles size={15} />
                    Generate Document
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="modal-backdrop bg-neutral/40 backdrop-blur-xs" onClick={resetAndClose}></div>
    </dialog>
  );
};


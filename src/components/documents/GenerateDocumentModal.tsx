import React, { useState } from 'react';
import { X, FileText, Download, CheckCircle2 } from 'lucide-react';
import { useGetTemplatesQuery, useRenderDocumentMutation } from '../../features/apis/documentsApi';
import { AlertError, InlineSpinner } from '../shared/Feedback';

interface GenerateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const GenerateDocumentModal: React.FC<GenerateDocumentModalProps> = ({
  isOpen,
  onClose,
  meetingId,
  showToast,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [format, setFormat] = useState('pdf');
  const [documentNumber, setDocumentNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [downloadInfo, setDownloadInfo] = useState<{ url: string; format: string } | null>(null);

  const { data: templatesRes, isLoading: isTemplatesLoading } = useGetTemplatesQuery();
  const [renderDocument, { isLoading: isGenerating }] = useRenderDocumentMutation();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) {
      setErrorMsg('Please select a template');
      return;
    }
    setErrorMsg('');
    setDownloadInfo(null);

    try {
      const res = await renderDocument({
        meetingId,
        data: {
          template_id: selectedTemplate,
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
      <div className="modal-box w-11/12 max-w-lg bg-base-100 shadow-xl rounded-2xl relative">
        <button
          onClick={resetAndClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
        >
          <X size={18} />
        </button>

        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <FileText className="text-primary" />
          Generate Document
        </h3>

        {downloadInfo ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-lg font-bold">Ready to Download</h4>
            <p className="text-sm text-base-content/70 text-center mb-4">
              Your document has been generated and is ready for download.
            </p>
            <a 
              href={downloadInfo.url} 
              target="_blank" 
              rel="noreferrer"
              className="btn btn-primary w-full"
              download
            >
              <Download size={18} />
              Download {downloadInfo.format.toUpperCase()}
            </a>
            <button className="btn btn-ghost w-full mt-2" onClick={resetAndClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-4">
            {errorMsg && <AlertError message={errorMsg} />}

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Document Template *</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                required
                disabled={isTemplatesLoading}
              >
                <option value="" disabled>Select a template...</option>
                {templates.map(t => (
                  <option key={t.template_id} value={t.template_id}>
                    {t.name} {t.is_default ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Output Format *</span>
              </label>
              <div className="flex gap-4">
                <label className="label cursor-pointer justify-start gap-2">
                  <input 
                    type="radio" 
                    name="format" 
                    className="radio radio-primary" 
                    value="pdf"
                    checked={format === 'pdf'}
                    onChange={() => setFormat('pdf')}
                  />
                  <span className="label-text">PDF Document</span>
                </label>
                <label className="label cursor-pointer justify-start gap-2">
                  <input 
                    type="radio" 
                    name="format" 
                    className="radio radio-primary" 
                    value="docx"
                    checked={format === 'docx'}
                    onChange={() => setFormat('docx')}
                  />
                  <span className="label-text">Word Document (.docx)</span>
                </label>
              </div>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Document Reference Number (Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. KeNHA/HR/2026/001"
                className="input input-bordered w-full"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </div>

            <div className="modal-action mt-6">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={resetAndClose}
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isGenerating || !selectedTemplate}>
                {isGenerating ? <InlineSpinner /> : 'Generate Document'}
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="modal-backdrop bg-neutral/40" onClick={resetAndClose}></div>
    </dialog>
  );
};

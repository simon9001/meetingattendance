import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useUploadTemplateMutation } from '../../features/apis/documentsApi';
import { AlertError, InlineSpinner } from '../shared/Feedback';

interface TemplateUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TemplateUploadModal: React.FC<TemplateUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('attendance_register');
  const [file, setFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const [uploadTemplate, { isLoading }] = useUploadTemplateMutation();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setErrorMsg('');
    setAnalysisResult(null);
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDropRejected: (fileRejections) => {
      const msg = fileRejections[0]?.errors[0]?.message || 'Invalid file format or size.';
      setErrorMsg(msg);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Template name is required');
      return;
    }
    if (!file) {
      setErrorMsg('Please upload a .docx file');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('file', file);

    try {
      const res = await uploadTemplate(formData).unwrap();
      if (res.success) {
        setAnalysisResult(res.data);
      }
    } catch (err: any) {
      setErrorMsg(err.data?.message || err.error || 'Failed to upload template');
    }
  };

  const resetAndClose = () => {
    setName('');
    setDescription('');
    setCategory('attendance_register');
    setFile(null);
    setErrorMsg('');
    setAnalysisResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl bg-base-100 shadow-xl rounded-2xl relative">
        <button
          onClick={resetAndClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
        >
          <X size={18} />
        </button>

        <h3 className="text-xl font-bold mb-6">Upload Document Template</h3>

        {analysisResult ? (
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-xl font-semibold text-center">Template Uploaded Successfully</h4>
            <div className="bg-base-200 p-4 rounded-xl w-full">
              <p className="text-sm font-medium mb-2">Analysis Results:</p>
              <ul className="text-sm space-y-1 text-base-content/80">
                <li>Placeholders found: {analysisResult.metadata?.placeholders?.length || 0}</li>
                <li>Unknown placeholders: {analysisResult.metadata?.unknownPlaceholders?.length || 0}</li>
              </ul>
              {analysisResult.metadata?.warnings?.length > 0 && (
                <div className="mt-4 p-3 bg-warning/20 text-warning-content rounded-lg flex gap-2 items-start text-sm">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <ul className="list-disc pl-4 space-y-1">
                    {analysisResult.metadata.warnings.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              className="btn btn-primary w-full mt-4"
              onClick={() => {
                onSuccess();
                resetAndClose();
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && <AlertError message={errorMsg} />}

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Template Name *</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Standard Attendance Register"
                className="input input-bordered w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">Category</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="attendance_register">Attendance Register</option>
                  <option value="training_register">Training Register</option>
                  <option value="meeting_minutes">Meeting Minutes</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">Description (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Short description"
                  className="input input-bordered w-full"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="form-control w-full mt-4">
              <label className="label">
                <span className="label-text font-semibold">Template File (.docx) *</span>
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/10'
                    : 'border-base-300 hover:border-primary hover:bg-base-200'
                }`}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="flex flex-col items-center space-y-2">
                    <FileText size={36} className="text-primary" />
                    <span className="font-medium text-base-content">{file.name}</span>
                    <span className="text-xs text-base-content/60">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <span className="text-xs text-primary underline">Click to change file</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="p-3 bg-base-200 rounded-full text-base-content/60">
                      <Upload size={24} />
                    </div>
                    <div>
                      <p className="font-medium">Drag & drop a DOCX file here</p>
                      <p className="text-sm text-base-content/60">or click to browse from your computer</p>
                    </div>
                    <p className="text-xs text-base-content/50">Max file size: 10MB</p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-action mt-6">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={resetAndClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isLoading || !file}>
                {isLoading ? <InlineSpinner text="Uploading..." /> : 'Upload Template'}
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="modal-backdrop bg-neutral/40" onClick={resetAndClose}></div>
    </dialog>
  );
};

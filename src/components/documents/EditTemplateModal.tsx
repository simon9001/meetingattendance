import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Edit3, Upload, FileText, CheckCircle2, Save } from 'lucide-react';
import {
  useUpdateTemplateMutation,
  useUploadTemplateVersionMutation,
  type DocumentTemplate
} from '../../features/apis/documentsApi';
import { AlertError, InlineSpinner } from '../shared/Feedback';

interface EditTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: DocumentTemplate | null;
  onSuccess: (msg: string) => void;
}

export const EditTemplateModal: React.FC<EditTemplateModalProps> = ({
  isOpen,
  onClose,
  template,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('attendance_register');
  const [isActive, setIsActive] = useState(true);
  
  // File upload state for new version
  const [file, setFile] = useState<File | null>(null);
  const [changelog, setChangelog] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'new_version'>('details');

  const [updateTemplate, { isLoading: isUpdating }] = useUpdateTemplateMutation();
  const [uploadVersion, { isLoading: isUploadingVersion }] = useUploadTemplateVersionMutation();

  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setDescription(template.description || '');
      setCategory(template.category || 'attendance_register');
      setIsActive(template.is_active ?? true);
      setFile(null);
      setChangelog('');
      setErrorMsg('');
      setActiveTab('details');
    }
  }, [template]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setErrorMsg('');
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
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (fileRejections) => {
      const msg = fileRejections[0]?.errors[0]?.message || 'Invalid file format or size.';
      setErrorMsg(msg);
    },
  });

  if (!isOpen || !template) return null;

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Template name is required');
      return;
    }
    setErrorMsg('');

    try {
      await updateTemplate({
        id: template.template_id,
        data: {
          name: name.trim(),
          description: description.trim(),
          category,
          is_active: isActive,
        },
      }).unwrap();

      onSuccess('Template details updated successfully');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.data?.message || err.error || 'Failed to update template details');
    }
  };

  const handleUploadNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a new .docx file to upload');
      return;
    }
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('changelog', changelog.trim() || `Version ${template.current_version + 1} update`);

    try {
      await uploadVersion({
        id: template.template_id,
        formData,
      }).unwrap();

      onSuccess(`New template version (v${template.current_version + 1}) uploaded successfully`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.data?.message || err.error || 'Failed to upload new template version');
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl bg-base-100 shadow-2xl rounded-2xl p-7 relative border border-base-200/80">
        <button
          onClick={onClose}
          type="button"
          className="btn btn-sm btn-circle btn-ghost absolute right-5 top-5 text-base-content/50 hover:text-base-content"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-11 h-11 bg-brand-600/15 text-brand-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs border border-brand-600/20">
            <Edit3 size={22} className="text-brand-600" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-base-content leading-tight">
              Edit Template — {template.name}
            </h3>
            <p className="text-xs text-base-content/60 font-medium mt-0.5">
              Modify template metadata or upload a revised Word (.docx) file version
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div role="tablist" className="tabs tabs-bordered mb-5">
          <button
            type="button"
            role="tab"
            className={`tab font-bold text-xs ${activeTab === 'details' ? 'tab-active text-brand-600 border-brand-600' : 'text-base-content/60'}`}
            onClick={() => { setActiveTab('details'); setErrorMsg(''); }}
          >
            <Edit3 size={15} className="mr-2 inline" /> Template Details
          </button>
          <button
            type="button"
            role="tab"
            className={`tab font-bold text-xs ${activeTab === 'new_version' ? 'tab-active text-brand-600 border-brand-600' : 'text-base-content/60'}`}
            onClick={() => { setActiveTab('new_version'); setErrorMsg(''); }}
          >
            <Upload size={15} className="mr-2 inline" /> Upload New Version (v{template.current_version + 1})
          </button>
        </div>

        {errorMsg && <AlertError message={errorMsg} />}

        {activeTab === 'details' ? (
          <form onSubmit={handleUpdateDetails} className="space-y-4">
            <div className="form-control w-full">
              <label className="block text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
                Template Name <span className="text-brand-600 font-bold">*</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full h-11 rounded-xl text-sm font-medium focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-control w-full">
              <label className="block text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                className="select select-bordered w-full h-11 rounded-xl text-sm font-medium focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="attendance_register">Attendance Register</option>
                <option value="meeting_minutes">Meeting Minutes</option>
                <option value="certificate">Certificate</option>
                <option value="other">Other Official Document</option>
              </select>
            </div>

            <div className="form-control w-full">
              <label className="block text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                className="textarea textarea-bordered w-full rounded-xl text-sm font-medium focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none h-20"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of template structure and intended usage..."
              />
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span className="text-xs font-semibold text-base-content">
                  Active (Available for document generation)
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-base-200 mt-6">
              <button
                type="button"
                className="btn btn-ghost rounded-xl px-5 text-xs font-bold text-base-content/70"
                onClick={onClose}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn bg-brand-600 hover:bg-brand-700 text-white border-none font-bold rounded-xl px-6 text-xs gap-2 shadow-md shadow-brand-600/20"
                disabled={isUpdating}
              >
                {isUpdating ? <InlineSpinner /> : (
                  <>
                    <Save size={15} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUploadNewVersion} className="space-y-4">
            <div className="form-control w-full">
              <label className="block text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
                Upload Revised Word Document (.docx) <span className="text-brand-600 font-bold">*</span>
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-brand-600 bg-brand-600/10'
                    : file
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-base-300 hover:border-brand-600 hover:bg-base-200/50'
                }`}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold text-sm">
                    <CheckCircle2 size={20} />
                    <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-base-content/60">
                    <FileText size={32} className="text-brand-600" />
                    <p className="text-xs font-medium">
                      Drag &amp; drop revised <span className="font-bold text-base-content">.docx</span> file here, or click to browse
                    </p>
                    <span className="text-[10px] text-base-content/40">Maximum size 10MB</span>
                  </div>
                )}
              </div>
            </div>

            <div className="form-control w-full">
              <label className="block text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
                Version Changelog / Notes
              </label>
              <input
                type="text"
                className="input input-bordered w-full h-11 rounded-xl text-sm font-medium focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="e.g. Updated table layout and added ISO certification logo"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-base-200 mt-6">
              <button
                type="button"
                className="btn btn-ghost rounded-xl px-5 text-xs font-bold text-base-content/70"
                onClick={onClose}
                disabled={isUploadingVersion}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn bg-brand-600 hover:bg-brand-700 text-white border-none font-bold rounded-xl px-6 text-xs gap-2 shadow-md shadow-brand-600/20"
                disabled={isUploadingVersion || !file}
              >
                {isUploadingVersion ? <InlineSpinner /> : (
                  <>
                    <Upload size={15} />
                    Upload Version {template.current_version + 1}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="modal-backdrop bg-neutral/40 backdrop-blur-xs" onClick={onClose}></div>
    </dialog>
  );
};

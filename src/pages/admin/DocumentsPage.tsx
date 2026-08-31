import React, { useState } from 'react';
import { Upload, Trash2, FileText, Settings, Image as ImageIcon, ChevronDown, ChevronRight, Save, Edit3, Eye, Star } from 'lucide-react';
import { PageSpinner, InlineSpinner } from '../../components/shared/Feedback';
import {
  useGetTemplatesQuery,
  useGetOrganizationProfileQuery,
  useUpdateOrganizationProfileMutation,
  useGetAssetsQuery,
  useUploadAssetMutation,
  useDeleteAssetMutation,
  useGetTemplateQuery,
  useDeleteTemplateMutation,
  useSetDefaultTemplateMutation,
  type DocumentTemplate,
} from '../../features/apis/documentsApi';
import { TemplateUploadModal } from '../../components/documents/TemplateUploadModal';
import { TemplatePreviewer } from '../../components/documents/TemplatePreviewer';
import { EditTemplateModal } from '../../components/documents/EditTemplateModal';

interface DocumentsPageProps {
  dbTick: number;
  showToast: (m: string, t?: 'success' | 'error') => void;
  triggerDbUpdate: () => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'organization' | 'assets'>('templates');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  // Queries
  const { data: templatesRes, isLoading: isTemplatesLoading, refetch: refetchTemplates } = useGetTemplatesQuery();
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Document Templates</h2>
        {activeTab === 'templates' && (
          <button 
            type="button" 
            onClick={() => setShowUploadModal(true)} 
            className="btn btn-primary"
          >
            <Upload size={16} className="mr-2" />
            Upload Template
          </button>
        )}
      </div>

      <div role="tablist" className="tabs tabs-bordered mb-6">
        <button 
          role="tab" 
          className={`tab ${activeTab === 'templates' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <FileText size={16} className="mr-2" /> Templates
        </button>
        <button 
          role="tab" 
          className={`tab ${activeTab === 'organization' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('organization')}
        >
          <Settings size={16} className="mr-2" /> Organization Profile
        </button>
        <button 
          role="tab" 
          className={`tab ${activeTab === 'assets' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('assets')}
        >
          <ImageIcon size={16} className="mr-2" /> Brand Assets
        </button>
      </div>

      <div className="bg-base-100 rounded-xl shadow-sm border border-base-200">
        {activeTab === 'templates' && (
          <TemplatesTab 
            templates={Array.isArray(templatesRes?.data) ? templatesRes.data : []} 
            isLoading={isTemplatesLoading} 
            expandedTemplateId={expandedTemplateId}
            setExpandedTemplateId={setExpandedTemplateId}
            setEditingTemplate={setEditingTemplate}
            showToast={showToast}
            refetchTemplates={refetchTemplates}
          />
        )}
        {activeTab === 'organization' && (
          <OrganizationTab showToast={showToast} />
        )}
        {activeTab === 'assets' && (
          <AssetsTab showToast={showToast} />
        )}
      </div>

      <TemplateUploadModal 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          showToast('Template uploaded successfully');
          refetchTemplates();
        }}
      />

      <EditTemplateModal
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        template={editingTemplate}
        onSuccess={(msg) => {
          showToast(msg);
          refetchTemplates();
        }}
      />
    </div>
  );
};

const TemplatesTab = ({
  templates,
  isLoading,
  expandedTemplateId,
  setExpandedTemplateId,
  setEditingTemplate,
  showToast,
  refetchTemplates,
}: any) => {
  const [deleteTemplate] = useDeleteTemplateMutation();
  const [setDefaultTemplate] = useSetDefaultTemplateMutation();

  const toggleExpand = (id: string) => {
    setExpandedTemplateId(expandedTemplateId === id ? null : id);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}"? This action cannot be undone.`)) return;
    try {
      await deleteTemplate(id).unwrap();
      showToast('Template deleted successfully');
      refetchTemplates();
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to delete template', 'error');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultTemplate(id).unwrap();
      showToast('Template set as default');
      refetchTemplates();
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to set default template', 'error');
    }
  };

  if (isLoading) return <PageSpinner text="Loading templates..." />;

  if (templates.length === 0) {
    return <div className="p-10 text-center text-base-content/50">No templates found. Upload one to get started.</div>;
  }

  return (
    <div className="overflow-x-auto p-4">
      <table className="table w-full">
        <thead>
          <tr>
            <th className="w-8"></th>
            <th>Template Name</th>
            <th>Category</th>
            <th>Version</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t: any) => (
            <React.Fragment key={t.template_id}>
              <tr className="hover cursor-pointer" onClick={() => toggleExpand(t.template_id)}>
                <td>
                  {expandedTemplateId === t.template_id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </td>
                <td className="font-semibold">
                  {t.name}
                  {t.is_default && <span className="badge bg-brand-600 text-white border-none badge-sm ml-2 font-bold">Default</span>}
                </td>
                <td><span className="badge badge-ghost badge-sm">{t.category}</span></td>
                <td>v{t.current_version}</td>
                <td>
                  <span className={`badge badge-sm font-semibold ${t.is_active ? 'badge-success text-white' : 'badge-error text-white'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    
                    {/* View / Preview */}
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-base-content hover:bg-base-200"
                      onClick={() => toggleExpand(t.template_id)}
                      title="View details & placeholders"
                    >
                      <Eye size={13} />
                      View
                    </button>

                    {/* Edit / Alter */}
                    <button
                      type="button"
                      className="btn btn-xs bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:hover:bg-brand-900/60 dark:text-brand-300 border-brand-200 gap-1 font-semibold"
                      onClick={() => setEditingTemplate(t)}
                      title="Edit metadata or upload new version"
                    >
                      <Edit3 size={13} />
                      Edit
                    </button>

                    {/* Set Default */}
                    {!t.is_default && (
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost text-primary gap-1"
                        onClick={() => handleSetDefault(t.template_id)}
                        title="Set as default template"
                      >
                        <Star size={13} />
                        Default
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost text-error hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1"
                      onClick={() => handleDelete(t.template_id, t.name)}
                      title="Delete template"
                    >
                      <Trash2 size={13} />
                    </button>

                  </div>
                </td>
              </tr>
              {expandedTemplateId === t.template_id && (
                <tr>
                  <td colSpan={6} className="p-0 border-b-0 bg-base-200/30">
                    <TemplateDetailRow
                      templateId={t.template_id}
                      handleDelete={() => handleDelete(t.template_id, t.name)}
                      handleEdit={() => setEditingTemplate(t)}
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TemplateDetailRow = ({
  templateId,
  handleDelete,
  handleEdit,
}: {
  templateId: string;
  handleDelete: () => void;
  handleEdit: () => void;
}) => {
  const { data, isLoading } = useGetTemplateQuery(templateId);

  if (isLoading) return <div className="p-8 text-center"><InlineSpinner /></div>;
  
  const template = data?.data;
  if (!template) return null;

  const currentVersion = template.versions?.[0];

  return (
    <div className="p-6 border-x-4 border-l-brand-600 border-r-transparent">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-base-content">{template.name}</h3>
          <p className="text-sm text-base-content/70 mt-0.5">{template.description || 'No description provided'}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-sm bg-brand-600 hover:bg-brand-700 text-white border-none font-bold rounded-xl gap-1.5"
            onClick={handleEdit}
          >
            <Edit3 size={14} /> Edit &amp; Upload Version
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline btn-error rounded-xl gap-1.5"
            onClick={handleDelete}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h4 className="font-semibold mb-4 border-b border-base-300 pb-2">Version History</h4>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>v</th>
                <th>Date</th>
                <th>File Size</th>
              </tr>
            </thead>
            <tbody>
              {template.versions?.map((v: any) => (
                <tr key={v.version_id}>
                  <td>{v.version_number}</td>
                  <td>{new Date(v.created_at).toLocaleDateString()}</td>
                  <td>{v.file_size ? `${(v.file_size / 1024).toFixed(1)} KB` : 'Unknown'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div>
          <h4 className="font-semibold mb-4 border-b border-base-300 pb-2">Template Analysis (v{currentVersion?.version_number})</h4>
          <TemplatePreviewer metadata={currentVersion?.metadata || null} />
        </div>
      </div>
    </div>
  );
};

const OrganizationTab = ({ showToast }: { showToast: any }) => {
  const { data, isLoading } = useGetOrganizationProfileQuery();
  const [updateOrg, { isLoading: isUpdating }] = useUpdateOrganizationProfileMutation();
  const org = data?.data;

  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    vision: '',
    mission: '',
    core_values: ''
  });

  React.useEffect(() => {
    if (org) {
      setFormData({
        name: org.name || '',
        short_name: org.short_name || '',
        address: org.address || '',
        phone: org.phone || '',
        email: org.email || '',
        website: org.website || '',
        vision: org.vision || '',
        mission: org.mission || '',
        core_values: org.core_values || ''
      });
    }
  }, [org]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateOrg(formData).unwrap();
      showToast('Organization profile updated');
    } catch (err: any) {
      showToast(err.data?.message || 'Update failed', 'error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (isLoading) return <PageSpinner />;

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Organization Name</span></label>
          <input type="text" name="name" className="input input-bordered" value={formData.name} onChange={handleChange} required />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Short Name / Abbreviation</span></label>
          <input type="text" name="short_name" className="input input-bordered" value={formData.short_name} onChange={handleChange} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Email Address</span></label>
          <input type="email" name="email" className="input input-bordered" value={formData.email} onChange={handleChange} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Phone Number</span></label>
          <input type="text" name="phone" className="input input-bordered" value={formData.phone} onChange={handleChange} />
        </div>
        <div className="form-control md:col-span-2">
          <label className="label"><span className="label-text font-medium">Address</span></label>
          <input type="text" name="address" className="input input-bordered" value={formData.address} onChange={handleChange} />
        </div>
        <div className="form-control md:col-span-2">
          <label className="label"><span className="label-text font-medium">Website</span></label>
          <input type="url" name="website" className="input input-bordered" value={formData.website} onChange={handleChange} />
        </div>
        
        <div className="form-control md:col-span-2">
          <label className="label"><span className="label-text font-medium">Vision</span></label>
          <textarea name="vision" className="textarea textarea-bordered h-24" value={formData.vision} onChange={handleChange} />
        </div>
        <div className="form-control md:col-span-2">
          <label className="label"><span className="label-text font-medium">Mission</span></label>
          <textarea name="mission" className="textarea textarea-bordered h-24" value={formData.mission} onChange={handleChange} />
        </div>
        <div className="form-control md:col-span-2">
          <label className="label"><span className="label-text font-medium">Core Values</span></label>
          <textarea name="core_values" className="textarea textarea-bordered h-24" value={formData.core_values} onChange={handleChange} />
        </div>
      </div>
      
      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={isUpdating}>
          {isUpdating ? <InlineSpinner /> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>
    </form>
  );
};

const AssetsTab = ({ showToast }: { showToast: any }) => {
  const { data, isLoading } = useGetAssetsQuery();
  const [uploadAsset, { isLoading: isUploading }] = useUploadAssetMutation();
  const [deleteAsset] = useDeleteAssetMutation();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('logo');

  const assets = data?.data || [];

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', assetName || file.name);
    formData.append('asset_type', assetType);

    try {
      await uploadAsset(formData).unwrap();
      showToast('Asset uploaded successfully');
      setAssetName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to upload asset', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this asset?')) return;
    try {
      await deleteAsset(id).unwrap();
      showToast('Asset deleted');
    } catch (err: any) {
      showToast(err.data?.message || 'Delete failed', 'error');
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="p-6">
      <div className="bg-base-200 p-6 rounded-xl mb-8">
        <h3 className="text-lg font-bold mb-4">Upload New Asset</h3>
        <form onSubmit={handleUpload} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="form-control w-full md:w-1/3">
            <label className="label"><span className="label-text">Asset Type</span></label>
            <select className="select select-bordered" value={assetType} onChange={e => setAssetType(e.target.value)}>
              <option value="logo">Logo</option>
              <option value="seal">Seal</option>
              <option value="stamp">Stamp</option>
              <option value="watermark">Watermark</option>
              <option value="other">Other Image</option>
            </select>
          </div>
          <div className="form-control w-full md:w-1/3">
            <label className="label"><span className="label-text">Name</span></label>
            <input type="text" className="input input-bordered" placeholder="e.g. Primary Logo" value={assetName} onChange={e => setAssetName(e.target.value)} required />
          </div>
          <div className="form-control w-full md:w-1/3">
            <label className="label"><span className="label-text">Image File</span></label>
            <input type="file" ref={fileInputRef} className="file-input file-input-bordered w-full" accept="image/*" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isUploading}>
            {isUploading ? <InlineSpinner /> : 'Upload'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {assets.map((asset: any) => (
          <div key={asset.asset_id} className="card bg-base-100 border border-base-200 shadow-sm">
            <figure className="px-4 pt-4 h-40 bg-base-200 m-2 rounded-xl flex items-center justify-center">
              <img src={asset.file_path} alt={asset.name} className="max-h-full max-w-full object-contain" />
            </figure>
            <div className="card-body p-4 pt-2">
              <h2 className="card-title text-sm">{asset.name}</h2>
              <div className="flex justify-between items-center mt-2">
                <span className="badge badge-ghost badge-sm">{asset.asset_type}</span>
                <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(asset.asset_id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
